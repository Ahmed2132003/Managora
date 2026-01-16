import axios from "axios";
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

    if (status === 401 && refreshToken && !originalRequest?._retry) {
      originalRequest._retry = true;

      try {
        const refreshResponse = await refreshClient.post(endpoints.auth.refresh, {
          refresh: refreshToken,
        });
        const newAccess = refreshResponse.data?.access;

        if (newAccess) {
          setTokens({ access: newAccess, refresh: refreshToken });
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