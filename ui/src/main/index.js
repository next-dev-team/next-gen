const { app, BrowserWindow, globalShortcut, ipcMain } = require("electron");
const path = require("path");
const Store = require("electron-store");
const { spawn } = require("child_process");

const store = new Store();
let mainWindow = null;
let devToolsWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createFloatDevTools() {
  if (devToolsWindow && !devToolsWindow.isDestroyed()) {
    devToolsWindow.focus();
    return;
  }
  if (!mainWindow) return;

  devToolsWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: "DevTools - Float Mode",
    alwaysOnTop: true,
    autoHideMenuBar: true,
  });

  mainWindow.webContents.setDevToolsWebContents(devToolsWindow.webContents);
  mainWindow.webContents.openDevTools({ mode: "detach" });
  devToolsWindow.on("closed", () => {
    devToolsWindow = null;
  });
}

ipcMain.handle("get-start-on-boot", () => store.get("startOnBoot", false));

ipcMain.handle("set-start-on-boot", (event, enabled) => {
  store.set("startOnBoot", enabled);
  app.setLoginItemSettings({ openAtLogin: enabled });
  return true;
});

ipcMain.handle("run-generator", async (event, { generatorName, answers }) => {
  return new Promise((resolve, reject) => {
    // In dev: __dirname is .../ui/out/main
    // Project root is .../next-gen
    // script is in .../next-gen/scripts/run-generator.ts
    const scriptPath = path.resolve(
      __dirname,
      "../../../scripts/run-generator.ts"
    );
    const answersString = JSON.stringify(answers);
    const answersBase64 = Buffer.from(answersString).toString("base64");

    const npx = process.platform === "win32" ? "npx.cmd" : "npx";

    console.log(
      `Running generator: ${generatorName} with script: ${scriptPath}`
    );

    const child = spawn(
      npx,
      ["tsx", scriptPath, generatorName, answersBase64],
      {
        cwd: path.resolve(__dirname, "../../.."), // Run in project root
        shell: true,
      }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
      console.log(`[Generator] ${data}`);
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
      console.error(`[Generator Error] ${data}`);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ success: true, output: stdout });
      } else {
        reject(new Error(`Generator failed with code ${code}\n${stderr}`));
      }
    });
  });
});

app.whenReady().then(() => {
  createWindow();
  globalShortcut.register("CommandOrControl+Shift+I", () => {
    if (mainWindow && !mainWindow.isDestroyed())
      mainWindow.webContents.toggleDevTools();
  });
  globalShortcut.register("CommandOrControl+Shift+D", () => {
    if (mainWindow && !mainWindow.isDestroyed()) createFloatDevTools();
  });
  if (store.get("startOnBoot", false)) {
    app.setLoginItemSettings({ openAtLogin: true });
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
