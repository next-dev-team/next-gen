import { defineConfig } from "electron-vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";
import { codeInspectorPlugin } from "code-inspector-plugin";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/main/index.js"),
        },
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/preload/index.js"),
          browserView: resolve(__dirname, "src/preload/browserView.js"),
        },
      },
    },
  },
  renderer: {
    root: "src/renderer",
    resolve: {
      alias: {
        "@": resolve(__dirname, "src/renderer/src"),
      },
    },
    server: {
      port: 5175,
      strictPort: true,
    },
    plugins: [codeInspectorPlugin({ bundler: "vite" }), react(), tailwindcss()],
  },
});
