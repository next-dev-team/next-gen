const fs = require("fs");
const path = require("path");
const { installAppDeps } = require("electron-builder/out/cli/install-app-deps");

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

installAppDeps({
  platform: process.platform,
  arch: process.arch,
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
