import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Dev proxy notes
 * --------------
 * - If Vite runs on your HOST machine, keep BACKEND_URL as http://localhost:8001
 * - If Vite runs INSIDE Docker (frontend container), localhost points to the container itself.
 *   In that case set VITE_BACKEND_URL=http://managora_backend:8000 (or your backend service name/port).
 *
 * You can override the proxy target without editing this file:
 *   Windows (PowerShell):
 *     $env:VITE_BACKEND_URL="http://localhost:8001"; npm run dev
 *   Docker:
 *     VITE_BACKEND_URL=http://managora_backend:8000
 */
const BACKEND_URL = process.env.VITE_BACKEND_URL || "http://localhost:8001";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Avoid CORS in dev: frontend calls /api/* and Vite proxies to backend
      "/api": {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      // If you serve media files locally
      "/media": {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
