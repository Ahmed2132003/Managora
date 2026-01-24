export const env = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL as string,
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN as string | undefined,
  APP_ENVIRONMENT: import.meta.env.VITE_APP_ENV as string | undefined,
  BUILD_SHA: import.meta.env.VITE_BUILD_SHA as string | undefined,
};