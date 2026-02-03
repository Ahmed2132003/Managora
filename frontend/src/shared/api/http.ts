import axios from "axios";
import { notifications } from "@mantine/notifications";
import { env } from "../config/env";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "../auth/tokens";
import { endpoints } from "./endpoints";

// In dev we use Vite proxy (/api -> backend) to avoid CORS.
const API_BASE_URL = import.meta.env.DEV ? "" : env.API_BASE_URL;

/**
 * Main API client
 */
export const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false, // JWT في الهيدر، مش كوكيز
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Separate client for refresh to avoid interceptor loops
 */
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
  },
});

// Keep a single in-flight refresh request (prevents multiple refresh calls)
let refreshPromise: Promise<string | null> | null = null;

function redirectToLogin() {
  // لو عندك route مختلفة للـ login عدلها هنا
  window.location.href = "/login";
}

// ---- helpers (no-any safe) ----
function getAxiosStatus(err: unknown): number | undefined {
  if (axios.isAxiosError(err)) {
    return err.response?.status;
  }
  return undefined;
}

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

    const originalRequest = error.config as (typeof error.config & {
      _retry?: boolean;
      _networkNotified?: boolean;
    });

    const status = error.response?.status;
    const refreshToken = getRefreshToken();

    // Network error (no response)
    if (!error.response && !originalRequest?._networkNotified) {
      originalRequest._networkNotified = true;
      notifications.show({
        title: "Network error",
        message: "تعذر الاتصال بالخادم. حاول مرة أخرى.",
        color: "red",
      });
      return Promise.reject(error);
    }

    // url may be undefined per axios types
    const requestUrl = String(originalRequest?.url ?? "");

    const isRefreshCall =
      requestUrl.includes(endpoints.auth.refresh) || requestUrl.includes("/api/auth/token/refresh/");

    // Try refresh once on any 401 (most cases are expired access tokens)
    if (status === 401 && refreshToken && !originalRequest?._retry && !isRefreshCall) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = (async () => {
            // 1) Try configured refresh endpoint
            try {
              const r1 = await refreshClient.post(endpoints.auth.refresh, { refresh: refreshToken });
              const newAccess1 = (r1.data as { access?: string } | undefined)?.access;
              if (newAccess1) return newAccess1;
            } catch (e1: unknown) {
              // If endpoint not found, fallback to SimpleJWT default
              const s = getAxiosStatus(e1);
              if (s !== 404) throw e1;
            }

            // 2) Fallback: SimpleJWT default path
            const r2 = await refreshClient.post("/api/auth/token/refresh/", { refresh: refreshToken });
            const newAccess2 = (r2.data as { access?: string } | undefined)?.access;
            return newAccess2 ?? null;
          })()
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

        if (newAccess) {
          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return http(originalRequest);
        }

        // Refresh returned no access token
        clearTokens();
        redirectToLogin();
        return Promise.reject(error);
      } catch (refreshError: unknown) {
        clearTokens();
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }

    // If we still get 401, the session is invalid (refresh missing/expired)
    if (status === 401) {
      clearTokens();
      redirectToLogin();
    }

    return Promise.reject(error);
  }
);
