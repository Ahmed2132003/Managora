import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { notifications } from "@mantine/notifications";
import { env } from "../config/env";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "../auth/tokens";
import { endpoints } from "./endpoints";

// In dev we use Vite proxy (/api -> backend) to avoid CORS.
// If you set VITE_API_BASE_URL, it will use it directly instead of proxy.
const API_BASE_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || "")
  : env.API_BASE_URL;

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
 * setTokens signature might be either:
 * - setTokens({ access, refresh })
 * - setTokens(access, refresh)
 * We support both to avoid silent failures that cause endless 401s.
 */
function setTokensCompat(access: string, refresh: string) {
  try {
    (setTokens as unknown as (v: { access: string; refresh: string }) => void)({ access, refresh });
  } catch {
    (setTokens as unknown as (a: string, r: string) => void)(access, refresh);
  }
}

/**
 * ---- 401 Refresh Queue ----
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

let refreshPromise: Promise<string | null> | null = null;
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

/**
 * Robust refresh:
 * - tries endpoints.auth.refresh first (your project config)
 * - then tries common fallbacks (in case backend differs)
 */
async function doRefresh(refreshToken: string): Promise<string | null> {
  const candidates = [
    endpoints?.auth?.refresh,          // ✅ should be /api/v1/auth/refresh/
    "/api/v1/auth/refresh/",
    "/api/auth/refresh/",
    "/api/v1/auth/token/refresh/",
    "/api/auth/token/refresh/",
    "/api/v1/token/refresh/",
    "/api/token/refresh/",
  ]
    .filter(Boolean)
    .map(String);

  const seen = new Set<string>();

  for (const url of candidates) {
    if (seen.has(url)) continue;
    seen.add(url);

    try {
      const r = await refreshClient.post(url, { refresh: refreshToken });
      const newAccess = (r.data as { access?: string } | undefined)?.access;
      if (newAccess) return newAccess;
    } catch (e: unknown) {
      const s = getAxiosStatus(e);
      if (s === 404) continue; // try next candidate
      if (s === 401 || s === 403) throw e; // invalid refresh token
      continue;
    }
  }

  return null;
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

    const requestUrl = String(originalRequest.url ?? "");

    // Don’t try to refresh if this request IS the refresh call itself
    const isRefreshCall =
      requestUrl.includes(String(endpoints?.auth?.refresh ?? "")) ||
      requestUrl.includes("/api/auth/refresh") ||
      requestUrl.includes("/api/auth/token/refresh") ||
      requestUrl.includes("/api/v1/auth/refresh") ||
      requestUrl.includes("/api/v1/auth/token/refresh");

    // ✅ Handle 401 with refresh + QUEUE
    if (status === 401 && refreshToken && !originalRequest._retry && !isRefreshCall) {
      originalRequest._retry = true;

      // If refresh is already happening, queue this request and wait
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          requestQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      isRefreshing = true;

      try {
        if (!refreshPromise) {
          refreshPromise = doRefresh(refreshToken)
            .then((newAccess) => {
              if (!newAccess) return null;
              setTokensCompat(newAccess, refreshToken);
              return newAccess;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const newAccess = await refreshPromise;

        if (!newAccess) {
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
