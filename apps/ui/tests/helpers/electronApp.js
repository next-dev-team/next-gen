import { _electron as electron, expect } from "@playwright/test";
import path from "path";

export async function launchElectronApp() {
  const entryPoint = path.join(__dirname, "../../out/main/index.js");
  return await electron.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox", entryPoint],
    env: {
      NODE_ENV: "development",
      NEXTGEN_NO_SANDBOX: "1",
      NEXTGEN_DISABLE_SINGLE_INSTANCE: "1",
    },
  });
}

export async function getMainWindow(electronApp) {
  const window = await electronApp.firstWindow();
  await window.reload();
  return window;
}

export async function openBrowserTool(window) {
  await expect(
    window.getByRole("tab", { name: "Browser", exact: true })
  ).toBeVisible({ timeout: 15000 });
  await window.getByRole("tab", { name: "Browser", exact: true }).click();
}

export async function openNewTab(window) {
  await expect(window.getByRole("button", { name: "New tab" })).toBeVisible({
    timeout: 15000,
  });
  await window.getByRole("button", { name: "New tab" }).click();
}

export async function getActiveTabId(window) {
  await expect
    .poll(
      async () => {
        const raw = await window.evaluate(() =>
          localStorage.getItem("browser-tabs-store")
        );
        if (!raw) return null;
        try {
          const parsed = JSON.parse(raw);
          const id = parsed?.state?.activeTabId;
          return id && id !== "dashboard" ? id : null;
        } catch {
          return null;
        }
      },
      { timeout: 15000 }
    )
    .not.toBeNull();

  return await window.evaluate(() => {
    const raw = localStorage.getItem("browser-tabs-store");
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.state?.activeTabId || null;
  });
}

export async function setAdblockEnabled(window, enabled) {
  return await window.evaluate(
    ({ value }) => window.electronAPI?.browserView?.setAdblockEnabled?.(value),
    { value: Boolean(enabled) }
  );
}

export async function loadUrlInTab(window, { tabId, url }) {
  await window.evaluate(
    ({ id, nextUrl }) => window.electronAPI.browserView.loadURL(id, nextUrl),
    { id: tabId, nextUrl: url }
  );
}

export async function clearPopupStats(window, tabId) {
  await window.evaluate(
    ({ id }) => window.electronAPI?.browserView?.clearPopupStats?.(id),
    { id: tabId }
  );
}

export async function getPopupStats(window, tabId) {
  return await window.evaluate(
    ({ id }) => window.electronAPI?.browserView?.getPopupStats?.(id),
    { id: tabId }
  );
}

export async function getVisibleBrowserViewUrl(electronApp, urlPrefix = "") {
  return await electronApp.evaluate(
    async ({ BrowserWindow }, { prefix }) => {
      const win = BrowserWindow.getAllWindows()[0];
      if (!win) return null;
      const views =
        typeof win.getBrowserViews === "function" ? win.getBrowserViews() : [];
      let view = null;
      for (const v of views) {
        try {
          const b = typeof v.getBounds === "function" ? v.getBounds() : null;
          if (b && b.width > 0 && b.height > 0) {
            view = v;
            break;
          }
        } catch {}
      }

      view = view || views[0] || null;
      if (!view) return null;

      const u = view.webContents?.getURL?.() || "";
      if (prefix && !String(u).startsWith(String(prefix))) return null;
      return String(u);
    },
    { prefix: urlPrefix }
  );
}

export async function waitForVisibleBrowserViewUrl(
  electronApp,
  { urlPrefix, timeoutMs = 30000 }
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const url = await getVisibleBrowserViewUrl(electronApp, urlPrefix);
    if (url) return url;
    await new Promise((r) => setTimeout(r, 150));
  }
  return null;
}
