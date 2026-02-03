import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Avoid CORS in dev: frontend calls /api/* and Vite proxies to backend
      "/api": {
        target: "http://localhost:8001",
        changeOrigin: true,
      },
      // If you serve media files locally
      "/media": {
        target: "http://localhost:8001",
        changeOrigin: true,
      },
    },
  },
});
