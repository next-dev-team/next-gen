const fs = require("fs");
const path = require("path");
const { installAppDeps } = require("electron-builder/out/cli/install-app-deps");

function ensureExecutable(filePath) {
  const target = String(filePath || "");
  if (!target) return;
  try {
    const stat = fs.statSync(target);
    const nextMode = stat.mode | 0o111;
    if (nextMode !== stat.mode) fs.chmodSync(target, nextMode);
  } catch {}
}

if (process.platform === "win32") {
  const pathEntries = (process.env.PATH || "").split(";").filter(Boolean);
  const names = ["pnpm.cmd", "pnpm.exe", "pnpm.bat"];
  let resolved = null;

  for (const dir of pathEntries) {
    for (const name of names) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate)) {
        resolved = candidate;
        break;
      }
    }
    if (resolved) break;
  }

  if (resolved) {
    process.env.npm_execpath = resolved;
  }
}

(async () => {
  await installAppDeps({
    platform: process.platform,
    arch: process.arch,
  });

  if (process.platform === "darwin") {
    const root = path.resolve(__dirname, "..");
    const prebuilds = path.join(root, "node_modules", "node-pty", "prebuilds");
    try {
      const entries = fs.readdirSync(prebuilds, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry?.isDirectory?.()) continue;
        const name = String(entry.name || "");
        if (!name.startsWith("darwin-")) continue;
        ensureExecutable(path.join(prebuilds, name, "spawn-helper"));
      }
    } catch {
      ensureExecutable(
        path.join(prebuilds, `darwin-${process.arch}`, "spawn-helper")
      );
      ensureExecutable(path.join(prebuilds, "darwin-arm64", "spawn-helper"));
      ensureExecutable(path.join(prebuilds, "darwin-x64", "spawn-helper"));
    }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
