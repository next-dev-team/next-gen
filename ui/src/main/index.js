const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  shell,
  dialog,
} = require("electron");
const path = require("path");
const { spawn, fork } = require("child_process");
const Conf = require("conf");

const scrumStore = new Conf({ projectName: "next-gen-scrum" });
const mcpServer = require("../../scripts/scrum-mcp-server.js");

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
let serverRunning = false;

// Log buffering
const mcpLogBuffer = [];
const MAX_LOG_BUFFER = 1000;

const bmadLogBuffer = [];
let bmadChildProcess = null;
let bmadPtyProcess = null;

let nodePty = null;
try {
  nodePty = require("node-pty");
} catch {
  nodePty = null;
}

function sendBmadLog(type, message) {
  const logEntry = { type, message, timestamp: new Date().toISOString() };
  bmadLogBuffer.push(logEntry);
  if (bmadLogBuffer.length > MAX_LOG_BUFFER) {
    bmadLogBuffer.shift();
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("bmad-cli-log", logEntry);
  }
}

function sendMcpLog(type, message) {
  const logEntry = { type, message, timestamp: new Date().toISOString() };

  // Add to buffer
  mcpLogBuffer.push(logEntry);
  if (mcpLogBuffer.length > MAX_LOG_BUFFER) {
    mcpLogBuffer.shift();
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("mcp-server-log", logEntry);
  }
}
async function startMcpServer() {
  try {
    console.log("Starting MCP Server (Internal)...");

    // Pass logger callback to capture logs
    await mcpServer.start(3847, (type, message) => {
      // Map 'info'/'error' to suitable types if needed, or pass directly
      if (type === "error") {
        console.error(`[MCP Internal] ${message}`);
        sendMcpLog("error", message);
      } else {
        console.log(`[MCP Internal] ${message}`);
        sendMcpLog("info", message);
      }
    });

    serverRunning = true;
    sendLog("success", "MCP Server started internally");
    sendMcpLog("success", "MCP Server started internally");
  } catch (err) {
    console.error("Failed to start MCP Server:", err);
    sendLog("error", `Failed to start MCP Server: ${err.message}`);
    sendMcpLog("error", `Failed to start MCP Server: ${err.message}`);
    serverRunning = false;
  }
}

function stopMcpServer() {
  if (serverRunning) {
    mcpServer.stop();
    serverRunning = false;
    sendLog("warning", "MCP Server stopped");
  }
}

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
    "google-antigravity": "antigravity",
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

ipcMain.handle(
  "write-project-file",
  async (event, { projectRoot, relativePath, content, overwrite } = {}) => {
    const fs = require("fs");
    const root = String(projectRoot || "").trim();
    const rel = String(relativePath || "").trim();
    if (!root || !path.isAbsolute(root)) {
      throw new Error("projectRoot must be an absolute path");
    }
    if (!rel || path.isAbsolute(rel)) {
      throw new Error("relativePath must be a relative path");
    }

    const resolvedRoot = path.resolve(root);
    const target = path.resolve(resolvedRoot, rel);
    const rootPrefix = resolvedRoot.endsWith(path.sep)
      ? resolvedRoot
      : resolvedRoot + path.sep;

    if (!target.startsWith(rootPrefix)) {
      throw new Error("Refusing to write outside projectRoot");
    }

    await fs.promises.mkdir(path.dirname(target), { recursive: true });

    if (!overwrite) {
      try {
        await fs.promises.access(target);
        throw new Error("File already exists");
      } catch (err) {
        if (String(err?.message || "").includes("File already exists")) {
          throw err;
        }
      }
    }

    await fs.promises.writeFile(target, String(content || ""), "utf8");
    return { success: true, path: target };
  }
);

ipcMain.handle(
  "read-project-file",
  async (event, { projectRoot, relativePath, maxBytes } = {}) => {
    const fs = require("fs");
    const resolvedRoot = String(projectRoot || "").trim();
    const rel = String(relativePath || "").trim();
    if (!resolvedRoot || !path.isAbsolute(resolvedRoot)) {
      throw new Error("projectRoot must be an absolute path");
    }
    if (!rel) {
      throw new Error("relativePath is required");
    }

    const target = path.resolve(resolvedRoot, rel);
    const rootPrefix = resolvedRoot.endsWith(path.sep)
      ? resolvedRoot
      : resolvedRoot + path.sep;
    if (!target.startsWith(rootPrefix)) {
      throw new Error("Refusing to read outside projectRoot");
    }

    const limit =
      typeof maxBytes === "number" && Number.isFinite(maxBytes) && maxBytes > 0
        ? Math.floor(maxBytes)
        : 250_000;

    const stat = await fs.promises.stat(target);
    if (stat.size > limit) {
      throw new Error(`File too large to preview (${stat.size} bytes)`);
    }

    const content = await fs.promises.readFile(target, "utf8");
    return { success: true, path: target, content };
  }
);

