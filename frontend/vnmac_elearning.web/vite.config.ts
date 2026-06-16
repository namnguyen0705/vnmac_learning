import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = fs.realpathSync.native?.(configDirectory) ?? fs.realpathSync(configDirectory);

export default defineConfig({
  root: projectRoot,
  cacheDir: path.join(projectRoot, ".vite"),
  plugins: [tailwindcss()],
  esbuild: {
    jsx: "automatic",
    jsxDev: false,
  },
  optimizeDeps: {
    noDiscovery: true,
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-router-dom",
      "@tanstack/react-query",
      "zustand",
      "lucide-react",
      "class-variance-authority",
      "clsx",
      "tailwind-merge",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-select",
      "@radix-ui/react-slot",
    ],
  },
  resolve: {
    alias: {
      "@": path.join(projectRoot, "src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5211",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:5211",
        changeOrigin: true,
      },
    },
  },
});
