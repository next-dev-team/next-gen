#!/usr/bin/env node

const { spawn } = require("node:child_process");
const path = require("node:path");

const APP_ROOT = path.resolve(__dirname, "..");
const NODE_BIN = process.execPath;
const ELECTRON_VITE_BIN = path.resolve(
  APP_ROOT,
  "../../node_modules/electron-vite/bin/electron-vite.js",
);
const VITE_BIN = path.resolve(APP_ROOT, "../../node_modules/vite/bin/vite.js");

const spawnWithPipe = (cmd, args, opts = {}) => {
  const child = spawn(cmd, args, {
    cwd: APP_ROOT,
    stdio: ["inherit", "pipe", "pipe"],
    ...opts,
  });

  let stderr = "";
  child.stdout.on("data", (d) => process.stdout.write(d));
  child.stderr.on("data", (d) => {
    const txt = d.toString();
    stderr += txt;
    process.stderr.write(d);
  });

  return { child, getStderr: () => stderr };
};

const runPrebuild = () =>
  new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["run", "prebuild:copy"], {
      cwd: APP_ROOT,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`prebuild:copy failed with code ${code}`));
    });
  });

const isMissingSystemLibError = (text) => {
  const raw = String(text || "").toLowerCase();
  return (
    raw.includes("error while loading shared libraries") ||
    raw.includes("libnss3.so") ||
    raw.includes("libatk-1.0.so") ||
    raw.includes("libgtk-3.so")
  );
};

const run = async () => {
  await runPrebuild();

  const { child, getStderr } = spawnWithPipe(NODE_BIN, [
    ELECTRON_VITE_BIN,
    "dev",
  ]);

  child.on("exit", (code) => {
    if (code === 0 || code === null) {
      process.exit(code || 0);
      return;
    }

    const stderr = getStderr();
    if (!isMissingSystemLibError(stderr)) {
      process.exit(code);
      return;
    }

    console.warn("\n⚠️ Electron runtime libraries are missing on this machine.");
    console.warn("Falling back to web mode so UI can still run.");
    console.warn(
      "To run Electron desktop, install dependencies like: libnss3 libatk1.0-0 libgtk-3-0 libxss1 libasound2\n",
    );

    const web = spawn(NODE_BIN, [VITE_BIN, "--config", "vite.web.config.mjs"], {
      cwd: APP_ROOT,
      stdio: "inherit",
    });

    web.on("exit", (webCode) => process.exit(webCode || 0));
  });
};

run().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