ipcMain.handle(
  "bmad-cli-run",
  async (
    event,
    {
      cwd,
      mode,
      action,
      moduleCodes,
      verbose,
      extraArgs,
      interactive,
      autoAcceptDefaults: autoAcceptDefaultsOption,
    } = {}
  ) => {
    const fs = require("fs");
    const workingDir = String(cwd || "").trim();
    if (!workingDir || !path.isAbsolute(workingDir)) {
      sendBmadLog("error", "cwd must be an absolute path");
      throw new Error("cwd must be an absolute path");
    }
    try {
      await fs.promises.access(workingDir);
    } catch {
      sendBmadLog("error", `cwd not accessible: ${workingDir}`);
      throw new Error(`cwd not accessible: ${workingDir}`);
    }

    if (bmadChildProcess || bmadPtyProcess) {
      sendBmadLog("warning", "BMAD command already running");
      throw new Error("BMAD command already running");
    }

    const selectedMode = String(mode || "npx").trim();
    const selectedAction = String(action || "status").trim();
    const extra = Array.isArray(extraArgs) ? extraArgs : [];
    const isVerbose = Boolean(verbose);

    let command;
    let args;

    if (selectedMode === "bmad") {
      command = process.platform === "win32" ? "bmad.cmd" : "bmad";
      args = [selectedAction];
      if (selectedAction === "install") {
        const mods = Array.isArray(moduleCodes) ? moduleCodes : [];
        if (mods.length > 0) args.push("-m", ...mods);
      }
      if (isVerbose) args.push("-v");
      args.push(...extra);
    } else {
      command = process.platform === "win32" ? "npx.cmd" : "npx";
      args = ["-y", "bmad-method@alpha", selectedAction];
      if (isVerbose) args.push("-v");
      args.push(...extra);
    }

    const runOnceSpawn = (runCommand, runArgs, { autoAcceptDefaults } = {}) =>
      new Promise((resolve) => {
        sendBmadLog("info", `▶ ${runCommand} ${runArgs.join(" ")}`);

        const child = spawn(runCommand, runArgs, {
          cwd: workingDir,
          shell: true,
          env: { ...process.env, FORCE_COLOR: "1" },
        });
        bmadChildProcess = child;

        let autoInputInterval = null;
        let autoInputTimeout = null;

        if (autoAcceptDefaults && child?.stdin?.writable) {
          autoInputInterval = setInterval(() => {
            try {
              child.stdin.write("\n");
            } catch {}
          }, 900);

          autoInputTimeout = setTimeout(() => {
            try {
              if (autoInputInterval) clearInterval(autoInputInterval);
            } catch {}
          }, 45_000);
        }

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data) => {
          const text = data.toString();
          stdout += text;
          const lines = text.split("\n").filter((line) => line.trim());
          lines.forEach((line) => {
            sendBmadLog("info", line);
          });
        });

        child.stderr.on("data", (data) => {
          const text = data.toString();
          stderr += text;
          const lines = text.split("\n").filter((line) => line.trim());
          lines.forEach((line) => {
            const type =
              line.includes("WARN") || line.includes("warning")
                ? "warning"
                : "error";
            sendBmadLog(type, line);
          });
        });

        child.on("error", (error) => {
          bmadChildProcess = null;
          try {
            if (autoInputInterval) clearInterval(autoInputInterval);
            if (autoInputTimeout) clearTimeout(autoInputTimeout);
          } catch {}
          sendBmadLog("error", `Process error: ${error.message}`);
          resolve({
            success: false,
            code: -1,
            stdout,
            stderr: stderr || error.message,
            error,
          });
        });

        child.on("close", (code) => {
          bmadChildProcess = null;
          try {
            if (autoInputInterval) clearInterval(autoInputInterval);
            if (autoInputTimeout) clearTimeout(autoInputTimeout);
          } catch {}
          resolve({
            success: code === 0,
            code,
            stdout,
            stderr,
          });
        });
      });

    const runOncePty = (runCommand, runArgs, { autoAcceptDefaults } = {}) =>
      new Promise((resolve) => {
        sendBmadLog("info", `▶ ${runCommand} ${runArgs.join(" ")}`);

        let ptyProcess;
        try {
          ptyProcess = nodePty.spawn(runCommand, runArgs, {
            name: "xterm-color",
            cols: 120,
            rows: 30,
            cwd: workingDir,
            env: { ...process.env, FORCE_COLOR: "1" },
          });
        } catch (error) {
          sendBmadLog(
            "error",
            `Process error: ${error?.message || String(error)}`
          );
          resolve({
            success: false,
            code: -1,
            stdout: "",
            stderr: error?.message || String(error),
            error,
          });
          return;
        }

        bmadPtyProcess = ptyProcess;

        let autoInputInterval = null;
        let autoInputTimeout = null;

        if (autoAcceptDefaults && typeof ptyProcess?.write === "function") {
          autoInputInterval = setInterval(() => {
            try {
              ptyProcess.write("\r");
            } catch {}
          }, 900);

          autoInputTimeout = setTimeout(() => {
            try {
              if (autoInputInterval) clearInterval(autoInputInterval);
            } catch {}
          }, 45_000);
        }

        let output = "";
        let carry = "";
        let carryTimer = null;

        const flushCarry = () => {
          if (!carry) return;
          const cleaned = carry.replace(/\r/g, "");
          if (cleaned.trim()) sendBmadLog("info", cleaned);
          carry = "";
        };

        const scheduleCarryFlush = () => {
          if (carryTimer) clearTimeout(carryTimer);
          carryTimer = setTimeout(() => {
            carryTimer = null;
            flushCarry();
          }, 350);
        };

        const handleData = (data) => {
          const text = String(data || "");
          if (!text) return;
          output += text;

          const parts = (carry + text).split(/\r\n|\n|\r/);
          carry = parts.pop() || "";

          for (const part of parts) {
            const cleaned = String(part || "").replace(/\r/g, "");
            if (cleaned.trim()) sendBmadLog("info", cleaned);
          }

          if (carry) scheduleCarryFlush();
        };

        if (typeof ptyProcess.onData === "function") {
          ptyProcess.onData(handleData);
        } else if (typeof ptyProcess.on === "function") {
          ptyProcess.on("data", handleData);
        }

        const handleExit = (payload) => {
          bmadPtyProcess = null;
          try {
            if (carryTimer) clearTimeout(carryTimer);
            if (autoInputInterval) clearInterval(autoInputInterval);
            if (autoInputTimeout) clearTimeout(autoInputTimeout);
          } catch {}
          try {
            flushCarry();
          } catch {}

          const code =
            typeof payload?.exitCode === "number"
              ? payload.exitCode
              : typeof payload === "number"
              ? payload
              : -1;

          resolve({
            success: code === 0,
            code,
            stdout: output,
            stderr: "",
          });
        };

        if (typeof ptyProcess.onExit === "function") {
          ptyProcess.onExit(handleExit);
        } else if (typeof ptyProcess.on === "function") {
          ptyProcess.on("exit", handleExit);
        }
      });

    const ensureBmadProjectFolders = async () => {
      const expectedDirs = ["_bmad", "_config", "_bmad-output"];
      const created = [];
      for (const dirName of expectedDirs) {
        const abs = path.join(workingDir, dirName);
        try {
          await fs.promises.access(abs);
        } catch {
          try {
            await fs.promises.mkdir(abs, { recursive: true });
            created.push(dirName);
          } catch {}
        }
      }
      return created;
    };

    const finalizeInstallIfNeeded = async (result) => {
      if (!result?.success) return result;
      if (selectedAction !== "install") return result;

      const created = await ensureBmadProjectFolders();
      if (created.includes("_bmad")) {
        sendBmadLog(
          "warning",
          "BMAD installer completed but _bmad folder was missing. Created it to unblock project setup."
        );
      }
      if (created.length > 0 && !created.includes("_bmad")) {
        sendBmadLog(
          "info",
          `Created missing folders: ${created.map((d) => d).join(", ")}`
        );
      }
      if (created.length === 0) {
        sendBmadLog("success", "Found BMAD project folders: _bmad, _config");
      }
      return result;
    };

    const looksLikeMissingBmadBinary = (result, attemptedCommand) => {
      if (!attemptedCommand) return false;
      const attempted = String(attemptedCommand);
      const isBmad = attempted === "bmad" || attempted === "bmad.cmd";
      if (!isBmad) return false;

      const stderrText = String(result?.stderr || "");
      const stdoutText = String(result?.stdout || "");
      return (
        result?.code === 127 ||
        stderrText.includes("command not found") ||
        stderrText.includes("not recognized") ||
        stdoutText.includes("command not found") ||
        stdoutText.includes("not recognized")
      );
    };

    const wantsInteractive =
      Boolean(interactive) || selectedAction === "install";
    const canUsePty = Boolean(nodePty && typeof nodePty.spawn === "function");
    const runOnce = wantsInteractive && canUsePty ? runOncePty : runOnceSpawn;

    const autoAcceptDefaults =
      typeof autoAcceptDefaultsOption === "boolean"
        ? autoAcceptDefaultsOption
        : !wantsInteractive && selectedAction === "install";

    const first = await runOnce(command, args, { autoAcceptDefaults });
    if (
      !first.success &&
      selectedMode === "bmad" &&
      looksLikeMissingBmadBinary(first, command)
    ) {
      sendBmadLog(
        "warning",
        "bmad CLI not found in PATH. Falling back to npx bmad-method@alpha."
      );
      const fallbackCommand = process.platform === "win32" ? "npx.cmd" : "npx";
      const fallbackArgs = ["-y", "bmad-method@alpha", selectedAction];
      if (isVerbose) fallbackArgs.push("-v");
      fallbackArgs.push(...extra);
      const second = await runOnce(fallbackCommand, fallbackArgs, {
        autoAcceptDefaults,
      });
      if (second.success) {
        await finalizeInstallIfNeeded(second);
        sendBmadLog("success", "✅ BMAD command completed");
        return second;
      }
      sendBmadLog("error", `❌ BMAD command failed (exit ${second.code})`);
      throw new Error(
        `BMAD command failed with exit code ${second.code}` +
          (second.stderr ? `\n${second.stderr}` : "")
      );
    }

    if (first.success) {
      await finalizeInstallIfNeeded(first);
      sendBmadLog("success", "✅ BMAD command completed");
      return first;
    }

    sendBmadLog("error", `❌ BMAD command failed (exit ${first.code})`);
    throw new Error(
      `BMAD command failed with exit code ${first.code}` +
        (first.stderr ? `\n${first.stderr}` : "")
    );
  }
);

