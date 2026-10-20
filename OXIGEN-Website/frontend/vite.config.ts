import { defineConfig } from "vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { sitemapPlugin } from "./vite-plugin-sitemap";

export default defineConfig({
  plugins: [
    tailwindcss(),
    tsConfigPaths(),
    TanStackRouterVite(),
    viteReact(),
    // Runs last: emits sitemap.xml into dist/ after the bundle is written.
    sitemapPlugin(),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3002",
        changeOrigin: true,
      },
      "/files": {
        target: "http://localhost:3002",
        changeOrigin: true,
      },
      "/private/files": {
        target: "http://localhost:3002",
        changeOrigin: true,
      },
    },
  },
});
