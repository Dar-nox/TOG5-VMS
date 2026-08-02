import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "TOG 5 VMS",
        short_name: "TOG 5 VMS",
        description: "Vehicle maintenance records, trips, fuel, and costs for the TOG 5 fleet.",
        id: "/",
        start_url: "/",
        scope: "/",
        // Installed from the home screen, this hides the address bar and tabs,
        // so people see only TOG 5 VMS.
        display: "standalone",
        background_color: "#102833",
        theme_color: "#102833",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // The app shell is cached so it opens instantly. Fleet data never is:
        // a stale odometer reading or fuel log would be worse than a spinner,
        // and this version deliberately has no offline mode.
        navigateFallbackDenylist: [/^\/api\//, /^\/healthz$/],
        runtimeCaching: [],
      },
    }),
  ],
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
