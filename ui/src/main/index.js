const {
  app,
  BrowserWindow,
  BrowserView,
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

const browserViews = new Map();
let activeBrowserTabId = null;
const browserBoundsCache = new Map();

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

function notifyBrowserState(tabId) {
  const view = browserViews.get(tabId);
  if (!view || !mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send("browserview-state", {
    tabId,
    url: view.webContents.getURL(),
    canGoBack: view.webContents.canGoBack(),
    canGoForward: view.webContents.canGoForward(),
  });
}

function ensureBrowserView(tabId) {
  const existing = browserViews.get(tabId);
  if (existing && !existing.webContents.isDestroyed()) return existing;

  const view = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  view.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  view.webContents.on("did-navigate", () => notifyBrowserState(tabId));
  view.webContents.on("did-navigate-in-page", () => notifyBrowserState(tabId));
  view.webContents.on("did-start-navigation", () => notifyBrowserState(tabId));
  view.webContents.on("did-finish-load", () => notifyBrowserState(tabId));

  browserViews.set(tabId, view);
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (typeof mainWindow.addBrowserView === "function") {
      mainWindow.addBrowserView(view);
    } else {
      mainWindow.setBrowserView(view);
    }
  }

  return view;
}

function hideBrowserView(tabId) {
  const view = browserViews.get(tabId);
  if (!view || view.webContents.isDestroyed()) return;
  view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
}

function showBrowserView(tabId) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  activeBrowserTabId = tabId;
  for (const [id] of browserViews.entries()) {
    if (id !== tabId) hideBrowserView(id);
  }

  const view = ensureBrowserView(tabId);
  const bounds = browserBoundsCache.get(tabId);
  if (bounds) view.setBounds(bounds);
  notifyBrowserState(tabId);
}

function destroyBrowserView(tabId) {
  const view = browserViews.get(tabId);
  if (!view) return;
  browserViews.delete(tabId);
  browserBoundsCache.delete(tabId);
  if (activeBrowserTabId === tabId) activeBrowserTabId = null;

  if (mainWindow && !mainWindow.isDestroyed()) {
    if (typeof mainWindow.removeBrowserView === "function") {
      try {
        mainWindow.removeBrowserView(view);
      } catch {}
    }
  }

  try {
    view.webContents.destroy();
  } catch {}
}

ipcMain.handle("browserview-create", async (event, { tabId, url }) => {
  const view = ensureBrowserView(tabId);
  if (url) {
    await view.webContents.loadURL(url);
  }
  return true;
});

ipcMain.handle("browserview-show", async (event, { tabId }) => {
  showBrowserView(tabId);
  return true;
});

ipcMain.handle("browserview-hide-all", async () => {
  activeBrowserTabId = null;
  for (const [id] of browserViews.entries()) hideBrowserView(id);
  return true;
});

ipcMain.handle("browserview-destroy", async (event, { tabId }) => {
  destroyBrowserView(tabId);
  return true;
});

ipcMain.handle("browserview-set-bounds", async (event, { tabId, bounds }) => {
  if (!bounds) return false;
  browserBoundsCache.set(tabId, bounds);
  if (activeBrowserTabId !== tabId) return true;
  const view = ensureBrowserView(tabId);
  view.setBounds(bounds);
  return true;
});

ipcMain.handle("browserview-load-url", async (event, { tabId, url }) => {
  const view = ensureBrowserView(tabId);
  await view.webContents.loadURL(url);
  return true;
});

ipcMain.handle("browserview-go-back", async (event, { tabId }) => {
  const view = browserViews.get(tabId);
  if (!view || view.webContents.isDestroyed()) return false;
  if (view.webContents.canGoBack()) view.webContents.goBack();
  return true;
});

ipcMain.handle("browserview-go-forward", async (event, { tabId }) => {
  const view = browserViews.get(tabId);
  if (!view || view.webContents.isDestroyed()) return false;
  if (view.webContents.canGoForward()) view.webContents.goForward();
  return true;
});

