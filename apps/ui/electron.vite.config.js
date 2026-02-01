import { defineConfig } from "electron-vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";
import { codeInspectorPlugin } from "code-inspector-plugin";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs";

// Custom plugin to copy anti-detection module after build
function copyAntiDetectionPlugin() {
  return {
    name: "copy-anti-detection",
    writeBundle() {
      const srcDir = resolve(__dirname, "src/main/anti-detection");
      const destDir = resolve(__dirname, "out/main/anti-detection");

      // Create destination directory if it doesn't exist
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      // Copy all files from src to dest
      const files = fs.readdirSync(srcDir);
      for (const file of files) {
        const srcFile = resolve(srcDir, file);
        const destFile = resolve(destDir, file);
        fs.copyFileSync(srcFile, destFile);
      }

      console.log("✓ Copied anti-detection module to out/main/");
    },
  };
}

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/main/index.js"),
        },
      },
    },
    plugins: [copyAntiDetectionPlugin()],
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
        "@gen": resolve(__dirname, "src/gen"),
      },
    },
    build: {
      rollupOptions: {
        // External optional dependencies that may not be installed
        external: [],
        onwarn(warning, warn) {
          // Suppress warnings for optional dependencies like html2canvas
          if (
            warning.code === "UNRESOLVED_IMPORT" &&
            warning.source === "html2canvas"
          ) {
            return;
          }
          warn(warning);
        },
      },
    },
    server: {
      port: 5175,
      strictPort: true,
      fs: {
        allow: [resolve(__dirname, "src")],
      },
    },
    plugins: [codeInspectorPlugin({ bundler: "vite" }), react(), tailwindcss()],
  },
});
