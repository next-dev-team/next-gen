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
    await expect(window.getByText("Coming soon.")).toBeVisible();
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
});
