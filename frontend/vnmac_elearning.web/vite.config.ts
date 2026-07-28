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
      "tinymce",
      "@tinymce/tinymce-react",
      "prop-types",
      "tinymce/models/dom",
      "tinymce/icons/default",
      "tinymce/themes/silver",
      "tinymce/plugins/advlist",
      "tinymce/plugins/anchor",
      "tinymce/plugins/autolink",
      "tinymce/plugins/charmap",
      "tinymce/plugins/code",
      "tinymce/plugins/fullscreen",
      "tinymce/plugins/image",
      "tinymce/plugins/insertdatetime",
      "tinymce/plugins/link",
      "tinymce/plugins/lists",
      "tinymce/plugins/media",
      "tinymce/plugins/preview",
      "tinymce/plugins/quickbars",
      "tinymce/plugins/searchreplace",
      "tinymce/plugins/table",
      "tinymce/plugins/visualblocks",
      "tinymce/plugins/wordcount",
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
