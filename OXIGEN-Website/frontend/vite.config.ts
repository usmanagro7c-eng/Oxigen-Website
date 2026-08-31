import { defineConfig } from "vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), tsConfigPaths(), TanStackRouterVite(), viteReact()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/files": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/private/files": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
