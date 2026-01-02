import { defineConfig } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";
import { codeInspectorPlugin } from "code-inspector-plugin";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "src/renderer",
  define: {
    __WEB__: true,
  },
  resolve: {
    alias: {
      "@": resolve("./src/renderer/src"),
    },
  },
  server: {
    port: 5175,
    strictPort: true,
  },
  plugins: [codeInspectorPlugin({ bundler: "vite" }), react(), tailwindcss()],
  build: {
    outDir: resolve("./dist-web"),
    emptyOutDir: true,
  },
});