ipcMain.handle("browserview-reload", async (event, { tabId }) => {
  const view = browserViews.get(tabId);
  if (!view || view.webContents.isDestroyed()) return false;
  view.webContents.reload();
  return true;
});

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

    const normalizedRoot = path.resolve(resolvedRoot);
    const target = path.resolve(normalizedRoot, rel);
    const rootPrefix = normalizedRoot.endsWith(path.sep)
      ? normalizedRoot
      : normalizedRoot + path.sep;
    if (!target.startsWith(rootPrefix)) {
      throw new Error("Refusing to read outside projectRoot");
    }

    const limit =
      typeof maxBytes === "number" && Number.isFinite(maxBytes) && maxBytes > 0
        ? Math.floor(maxBytes)
        : 250_000;

    try {
      const stat = await fs.promises.stat(target);
      if (stat.size > limit) {
        return {
          success: false,
          path: target,
          message: `File too large to preview (${stat.size} bytes)`,
        };
      }

      const content = await fs.promises.readFile(target, "utf8");
      return { success: true, path: target, content };
    } catch (err) {
      const code = String(err?.code || "").trim();
      if (code === "ENOENT") {
        return {
          success: false,
          path: target,
          message: `File not found: ${rel}`,
          code,
        };
      }
      return {
        success: false,
        path: target,
        message: err?.message || String(err),
        code: code || undefined,
      };
    }
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

    const BMAD_NPX_PACKAGE = "bmad-method@alpha";
    const getBmadFolderStatus = async () => {
      const folders = ["_bmad", "_config"];
      const results = await Promise.all(
        folders.map(async (folder) => {
          const target = path.join(workingDir, folder);
          try {
            const stat = await fs.promises.stat(target);
            return { folder, exists: stat.isDirectory(), target };
          } catch {
            return { folder, exists: false, target };
          }
        })
      );

      const installed = results.every((r) => r.exists);
      const lines = ["▶ local folder check"];
      for (const r of results) {
        lines.push(`${r.folder}: ${r.exists ? "present" : "missing"}`);
      }
      if (!installed) {
        lines.push(
          "BMAD appears not installed (expected _bmad and _config directories)."
        );
      }

      for (const line of lines) sendBmadLog("info", line);

      return {
        success: installed,
        code: installed ? 0 : 1,
        stdout: `${lines.join("\n")}\n`,
        stderr: "",
      };
    };

    const resolveLocalCliBinary = async (binBaseName) => {
      const safeBase = String(binBaseName || "").trim();
      if (!safeBase) return null;
      const binName =
        process.platform === "win32" ? `${safeBase}.cmd` : safeBase;
      const candidate = path.join(workingDir, "node_modules", ".bin", binName);
      try {
        await fs.promises.access(candidate);
        return candidate;
      } catch {
        return null;
      }
    };

    const runLocalWorkflow = async () => {
      const rawArgs = Array.isArray(extraArgs) ? extraArgs : [];
      const nameRaw = String(rawArgs[0] || "").trim();
      if (!nameRaw) {
        const message = "Workflow name is required";
        sendBmadLog("error", message);
        return { success: false, code: 1, stdout: "", stderr: message };
      }

      const normalizeWorkflowName = (value) => {
        const v = String(value || "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/_/g, "-");
        if (!v) return "";
        if (v === "create-product-brief") return "product-brief";
        if (v === "create-ux-design") return "ux-design";
        if (v === "create-architecture") return "architecture";
        if (v === "create-epics-and-stories") return "stories";
        if (v === "check-implementation-readiness")
          return "implementation-readiness";
        if (v === "brainstorming") return "brainstorm";
        if (v === "brainstorm-project") return "brainstorm";
        return v;
      };

      const workflowName = normalizeWorkflowName(nameRaw);
      const args = rawArgs.slice(1).map((a) => String(a));

      const parseOptionValues = (flag) => {
        const values = [];
        for (let i = 0; i < args.length; i++) {
          if (args[i] !== flag) continue;
          const next = args[i + 1];
          if (next && !String(next).startsWith("--")) {
            values.push(String(next));
            i += 1;
          }
        }
        return values;
      };

      const inputs = parseOptionValues("--input");
      const types = parseOptionValues("--type");
      const datas = parseOptionValues("--data");

      const resolveProjectPath = (value) => {
        const raw = String(value || "").trim();
        if (!raw) return "";
        const candidate = path.isAbsolute(raw)
          ? raw
          : path.join(workingDir, raw);
        const rel = path.relative(workingDir, candidate);
        if (rel.startsWith("..") || path.isAbsolute(rel)) {
          return "";
        }
        return candidate;
      };

      const resolvedInputs = inputs
        .map((p) => ({ raw: p, abs: resolveProjectPath(p) }))
        .filter((p) => p.abs);
      const resolvedData = datas
        .map((p) => ({ raw: p, abs: resolveProjectPath(p) }))
        .filter((p) => p.abs);

      const readIfExists = async (absPath) => {
        if (!absPath) return "";
        try {
          return await fs.promises.readFile(absPath, "utf8");
        } catch {
          return "";
        }
      };

      const buildTemplate = async () => {
        const header = `# ${workflowName}`;
        const blocks = [header, ""];

        if (types.length || resolvedInputs.length || resolvedData.length) {
          blocks.push("## Inputs", "");
          if (types.length) blocks.push(`- type: ${types.join(", ")}`);
          for (const item of resolvedInputs)
            blocks.push(`- input: ${item.raw}`);
          for (const item of resolvedData) blocks.push(`- data: ${item.raw}`);
          blocks.push("");
        }

        if (workflowName === "product-brief") {
          blocks.push(
            "## Vision",
            "(fill in)",
            "",
            "## Target Users",
            "- (fill in)",
            "",
            "## Value Proposition",
            "(fill in)",
            "",
            "## Goals",
            "- (fill in)",
            "",
            "## Non-Goals",
            "- (fill in)",
            "",
            "## Differentiators",
            "- (fill in)",
            ""
          );
        } else if (workflowName === "prd") {
          blocks.push(
            "## Overview",
            "(fill in)",
            "",
            "## Functional Requirements",
            "- (fill in)",
            "",
            "## Non-Functional Requirements",
            "- (fill in)",
            "",
            "## Epics & Stories",
            "- (fill in)",
            ""
          );
        } else if (workflowName === "ux-design" || workflowName === "ux-spec") {
          blocks.push(
            "## UX Goals",
            "(fill in)",
            "",
            "## Key Flows",
            "- (fill in)",
            "",
            "## Screens",
            "- (fill in)",
            "",
            "## Accessibility",
            "- (fill in)",
            ""
          );
        } else if (
          workflowName === "architecture" ||
          workflowName === "solution-architecture"
        ) {
          blocks.push(
            "## Overview",
            "(fill in)",
            "",
            "## Components",
            "- (fill in)",
            "",
            "## Data Flows",
            "- (fill in)",
            "",
            "## Integrations",
            "- (fill in)",
            "",
            "## Key Decisions",
            "- (fill in)",
            ""
          );
        } else if (workflowName === "research") {
          blocks.push(
            "## Findings",
            "- (fill in)",
            "",
            "## Sources",
            "- (fill in)",
            "",
            "## Risks",
            "- (fill in)",
            ""
          );
        } else if (workflowName === "brainstorm") {
          blocks.push(
            "## Problem",
            "(fill in)",
            "",
            "## Ideas",
            "- (fill in)",
            "",
            "## Constraints",
            "- (fill in)",
            ""
          );
        } else if (workflowName === "stories") {
          blocks.push(
            "## Epics",
            "- (fill in)",
            "",
            "## Stories",
            "- (fill in)",
            ""
          );
        } else if (workflowName === "implementation-readiness") {
          blocks.push(
            "## Checklist",
            "- [ ] PRD ready",
            "- [ ] UX ready (if applicable)",
            "- [ ] Architecture ready (if applicable)",
            "- [ ] Stories ready",
            ""
          );
        } else {
          blocks.push("## Output", "(fill in)", "");
        }

        const inputContent = await Promise.all(
          resolvedInputs.map(async (item) => {
            const content = await readIfExists(item.abs);
            if (!content) return null;
            return { label: item.raw, content };
          })
        );

        const dataContent = await Promise.all(
          resolvedData.map(async (item) => {
            const content = await readIfExists(item.abs);
            if (!content) return null;
            return { label: item.raw, content };
          })
        );

        const referenced = [...inputContent, ...dataContent].filter(Boolean);
        if (referenced.length) {
          blocks.push("## Reference", "");
          for (const ref of referenced) {
            blocks.push(`### ${ref.label}`, "", ref.content.trim(), "");
          }
        }

        return blocks.join("\n");
      };

      const outputRelByWorkflow = {
        brainstorm: "_bmad-output/brainstorm.md",
        research: "_bmad-output/research.md",
        "product-brief": "_bmad-output/product-brief.md",
        prd: "_bmad-output/prd.md",
        "ux-design": "_bmad-output/ux-design.md",
        "ux-spec": "_bmad-output/ux-design.md",
        "tech-spec": "_bmad-output/tech-spec.md",
        architecture: "_bmad-output/architecture.md",
        "solution-architecture": "_bmad-output/architecture.md",
        stories: "_bmad-output/stories.md",
        "implementation-readiness": "_bmad-output/implementation-readiness.md",
      };

      const toSafeWorkflowFileBase = (value) => {
        const safe = String(value || "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/_/g, "-")
          .replace(/[^a-z0-9._-]+/g, "-")
          .replace(/^-+/, "")
          .replace(/-+$/, "")
          .slice(0, 80);
        if (!safe || safe.includes("..")) return "";
        return safe;
      };

      let outputRel = outputRelByWorkflow[workflowName] || "";
      if (!outputRel) {
        const safeBase = toSafeWorkflowFileBase(workflowName);
        if (!safeBase) {
          const message = `Unsupported workflow: ${nameRaw}`;
          sendBmadLog("error", message);
          return { success: false, code: 1, stdout: "", stderr: message };
        }
        outputRel = `_bmad-output/${safeBase}.md`;
      }

      const outputAbs = path.join(workingDir, outputRel);
      await fs.promises.mkdir(path.dirname(outputAbs), { recursive: true });

      sendBmadLog("info", `▶ workflow ${nameRaw}`);
      const content = await buildTemplate();
      await fs.promises.writeFile(outputAbs, content, "utf8");
      sendBmadLog("success", `Wrote ${outputRel}`);

      return {
        success: true,
        code: 0,
        stdout: `Wrote ${outputRel}\n`,
        stderr: "",
      };
    };

    if (selectedMode === "npx" && selectedAction === "status") {
      return await getBmadFolderStatus();
    }

    if (selectedAction === "workflow") {
      return await runLocalWorkflow();
    }

    let command;
    let args;

    const isWorkflowAction = selectedAction === "workflow";

    if (selectedMode === "bmad") {
      const baseCommand = isWorkflowAction ? "workflow" : "bmad";
      command =
        process.platform === "win32" ? `${baseCommand}.cmd` : baseCommand;
      const localBin = await resolveLocalCliBinary(baseCommand);
      if (localBin) command = localBin;

      if (isWorkflowAction) {
        args = [...extra];
      } else {
        args = [selectedAction];
        if (selectedAction === "install") {
          const mods = Array.isArray(moduleCodes) ? moduleCodes : [];
          if (mods.length > 0) args.push("-m", ...mods);
        }
        args.push(...extra);
      }
    } else {
      command = process.platform === "win32" ? "npx.cmd" : "npx";
      if (isWorkflowAction) {
        args = ["-y", "--package", BMAD_NPX_PACKAGE, "workflow", ...extra];
      } else {
        args = ["-y", "--package", BMAD_NPX_PACKAGE, "bmad", selectedAction];
        if (selectedAction === "install") {
          const mods = Array.isArray(moduleCodes) ? moduleCodes : [];
          if (mods.length > 0) args.push("-m", ...mods);
        }
        args.push(...extra);
      }
    }

    const maybeRetryWithoutVerbose = async (result, runCommand, runArgs) => {
      if (!isVerbose) return result;
      if (!Array.isArray(runArgs) || !runArgs.includes("-v")) return result;
      const combined = `${String(result?.stdout || "")}\n${String(
        result?.stderr || ""
      )}`;
      if (!/unknown option ['"]-v['"]/i.test(combined)) return result;
      const nextArgs = runArgs.filter((a) => a !== "-v");
      return await runOnce(runCommand, nextArgs, { autoAcceptDefaults });
    };

    const maybeFallbackStatus = async (result) => {
      if (selectedAction !== "status") return null;
      const combined = `${String(result?.stdout || "")}\n${String(
        result?.stderr || ""
      )}`;
      if (!/unknown command ['"]status['"]/i.test(combined)) return null;
      return await getBmadFolderStatus();
    };

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

        child.on("close", (code, signal) => {
          bmadChildProcess = null;
          try {
            if (autoInputInterval) clearInterval(autoInputInterval);
            if (autoInputTimeout) clearTimeout(autoInputTimeout);
          } catch {}
          const normalizedCode = typeof code === "number" ? code : -1;
          const normalizedStderr =
            stderr || (signal ? `Process terminated (${signal})` : "");
          resolve({
            success: normalizedCode === 0,
            code: normalizedCode,
            stdout,
            stderr: normalizedStderr,
            signal,
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

    const looksLikeMissingCliBinary = (result, attemptedCommand) => {
      if (!attemptedCommand) return false;
      const attempted = String(attemptedCommand);
      const base = path.basename(attempted).toLowerCase();
      const isKnownCli =
        base === "bmad" ||
        base === "bmad.cmd" ||
        base === "workflow" ||
        base === "workflow.cmd";
      if (!isKnownCli) return false;

      const stderrText = String(result?.stderr || "");
      const stdoutText = String(result?.stdout || "");
      const combined = `${stdoutText}\n${stderrText}`.toLowerCase();
      return (
        result?.code === 127 ||
        combined.includes("command not found") ||
        combined.includes("not recognized") ||
        combined.includes("enoent") ||
        combined.includes("file not found")
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

    let first = await runOnce(command, args, { autoAcceptDefaults });
    first = await maybeRetryWithoutVerbose(first, command, args);

    const statusFromFirst = await maybeFallbackStatus(first);
    if (statusFromFirst) return statusFromFirst;

    if (
      !first.success &&
      selectedMode === "bmad" &&
      looksLikeMissingCliBinary(first, command)
    ) {
      sendBmadLog(
        "warning",
        `bmad CLI not found in PATH. Falling back to npx ${BMAD_NPX_PACKAGE}.`
      );
      const fallbackCommand = process.platform === "win32" ? "npx.cmd" : "npx";
      const fallbackArgs = ["-y", "--package", BMAD_NPX_PACKAGE];

      if (isWorkflowAction) {
        fallbackArgs.push("workflow", ...extra);
      } else {
        fallbackArgs.push("bmad", selectedAction);
        if (selectedAction === "install") {
          const mods = Array.isArray(moduleCodes) ? moduleCodes : [];
          if (mods.length > 0) fallbackArgs.push("-m", ...mods);
        }
        fallbackArgs.push(...extra);
      }

      let second = await runOnce(fallbackCommand, fallbackArgs, {
        autoAcceptDefaults,
      });

      const statusFromSecond = await maybeFallbackStatus(second);
      if (statusFromSecond) return statusFromSecond;

      if (second.success) {
        await finalizeInstallIfNeeded(second);
        sendBmadLog("success", "✅ BMAD command completed");
        return second;
      }
      sendBmadLog("error", `❌ BMAD command failed (exit ${second.code})`);
      return second;
    }

    if (first.success) {
      await finalizeInstallIfNeeded(first);
      sendBmadLog("success", "✅ BMAD command completed");
      return first;
    }

    sendBmadLog("error", `❌ BMAD command failed (exit ${first.code})`);
    return first;
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
