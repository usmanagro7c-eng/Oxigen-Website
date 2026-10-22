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
    TanStackRouterVite({ autoCodeSplitting: true }),
    viteReact(),
    // Runs last: emits sitemap.xml into dist/ after the bundle is written.
    sitemapPlugin(),
  ],
  build: {
    // Split heavy vendor code into separate cached chunks so the initial
    // bundle stays small and repeat visits load from cache.
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("react-dom") || id.includes("/react/")) return "vendor-react";
            if (id.includes("@tanstack/react-router") || id.includes("@tanstack/router")) return "vendor-router";
            if (id.includes("lucide-react")) return "vendor-ui";
            if (id.includes("/motion/") || id.includes("framer-motion")) return "vendor-motion";
            if (id.includes("recharts")) return "vendor-charts";
            if (id.includes("react-hook-form") || id.includes("/zod/") || id.includes("@hookform")) return "vendor-form";
            if (id.includes("@radix-ui")) return "vendor-radix";
          }
        },
      },
    },
  },
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
