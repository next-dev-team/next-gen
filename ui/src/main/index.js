const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  shell,
  dialog,
} = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let store;

async function getStore() {
  if (!store) {
    const StoreModule = await import("electron-store");
    const StoreClass = StoreModule.default || StoreModule;
    store = new StoreClass();
  }
  return store;
}

let mainWindow = null;
let devToolsWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0f172a",
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#1e293b",
      symbolColor: "#94a3b8",
      height: 38,
    },
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

// Send log to renderer
function sendLog(type, message) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("generator-log", { type, message });
  }
}

ipcMain.handle("get-start-on-boot", async () => {
  const currentStore = await getStore();
  return currentStore.get("startOnBoot", false);
});

ipcMain.handle("set-start-on-boot", async (event, enabled) => {
  const currentStore = await getStore();
  currentStore.set("startOnBoot", enabled);
  app.setLoginItemSettings({ openAtLogin: enabled });
  return true;
});

// Select folder dialog
ipcMain.handle("select-folder", async (event, { title, defaultPath }) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: title || "Select Folder",
    defaultPath: defaultPath || app.getPath("documents"),
    properties: ["openDirectory", "createDirectory"],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// Helper to ensure path is absolute
async function ensureAbsolutePath(targetPath) {
  if (path.isAbsolute(targetPath)) {
    return targetPath;
  }

  // Resolve relative to project root
  let rootPath;
  if (app.isPackaged) {
    rootPath = path.join(process.resourcesPath);
  } else {
    rootPath = path.resolve(__dirname, "../../..");
  }

  return path.resolve(rootPath, targetPath);
}

// Open folder in file explorer
ipcMain.handle("open-folder", async (event, folderPath) => {
  if (folderPath) {
    const absolutePath = await ensureAbsolutePath(folderPath);
    shell.openPath(absolutePath);
    return true;
  }
  return false;
});

// Get project root path
ipcMain.handle("get-project-root", async () => {
  if (app.isPackaged) {
    return path.join(process.resourcesPath);
  }
  return path.resolve(__dirname, "../../..");
});

// ======= PROJECT LAUNCHER FEATURES =======

// Get all saved projects
ipcMain.handle("get-projects", async () => {
  const currentStore = await getStore();
  return currentStore.get("projects", []);
});

// Save a new project
ipcMain.handle("save-project", async (event, project) => {
  const currentStore = await getStore();
  const projects = currentStore.get("projects", []);

  // Check if project with same path already exists
  const existingIndex = projects.findIndex((p) => p.path === project.path);
  if (existingIndex >= 0) {
    projects[existingIndex] = {
      ...projects[existingIndex],
      ...project,
      updatedAt: new Date().toISOString(),
    };
  } else {
    projects.push({
      ...project,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  currentStore.set("projects", projects);
  return projects;
});

// Delete a project
ipcMain.handle("delete-project", async (event, projectId) => {
  const currentStore = await getStore();
  const projects = currentStore.get("projects", []);
  const filtered = projects.filter((p) => p.id !== projectId);
  currentStore.set("projects", filtered);
  return filtered;
});

// Open project in IDE
ipcMain.handle("open-in-ide", async (event, { projectPath, ide }) => {
  const { exec } = require("child_process");

  // Make path absolute
  const absolutePath = await ensureAbsolutePath(projectPath);

  // IDE commands for different editors
  const ideCommands = {
    cursor: "cursor",
    vscode: "code",
    "vs-code": "code",
    code: "code",
    webstorm: "webstorm",
    idea: "idea",
    sublime: "subl",
    atom: "atom",
    vim: "vim",
    nvim: "nvim",
    zed: "zed",
    fleet: "fleet",
    trae: "trae",
  };

  const command = ideCommands[ide.toLowerCase()] || ide;
  const isWindows = process.platform === "win32";
  const fullCommand = isWindows
    ? `${command} "${absolutePath}"`
    : `${command} "${absolutePath}"`;

  return new Promise((resolve, reject) => {
    exec(fullCommand, { shell: true }, (error, stdout, stderr) => {
      if (error) {
        // Try with .cmd extension on Windows
        if (isWindows) {
          exec(`${command}.cmd "${absolutePath}"`, { shell: true }, (err2) => {
            if (err2) {
              reject(new Error(`Failed to open in ${ide}: ${error.message}`));
            } else {
              resolve({ success: true });
            }
          });
        } else {
          reject(new Error(`Failed to open in ${ide}: ${error.message}`));
        }
      } else {
        resolve({ success: true });
      }
    });
  });
});

// Check if a path exists
ipcMain.handle("check-path-exists", async (event, checkPath) => {
  const fs = require("fs");
  try {
    await fs.promises.access(checkPath);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle("run-generator", async (event, { generatorName, answers }) => {
  return new Promise((resolve, reject) => {
    // Determine script path based on environment
    let scriptPath;
    let cwd;

    if (app.isPackaged) {
      // Production: resources are in the app resources folder
      scriptPath = path.join(process.resourcesPath, "scripts/run-generator.ts");
      cwd = path.join(process.resourcesPath);
    } else {
      // Development: relative to the project
      scriptPath = path.resolve(__dirname, "../../../scripts/run-generator.ts");
      cwd = path.resolve(__dirname, "../../..");
    }

    const answersString = JSON.stringify(answers);
    const answersBase64 = Buffer.from(answersString).toString("base64");
    const npx = process.platform === "win32" ? "npx.cmd" : "npx";

    sendLog("info", `🚀 Starting generator: ${generatorName}`);
    sendLog("info", `📁 Working directory: ${cwd}`);
    sendLog(
      "info",
      `📋 Configuration: ${Object.keys(answers).length} options set`
    );
    sendLog("info", "─".repeat(50));

    const child = spawn(
      npx,
      ["tsx", scriptPath, generatorName, answersBase64],
      {
        cwd,
        shell: true,
        env: { ...process.env, FORCE_COLOR: "1" },
      }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      const text = data.toString();
      stdout += text;

      // Stream each line to the renderer
      const lines = text.split("\n").filter((line) => line.trim());
      lines.forEach((line) => {
        // Detect log type based on content
        let type = "info";
        if (
          line.includes("error") ||
          line.includes("Error") ||
          line.includes("❌")
        ) {
          type = "error";
        } else if (
          line.includes("success") ||
          line.includes("Success") ||
          line.includes("✓") ||
          line.includes("✔") ||
          line.includes("done")
        ) {
          type = "success";
        } else if (
          line.includes("warning") ||
          line.includes("Warning") ||
          line.includes("⚠")
        ) {
          type = "warning";
        }
        sendLog(type, line);
      });
    });

    child.stderr.on("data", (data) => {
      const text = data.toString();
      stderr += text;

      const lines = text.split("\n").filter((line) => line.trim());
      lines.forEach((line) => {
        // Some npm/npx messages go to stderr but aren't errors
        if (line.includes("npm") || line.includes("WARN")) {
          sendLog("warning", line);
        } else {
          sendLog("error", line);
        }
      });
    });

    child.on("error", (error) => {
      sendLog("error", `Process error: ${error.message}`);
      reject(new Error(`Failed to start generator: ${error.message}`));
    });

    child.on("close", (code) => {
      sendLog("info", "─".repeat(50));

      if (code === 0) {
        sendLog("success", "✅ Generator completed successfully!");
        resolve({ success: true, output: stdout });
      } else {
        sendLog("error", `❌ Generator failed with exit code ${code}`);
        reject(new Error(`Generator failed with code ${code}\n${stderr}`));
      }
    });
  });
});

app.whenReady().then(async () => {
  const currentStore = await getStore();
  createWindow();

  globalShortcut.register("CommandOrControl+Shift+I", () => {
    if (mainWindow && !mainWindow.isDestroyed())
      mainWindow.webContents.toggleDevTools();
  });

  globalShortcut.register("CommandOrControl+Shift+D", () => {
    if (mainWindow && !mainWindow.isDestroyed()) createFloatDevTools();
  });

  if (currentStore.get("startOnBoot", false)) {
    app.setLoginItemSettings({ openAtLogin: true });
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle external links
ipcMain.on("open-external", (event, url) => {
  shell.openExternal(url);
});
