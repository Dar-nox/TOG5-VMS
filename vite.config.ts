import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
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
        // Installed from the home screen this hides the address bar and tabs,
        // so a driver sees the app rather than a web page.
        display: "standalone",
        orientation: "portrait",
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
        // Adds the notificationclick handler for a pinned trip. Imported into
        // the generated worker rather than replacing it, so precaching and
        // updates stay Workbox's problem.
        importScripts: ["sw-notifications.js"],
        // The shell is cached so the app opens instantly on a slow connection.
        //
        // Fleet data never is, and that is deliberate. The client accepted an
        // online-only app; caching records would mean a driver seeing an
        // odometer reading from last week with no way to tell it was stale,
        // which is worse than a spinner and much worse than an honest error.
        // Nothing under the Supabase host is cached at all.
        navigateFallbackDenylist: [/^\/auth\//, /^\/rest\//, /^\/storage\//],
        runtimeCaching: [],
      },
    }),
  ],
  server: {
    host: "127.0.0.1",
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/target/**", "**/src-tauri/gen/**", "**/src-tauri/icons/**"],
    },
  },
});
