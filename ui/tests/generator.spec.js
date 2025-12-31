import { _electron as electron, expect, test } from "@playwright/test";
import path from "path";

test.describe("Generator UI", () => {
  let electronApp;

  test.beforeAll(async () => {
    // Launch Electron app
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

  // test("should load the app and show title", async () => {
  //   const window = await electronApp.firstWindow();
  //   await expect(window).toHaveTitle("Float Devtools App");
  //   await expect(
  //     window.getByRole("heading", { name: "Next Gen" })
  //   ).toBeVisible();
  //   await expect(window.getByText(/Next Gen Generator ©/)).toBeVisible();
  // });

  test("should list generators", async () => {
    const window = await electronApp.firstWindow();
    await window.reload();
    // Check if generators are listed
    await expect(window.getByText("electron-float")).toBeVisible();
    await expect(window.getByText("tron-mini")).toBeVisible();
    await expect(window.getByText("agent-rules")).toBeVisible();
    await expect(window.getByText("app-scaffold")).toBeVisible();
  });

  test("should select generator and show form", async () => {
    const window = await electronApp.firstWindow();
    await window.reload();

    // Click on electron-float generator
    await window.getByText("electron-float").click();
    await window.getByRole("button", { name: "Next" }).click();

    // Check if form appears
    await expect(window.getByText("Configure electron-float")).toBeVisible();
    await expect(window.getByText("Application name")).toBeVisible();
    await expect(window.getByText("Destination path")).toBeVisible();
  });

  test("should navigate to scrum board tab", async () => {
    const window = await electronApp.firstWindow();
    await window.reload();

    await expect(window.locator(".ant-segmented")).toBeVisible();
    await window
      .locator(".ant-segmented")
      .getByText("Scrum Board", { exact: true })
      .click();
    await expect(
      window.getByRole("heading", { name: "Kanban Board" })
    ).toBeVisible({ timeout: 15000 });
    await expect(
      window.getByRole("button", { name: "New Board" })
    ).toBeVisible();
    await expect(
      window.getByRole("button", { name: "Add Column" })
    ).toBeVisible();
  });

  test("should handle start on boot setting", async () => {
    const window = await electronApp.firstWindow();
    await window.reload();

    const startOnBootSwitch = window.getByRole("switch").first();
    await expect(startOnBootSwitch).toBeVisible();

    const before = await startOnBootSwitch.getAttribute("aria-checked");
    await startOnBootSwitch.click();
    await expect(startOnBootSwitch).toHaveAttribute(
      "aria-checked",
      before === "true" ? "false" : "true"
    );
  });

  test("should sync blocks and components to page builder", async () => {
    const window = await electronApp.firstWindow();
    await window.reload();

    await window.evaluate(() => {
      localStorage.removeItem("editor-store");
    });
    await window.reload();

    await expect(window.locator(".ant-segmented")).toBeVisible();
    await window
      .locator(".ant-segmented")
      .getByText("UI", { exact: true })
      .click();
    await expect(
      window.getByRole("heading", { name: "UI Builder" })
    ).toBeVisible();

    await expect(
      window.getByPlaceholder("Search blocks & components...")
    ).toBeVisible({ timeout: 15000 });

    await window.getByRole("tab", { name: "Components" }).click();
    await window
      .getByPlaceholder("Search blocks & components...")
      .fill("Button");

    const draggableButton = window
      .locator("[draggable]")
      .filter({ hasText: "Button" })
      .first();
    await expect(draggableButton).toBeVisible({ timeout: 15000 });

    let dropTarget = window.locator(".canvas-empty");
    if (!(await dropTarget.isVisible())) {
      dropTarget = window.locator('[class*="min-h-[600px]"]').first();
    }
    await expect(dropTarget).toBeVisible({ timeout: 15000 });
    await draggableButton.dragTo(dropTarget);

    await expect
      .poll(async () => {
        const raw = await window.evaluate(() =>
          localStorage.getItem("editor-store")
        );
        if (!raw) return 0;
        const parsed = JSON.parse(raw);
        return parsed?.state?.canvas?.elements?.length || 0;
      })
      .toBeGreaterThan(0);

    await expect(window.getByTitle("Undo (Ctrl+Z)")).toBeVisible();
    await expect(window.getByTitle("Redo (Ctrl+Shift+Z)")).toBeVisible();
  });
});
