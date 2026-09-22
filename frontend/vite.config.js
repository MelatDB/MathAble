import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev-server proxy: the browser talks to the same origin and Vite forwards
// /api (and the FastAPI docs) to the backend, so there is no CORS or mixed
// content in development. Point MATHABLE_API_URL at the backend to override.
const API_TARGET = process.env.MATHABLE_API_URL || "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: API_TARGET, changeOrigin: true },
      "/docs": { target: API_TARGET, changeOrigin: true },
      "/openapi.json": { target: API_TARGET, changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
  },
});
