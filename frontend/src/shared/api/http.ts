import axios from "axios";
import { notifications } from "@mantine/notifications";
import { env } from "../config/env";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "../auth/tokens";
import { endpoints } from "./endpoints";

export const http = axios.create({
  baseURL: env.API_BASE_URL,
  withCredentials: false, // JWT في الهيدر، مش كوكيز
  headers: {
    "Content-Type": "application/json",
  },
});

const refreshClient = axios.create({
  baseURL: env.API_BASE_URL,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise: Promise<string | null> | null = null;

http.interceptors.request.use((config) => {
  const accessToken = getAccessToken();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }  
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean });
    const status = error.response?.status;
    const refreshToken = getRefreshToken();

    if (!error.response && !originalRequest?._networkNotified) {
      originalRequest._networkNotified = true;
      notifications.show({
        title: "Network error",
        message: "تعذر الاتصال بالخادم. حاول مرة أخرى.",
        color: "red",
      });
    }

    if (
      status === 401 &&
      refreshToken &&
      !originalRequest?._retry &&
      !originalRequest?.url?.includes(endpoints.auth.refresh)
    ) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refreshClient
            .post(endpoints.auth.refresh, {
              refresh: refreshToken,
            })
            .then((refreshResponse) => {
              const newAccess = refreshResponse.data?.access;
              if (!newAccess) {
                return null;
              }
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
      } catch (refreshError) {
        clearTokens();        
        return Promise.reject(refreshError);
      }
    }

    if (status === 401) {
      clearTokens();
    }

    return Promise.reject(error);
  }
);