import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 1420,
    strictPort: true,
    // Same-origin in development too, so session cookies behave exactly as
    // they do in production and there is no CORS to configure.
    proxy: {
      "/api": {
        target: process.env.VMS_SERVER_URL ?? "http://127.0.0.1:8787",
        changeOrigin: false,
      },
    },
    watch: {
      ignored: ["**/src-tauri/target/**", "**/src-tauri/gen/**", "**/src-tauri/icons/**"],
    },
  },
});
