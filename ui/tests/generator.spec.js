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

  test("should load the app and show title", async () => {
    const window = await electronApp.firstWindow();
    await expect(window).toHaveTitle("Float Devtools App");
    await expect(
      window.getByRole("heading", { name: "Next Gen" })
    ).toBeVisible();
    await expect(window.getByText(/Next Gen Generator ©/)).toBeVisible();
  });

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

    await window
      .getByRole("radio", { name: "table Scrum Board" })
      .nth(1)
      .click();
    await expect(
      window.getByRole("heading", { name: "Scrum Board" })
    ).toBeVisible();
    await expect(window.getByRole("button", { name: "New Board" })).toBeVisible();
    await expect(window.getByRole("button", { name: "Add list" })).toBeVisible();
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
      localStorage.removeItem("puck-store");
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
      window.getByRole("tab", { name: /Page Builder/i })
    ).toBeVisible({ timeout: 15000 });
    await window.getByRole("tab", { name: /Page Builder/i }).click();

    await window.getByRole("button", { name: "Templates" }).click();
    const templatesDialog = window.getByRole("dialog");
    await expect(
      templatesDialog.getByRole("heading", { name: "Templates" })
    ).toBeVisible();
    await templatesDialog
      .getByRole("button", { name: "Close" })
      .first()
      .click();

    await expect(
      window.locator('button.bg-secondary:has-text("Undo")')
    ).toBeVisible();
    await expect(
      window.locator('button.bg-secondary:has-text("Redo")')
    ).toBeVisible();

    await window.getByRole("tab", { name: "Blocks" }).click();
    await window.getByPlaceholder("Block name").fill("My Card");
    await window.getByRole("button", { name: "Add Block" }).click();

    await expect
      .poll(async () => {
        const raw = await window.evaluate(() =>
          localStorage.getItem("puck-store")
        );
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        const content = parsed?.state?.puckData?.content || [];
        return content.map((item) => item?.type).filter(Boolean);
      })
      .toContain("My-Card");

    await window.getByRole("tab", { name: "Components" }).click();
    await window.getByRole("button", { name: "Button" }).first().click();
    await window.getByRole("button", { name: "Add to Builder" }).click();

    await expect
      .poll(async () => {
        const raw = await window.evaluate(() =>
          localStorage.getItem("puck-store")
        );
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        const content = parsed?.state?.puckData?.content || [];
        return content.map((item) => item?.type).filter(Boolean);
      })
      .toContain("Library__button");
  });
});
