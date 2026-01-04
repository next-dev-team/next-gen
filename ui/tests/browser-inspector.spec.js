import { _electron as electron, expect, test } from "@playwright/test";
import path from "path";

test.describe("Browser inspector", () => {
  let electronApp;

  async function openInspectorTool(window) {
    const toggleDevPanel = window.getByRole("button", {
      name: "Toggle dev panel",
    });

    const queryTab = window.getByRole("button", { name: "Query" });

    if (!(await queryTab.isVisible().catch(() => false))) {
      await toggleDevPanel.click();
    }

    await expect(queryTab).toBeVisible({ timeout: 15000 });
    const devPanelButtons = queryTab.locator("..");
    const inspectorTab = devPanelButtons.getByRole("button", {
      name: "Inspector",
    });

    await expect(inspectorTab).toBeVisible({ timeout: 15000 });
    await inspectorTab.click();

    const attachmentsHeader = window.getByText("Agent attachments");
    await expect(attachmentsHeader).toHaveCount(1, { timeout: 15000 });
    await attachmentsHeader.scrollIntoViewIfNeeded();
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

  test("should auto-capture selection screenshot into attachments", async () => {
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

    const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body style="margin:0"><div style="width:300px;height:300px;background:rgb(255,0,0)"></div></body></html>`;
    const url = `data:text/html,${encodeURIComponent(html)}`;
    await window.evaluate(
      ({ tabId, url: nextUrl }) =>
        window.electronAPI.browserView.loadURL(tabId, nextUrl),
      { tabId: activeTabId, url }
    );

    await openInspectorTool(window);

    await electronApp.evaluate(
      ({ BrowserWindow }, payload) => {
        const win = BrowserWindow.getAllWindows()[0];
        win.webContents.send("browserview-inspector-selection", payload);
      },
      {
        tabId: activeTabId,
        tagName: "DIV",
        selector: "div",
        rect: { x: 0, y: 0, width: 120, height: 120 },
        outerHTML: "<div></div>",
      }
    );

    await expect(window.getByText("Agent attachments")).toBeVisible({
      timeout: 15000,
    });

    await expect(window.getByText("auto-capture", { exact: true })).toBeVisible(
      { timeout: 15000 }
    );

    await window
      .getByRole("button", { name: /Copy .* to clipboard/ })
      .first()
      .click();

    const imageSize = await electronApp.evaluate(({ clipboard }) => {
      const img = clipboard.readImage();
      const size = img.getSize();
      return { empty: img.isEmpty(), width: size.width, height: size.height };
    });
    expect(imageSize.empty).toBe(false);
    expect(imageSize.width).toBeGreaterThan(0);
    expect(imageSize.height).toBeGreaterThan(0);

    await window.getByRole("button", { name: "Remove captures" }).click();
    await expect(
      window.getByText("auto-capture", { exact: true })
    ).not.toBeVisible({ timeout: 15000 });
  });

  test("should support full-page capture mode", async () => {
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

    const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body style="margin:0"><div style="width:300px;height:300px;background:rgb(0,0,255)"></div></body></html>`;
    const url = `data:text/html,${encodeURIComponent(html)}`;
    await window.evaluate(
      ({ tabId, url: nextUrl }) =>
        window.electronAPI.browserView.loadURL(tabId, nextUrl),
      { tabId: activeTabId, url }
    );

    await openInspectorTool(window);
    await window.getByRole("button", { name: "Capture mode: Full" }).click();

    await electronApp.evaluate(
      ({ BrowserWindow }, payload) => {
        const win = BrowserWindow.getAllWindows()[0];
        win.webContents.send("browserview-inspector-selection", payload);
      },
      {
        tabId: activeTabId,
        tagName: "DIV",
        selector: "div",
        rect: { x: 0, y: 0, width: 120, height: 120 },
        outerHTML: "<div></div>",
      }
    );

    await expect(window.getByText("auto-capture", { exact: true })).toBeVisible(
      { timeout: 15000 }
    );
    await expect(window.getByText(/-full-/)).toBeVisible({ timeout: 15000 });
  });

  test("should upload and list multiple file types", async () => {
    const window = await electronApp.firstWindow();
    await window.reload();

    await expect(window.locator(".ant-segmented")).toBeVisible();
    await window.locator(".ant-segmented").getByText("Browser").click();

    await expect(window.getByRole("button", { name: "New tab" })).toBeVisible({
      timeout: 15000,
    });
    await window.getByRole("button", { name: "New tab" }).click();

    await openInspectorTool(window);

    const big = Buffer.alloc(26 * 1024 * 1024, 1);
    const fileInput = window.getByLabel("File upload input");
    await fileInput.setInputFiles([
      {
        name: "note.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("hello"),
      },
      {
        name: "archive.zip",
        mimeType: "application/zip",
        buffer: Buffer.from("PK\x03\x04"),
      },
      {
        name: "big.bin",
        mimeType: "application/octet-stream",
        buffer: big,
      },
    ]);

    await expect(window.getByText("note.txt")).toBeVisible({ timeout: 15000 });
    await expect(window.getByText("archive.zip")).toBeVisible({
      timeout: 15000,
    });

    await expect(window.getByText("big.bin")).not.toBeVisible();
  });

  test("should enforce upload count limit and allow delete", async () => {
    const window = await electronApp.firstWindow();
    await window.reload();

    await expect(window.locator(".ant-segmented")).toBeVisible();
    await window.locator(".ant-segmented").getByText("Browser").click();

    await expect(window.getByRole("button", { name: "New tab" })).toBeVisible({
      timeout: 15000,
    });
    await window.getByRole("button", { name: "New tab" }).click();

    await openInspectorTool(window);

    const manyFiles = Array.from({ length: 21 }, (_, i) => ({
      name: `file-${i + 1}.txt`,
      mimeType: "text/plain",
      buffer: Buffer.from(`hello-${i + 1}`),
    }));

    const fileInput = window.getByLabel("File upload input");
    await fileInput.setInputFiles(manyFiles);

    await expect(window.getByText("file-1.txt")).toBeVisible({
      timeout: 15000,
    });
    await expect(window.getByText("file-20.txt")).toBeVisible({
      timeout: 15000,
    });
    await expect(window.getByText("file-21.txt")).not.toBeVisible();

    await window.getByRole("button", { name: "Delete file-1.txt" }).click();
    await expect(window.getByText("file-1.txt")).not.toBeVisible();
  });

  test("should disable WebGL in BrowserView on macOS", async () => {
    test.skip(process.platform !== "darwin");

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

    const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><canvas id="c" width="64" height="64"></canvas></body></html>`;
    const url = `data:text/html,${encodeURIComponent(html)}`;

    await window.evaluate(
      ({ tabId, url: nextUrl }) =>
        window.electronAPI.browserView.loadURL(tabId, nextUrl),
      { tabId: activeTabId, url }
    );

    const hasWebgl = await electronApp.evaluate(
      async ({ BrowserWindow }, { expectedUrl }) => {
        const win = BrowserWindow.getAllWindows()[0];
        if (!win) throw new Error("No BrowserWindow");

        const deadline = Date.now() + 15000;
        let view;

        while (Date.now() < deadline) {
          const views =
            typeof win.getBrowserViews === "function" ? win.getBrowserViews() : [];
          view =
            views.find((v) => {
              try {
                return v?.webContents?.getURL?.() === expectedUrl;
              } catch {
                return false;
              }
            }) || null;

          if (view) break;
          await new Promise((r) => setTimeout(r, 100));
        }

        if (!view) throw new Error("No BrowserView");

        let ready = false;
        while (Date.now() < deadline) {
          ready = await view.webContents.executeJavaScript(
            "document.readyState === 'complete'"
          );
          if (ready) break;
          await new Promise((r) => setTimeout(r, 100));
        }

        return await view.webContents.executeJavaScript(
          "Boolean(document.getElementById('c')?.getContext('webgl'))"
        );
      },
      { expectedUrl: url }
    );

    expect(hasWebgl).toBe(false);
  });
});
