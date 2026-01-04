import { _electron as electron, expect, test } from "@playwright/test";
import path from "path";

test.describe("Browser inspector", () => {
  let electronApp;

  async function openInspectorTool(window) {
    const inspectorTab = window.getByRole("button", { name: "Inspector" });
    const toggleDevPanel = window.getByRole("button", {
      name: "Toggle dev panel",
    });

    if (!(await inspectorTab.isVisible().catch(() => false))) {
      await toggleDevPanel.click();
    }
    await expect(inspectorTab).toBeVisible({ timeout: 15000 });
    await inspectorTab.click();
  }

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, "../out/main/index.js")],
      env: {
        NODE_ENV: "development",
      },
    });
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test("should copy selected element HTML", async () => {
    const window = await electronApp.firstWindow();
    await window.reload();

    await expect(window.locator(".ant-segmented")).toBeVisible();
    await window.locator(".ant-segmented").getByText("Browser").click();

    await expect(window.getByRole("button", { name: "New tab" })).toBeVisible({
      timeout: 15000,
    });
    await window.getByRole("button", { name: "New tab" }).click();

    let activeTabId;
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
    activeTabId = await window.evaluate(() => {
      const raw = localStorage.getItem("browser-tabs-store");
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.state?.activeTabId || null;
    });
    expect(activeTabId).toBeTruthy();

    await openInspectorTool(window);

    const outerHTML = '<div class="test">Hello</div>';
    await electronApp.evaluate(
      ({ BrowserWindow }, payload) => {
        const win = BrowserWindow.getAllWindows()[0];
        win.webContents.send("browserview-inspector-selection", payload);
      },
      {
        tabId: activeTabId,
        tagName: "DIV",
        selector: "div.test",
        outerHTML,
        rect: { x: 0, y: 0, width: 10, height: 10 },
      }
    );

    await expect(
      window.locator("pre").filter({ hasText: outerHTML })
    ).toBeVisible();

    await window.getByRole("button", { name: "Copy HTML" }).click();

    const copied = await electronApp.evaluate(({ clipboard }) => {
      return clipboard.readText();
    });
    expect(copied).toBe(outerHTML);
  });

  test("should pick element from BrowserView", async () => {
    const window = await electronApp.firstWindow();
    await window.reload();

    await expect(window.locator(".ant-segmented")).toBeVisible();
    await window.locator(".ant-segmented").getByText("Browser").click();

    await expect(window.getByRole("button", { name: "New tab" })).toBeVisible({
      timeout: 15000,
    });
    await window.getByRole("button", { name: "New tab" }).click();

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

    const activeTabId = await window.evaluate(() => {
      const raw = localStorage.getItem("browser-tabs-store");
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.state?.activeTabId || null;
    });
    expect(activeTabId).toBeTruthy();

    const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body style="margin:0"><div id="target" style="width:200px;height:200px;background:red">Hello</div></body></html>`;
    const url = `data:text/html,${encodeURIComponent(html)}`;

    await window.evaluate(
      ({ tabId, url: nextUrl }) =>
        window.electronAPI.browserView.loadURL(tabId, nextUrl),
      { tabId: activeTabId, url }
    );

    await openInspectorTool(window);

    await window.evaluate(() => {
      window.__pwInspectorSelection = null;
      if (typeof window.__pwOffInspectorSelection === "function") {
        try {
          window.__pwOffInspectorSelection();
        } catch {}
      }
      if (window.electronAPI?.browserView?.onInspectorSelection) {
        window.__pwOffInspectorSelection =
          window.electronAPI.browserView.onInspectorSelection((payload) => {
            window.__pwInspectorSelection = payload;
          });
      }
    });

    await window.getByRole("button", { name: "Pick" }).click();
    await expect(window.getByRole("button", { name: "Picking" })).toBeVisible({
      timeout: 15000,
    });

    const selection = await electronApp.evaluate(
      async ({ BrowserWindow, ipcMain }, { urlPrefix }) => {
        const win = BrowserWindow.getAllWindows()[0];
        if (!win) throw new Error("No BrowserWindow");

        const deadline = Date.now() + 15000;
        let view;
        while (Date.now() < deadline) {
          const views =
            typeof win.getBrowserViews === "function"
              ? win.getBrowserViews()
              : [];
          const visible = views.find((v) => {
            try {
              const b =
                typeof v.getBounds === "function" ? v.getBounds() : null;
              return b && b.width > 0 && b.height > 0;
            } catch {
              return false;
            }
          });
          view = visible || views[0] || null;
          const currentUrl = view?.webContents?.getURL?.() || "";
          if (view && String(currentUrl).startsWith(String(urlPrefix))) break;

          await new Promise((r) => setTimeout(r, 100));
        }
        if (!view) throw new Error("No BrowserView");

        const viewUrl = view?.webContents?.getURL?.() || "";
        if (!String(viewUrl).startsWith(String(urlPrefix))) {
          throw new Error(`Unexpected BrowserView URL: ${String(viewUrl)}`);
        }

        let active = false;
        while (Date.now() < deadline) {
          active = await view.webContents.executeJavaScript(
            "Boolean(document.getElementById('inspector-style')) && Boolean(document.querySelector('.__inspector_overlay'))"
          );
          if (active) break;
          await new Promise((r) => setTimeout(r, 100));
        }
        if (!active) throw new Error("Inspector not active in BrowserView");

        const selectionPromise = new Promise((resolve, reject) => {
          let timer;
          const handler = (event, payload) => {
            if (timer) clearTimeout(timer);
            resolve({ url: event.sender.getURL?.() || "", payload });
          };

          timer = setTimeout(() => {
            ipcMain.removeListener("inspector-selection", handler);
            reject(new Error("No inspector selection IPC received"));
          }, 5000);

          ipcMain.once("inspector-selection", handler);
        });

        view.webContents.focus();

        view.webContents.sendInputEvent({ type: "mouseMove", x: 10, y: 10 });
        view.webContents.sendInputEvent({
          type: "mouseDown",
          x: 10,
          y: 10,
          button: "left",
          clickCount: 1,
        });
        view.webContents.sendInputEvent({
          type: "mouseUp",
          x: 10,
          y: 10,
          button: "left",
          clickCount: 1,
        });

        return await selectionPromise;
      },
      { urlPrefix: "data:text/html" }
    );

    expect(selection?.url || "").toContain("data:text/html");
    expect(selection?.payload?.outerHTML || "").toContain('id="target"');

    await expect
      .poll(
        async () =>
          window.evaluate(() => window.__pwInspectorSelection?.outerHTML || ""),
        { timeout: 15000 }
      )
      .toContain('id="target"');

    await expect(
      window.locator("pre").filter({ hasText: 'id="target"' })
    ).toBeVisible({ timeout: 15000 });

    await window.getByRole("button", { name: "Copy HTML" }).click();

    const copied = await electronApp.evaluate(({ clipboard }) => {
      return clipboard.readText();
    });
    expect(copied).toContain('id="target"');
    expect(copied).toContain("Hello");
  });
});
