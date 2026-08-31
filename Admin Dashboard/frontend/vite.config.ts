import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
    }),
    react(),
    nitro(),
  ],
  server: {
    proxy: {
      // Proxy API + health to the Express backend during development.
      // This keeps cookies same-origin (no CORS) and CSRF working out of the box.
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/health": {
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
