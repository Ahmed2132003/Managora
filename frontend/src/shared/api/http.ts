import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { notifications } from "@mantine/notifications";
import { env } from "../config/env";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "../auth/tokens";
import { endpoints } from "./endpoints";

// In dev we use Vite proxy (/api -> backend) to avoid CORS.
const API_BASE_URL = import.meta.env.DEV ? "" : env.API_BASE_URL;

/**
 * Main API client
 */
export const http: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false, // JWT in header
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Separate client for refresh to avoid interceptor loops
 */
const refreshClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
  },
});

// ---- helpers ----
function redirectToLogin() {
  window.location.href = "/login";
}

function getAxiosStatus(err: unknown): number | undefined {
  if (axios.isAxiosError(err)) return err.response?.status;
  return undefined;
}

/**
 * ---- 401 Refresh Queue (THE FIX) ----
 * When access token expires, multiple requests may fail with 401 at the same time.
 * We do only ONE refresh, and queue all failed requests until refresh resolves.
 */

type RetriableConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _networkNotified?: boolean;
};

type QueueItem = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  config: RetriableConfig;
};

// single in-flight refresh promise
let refreshPromise: Promise<string | null> | null = null;
// if refresh is happening, queue failed requests
let isRefreshing = false;
const requestQueue: QueueItem[] = [];

function processQueue(error: unknown, newAccess: string | null) {
  while (requestQueue.length) {
    const item = requestQueue.shift()!;
    if (error) {
      item.reject(error);
      continue;
    }
    if (newAccess) {
      item.config.headers = item.config.headers ?? {};
      item.config.headers.Authorization = `Bearer ${newAccess}`;
    }
    item.resolve(http(item.config));
  }
}

async function doRefresh(refreshToken: string): Promise<string | null> {
  // Keep your fallback logic exactly as you had it
  // 1) Try configured refresh endpoint
  try {
    const r1 = await refreshClient.post(endpoints.auth.refresh, { refresh: refreshToken });
    const newAccess1 = (r1.data as { access?: string } | undefined)?.access;
    if (newAccess1) return newAccess1;
  } catch (e1: unknown) {
    const s = getAxiosStatus(e1);
    // if not 404, it's a real error
    if (s !== 404) throw e1;
  }

  // 2) Fallback: SimpleJWT default path
  const r2 = await refreshClient.post("/api/auth/token/refresh/", { refresh: refreshToken });
  const newAccess2 = (r2.data as { access?: string } | undefined)?.access;
  return newAccess2 ?? null;
}

// Attach token
http.interceptors.request.use((config) => {
  const accessToken = getAccessToken();
  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const originalRequest = (error.config ?? {}) as RetriableConfig;
    const status = (error as AxiosError).response?.status;
    const refreshToken = getRefreshToken();

    // Network error (no response)
    if (!error.response && !originalRequest._networkNotified) {
      originalRequest._networkNotified = true;
      notifications.show({
        title: "Network error",
        message: "تعذر الاتصال بالخادم. حاول مرة أخرى.",
        color: "red",
      });
      return Promise.reject(error);
    }

    // url may be undefined per axios types
    const requestUrl = String(originalRequest.url ?? "");

    // Don’t try to refresh if this request IS the refresh call itself
    const isRefreshCall =
      requestUrl.includes(endpoints.auth.refresh) || requestUrl.includes("/api/auth/token/refresh/");

    /**
     * ✅ Handle 401 with refresh + QUEUE
     */
    if (status === 401 && refreshToken && !originalRequest._retry && !isRefreshCall) {
      originalRequest._retry = true;

      // If refresh is already happening, queue this request and wait
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          requestQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      // Start refresh
      isRefreshing = true;

      try {
        if (!refreshPromise) {
          refreshPromise = doRefresh(refreshToken)
            .then((newAccess) => {
              if (!newAccess) return null;
              // Keep refresh token as-is
              setTokens({ access: newAccess, refresh: refreshToken });
              return newAccess;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const newAccess = await refreshPromise;

        if (!newAccess) {
          // Refresh returned no access token -> session invalid
          processQueue(new Error("Refresh returned no access token"), null);
          clearTokens();
          redirectToLogin();
          return Promise.reject(error);
        }

        // Apply token and retry original
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;

        // Resolve queued requests too
        processQueue(null, newAccess);

        return http(originalRequest);
      } catch (refreshError: unknown) {
        processQueue(refreshError, null);
        clearTokens();
        redirectToLogin();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // If still 401 (no refresh token / refresh expired / refresh call itself failed)
    if (status === 401) {
      clearTokens();
      redirectToLogin();
    }

    return Promise.reject(error);
  }
);