ipcMain.handle("bmad-cli-stop", async () => {
  if (bmadPtyProcess) {
    try {
      if (typeof bmadPtyProcess.kill === "function") {
        bmadPtyProcess.kill();
      }
    } catch {}
    bmadPtyProcess = null;
    sendBmadLog("warning", "Stopped BMAD command");
    return true;
  }
  if (bmadChildProcess) {
    try {
      bmadChildProcess.kill();
    } catch {}
    bmadChildProcess = null;
    sendBmadLog("warning", "Stopped BMAD command");
    return true;
  }
  return false;
});

ipcMain.handle("bmad-cli-input", async (event, payload) => {
  const input =
    payload && typeof payload === "object" ? payload.input : String(payload);
  const appendNewline =
    payload && typeof payload === "object"
      ? payload.appendNewline !== false
      : true;

  if (bmadPtyProcess && typeof bmadPtyProcess.write === "function") {
    try {
      bmadPtyProcess.write(
        `${String(input || "")}${appendNewline ? "\r" : ""}`
      );
      return true;
    } catch {
      return false;
    }
  }

  if (bmadChildProcess?.stdin?.writable) {
    try {
      bmadChildProcess.stdin.write(
        `${String(input || "")}${appendNewline ? "\n" : ""}`
      );
      return true;
    } catch {
      return false;
    }
  }

  return false;
});

ipcMain.handle("get-bmad-logs", () => {
  return bmadLogBuffer;
});

ipcMain.handle("get-scrum-state", async () => {
  return scrumStore.get("scrumState", null);
});

ipcMain.handle("set-scrum-state", async (event, nextState) => {
  scrumStore.set("scrumState", nextState);
  return scrumStore.get("scrumState", null);
});

// MCP Server Control
ipcMain.handle("mcp-server-start", () => {
  startMcpServer();
  return true;
});

ipcMain.handle("mcp-server-stop", () => {
  stopMcpServer();
  return true;
});

ipcMain.handle("get-mcp-logs", () => {
  return mcpLogBuffer;
});

ipcMain.handle("mcp-server-status", () => {
  return serverRunning;
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

  // Auto-start MCP Server
  startMcpServer();

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
  stopMcpServer();
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
