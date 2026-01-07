import { expect, test } from "@playwright/test";
import {
  clearPopupStats,
  getActiveTabId,
  getMainWindow,
  getPopupStats,
  launchElectronApp,
  loadUrlInTab,
  openBrowserTool,
  openNewTab,
  setAdblockEnabled,
  waitForVisibleBrowserViewUrl,
} from "./helpers/electronApp";

test.describe("Adblocker", () => {
  let electronApp;

  test.beforeAll(async () => {
    electronApp = await launchElectronApp();
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test("should not popup or redirect on YTS", async () => {
    const targetUrl = "https://www.yts-official.cc/movies/frankenstein-2025/";

    const window = await getMainWindow(electronApp);
    await openBrowserTool(window);
    await openNewTab(window);

    const tabId = await getActiveTabId(window);
    expect(tabId).toBeTruthy();

    await setAdblockEnabled(window, true);
    await clearPopupStats(window, tabId);

    await loadUrlInTab(window, { tabId, url: targetUrl });

    const initial = await waitForVisibleBrowserViewUrl(electronApp, {
      urlPrefix: "https://",
      timeoutMs: 30000,
    });
    expect(initial).toBeTruthy();

    const initialHost = (() => {
      try {
        return new URL(initial).host;
      } catch {
        return "";
      }
    })();

    expect(initialHost).toMatch(/yts-official\.cc$/);

    await window.waitForTimeout(8000);

    const afterWait = await waitForVisibleBrowserViewUrl(electronApp, {
      urlPrefix: "https://",
      timeoutMs: 5000,
    });
    expect(afterWait).toBeTruthy();

    const afterHost = (() => {
      try {
        return new URL(afterWait).host;
      } catch {
        return "";
      }
    })();
    expect(afterHost).toBe(initialHost);

    const stats = await getPopupStats(window, tabId);
    expect(Number(stats?.count || 0)).toBe(0);
  });
});

