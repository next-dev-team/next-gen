const {
  app,
  BrowserWindow,
  BrowserView,
  Menu,
  Tray,
  globalShortcut,
  ipcMain,
  nativeImage,
  powerMonitor,
  shell,
  dialog,
  desktopCapturer,
  screen,
  systemPreferences,
  Notification,
} = require("electron");
const os = require("os");
const path = require("path");
const { spawn, fork } = require("child_process");
const fs = require("fs");
const Conf = require("conf");

// Anti-detection module for browser fingerprinting protection
const antiDetection = require("./anti-detection");

// ============================================
// GLOBAL ERROR HANDLERS (Crash Prevention)
// ============================================

// Catch uncaught exceptions - prevents app from crashing
process.on("uncaughtException", (error) => {
  console.error("[CRITICAL] Uncaught Exception:", error);
  // In production, log to file or error reporting service
  // Don't exit - try to keep the app running
});

// Catch unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("[WARNING] Unhandled Promise Rejection:", reason);
  // Don't crash on unhandled rejections
});

// Handle GPU process crashes
app.on("gpu-process-crashed", (event, killed) => {
  console.error("[GPU] GPU process crashed, killed:", killed);
});

// Handle child process crashes
app.on("child-process-gone", (event, details) => {
  console.error("[Process] Child process gone:", details.type, details.reason);
});

const scrumStore = new Conf({ projectName: "next-gen-scrum" });
const resolveMcpServerPath = () => {
  const packagedCandidates = [
    path.join(app.getAppPath(), "scripts", "scrum-mcp-server.js"),
    path.join(process.resourcesPath, "scripts", "scrum-mcp-server.js"),
    path.join(path.dirname(app.getAppPath()), "scripts", "scrum-mcp-server.js"),
  ];

  const devCandidates = [
    path.join(__dirname, "../../scripts/scrum-mcp-server.js"),
  ];

  const candidates = app.isPackaged
    ? [...packagedCandidates, ...devCandidates]
    : [...devCandidates, ...packagedCandidates];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {}
  }

  return candidates[0];
};

const mcpServer = require(resolveMcpServerPath());

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
let tray = null;
let isQuitting = false;
let registeredQuickToggleShortcut = null;
let trayClickTimer = null;

const DEFAULT_QUICK_TOGGLE_SHORTCUT = "CommandOrControl+Shift+Space";

const browserViews = new Map();
let activeBrowserTabId = null;
const browserBoundsCache = new Map();
const browserPopupStatsByTabId = new Map();

let adblockEnabledCache = null;
let adblockerPromise = null;

async function ensureAdblocker() {
  if (adblockerPromise) return adblockerPromise;
  adblockerPromise = (async () => {
    if (!app.isReady()) {
      try {
        await app.whenReady();
      } catch {}
    }

    const mod = await import("@ghostery/adblocker-electron");
    const ElectronBlocker = mod?.ElectronBlocker;
    if (!ElectronBlocker) throw new Error("ElectronBlocker not available");

    const fetchImpl = (() => {
      const f = globalThis.fetch;
      return typeof f === "function" ? f.bind(globalThis) : null;
    })();

    const resolvedFetch =
      fetchImpl ||
      (await import("cross-fetch")).default ||
      (await import("cross-fetch")).fetch;

    const enginePath = path.join(
      app.getPath("userData"),
      "adblocker-engine.bin",
    );
    const fsPromises = fs.promises;

    return await ElectronBlocker.fromPrebuiltAdsAndTracking(resolvedFetch, {
      path: enginePath,
      read: fsPromises.readFile,
      write: fsPromises.writeFile,
    });
  })();
  return adblockerPromise;
}

async function getAdblockEnabled() {
  if (adblockEnabledCache != null) return Boolean(adblockEnabledCache);
  const currentStore = await getStore();
  adblockEnabledCache = currentStore.get("adblockEnabled", true);
  return Boolean(adblockEnabledCache);
}

function sendAdblockState(enabled) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("adblock-state", { enabled: Boolean(enabled) });
  }
}

async function applyAdblockToSession(ses) {
  if (!ses) return;
  const enabled = await getAdblockEnabled();

  if (!enabled) {
    if (!adblockerPromise) return;
    try {
      const blocker = await adblockerPromise;
      if (blocker?.isBlockingEnabled?.(ses)) {
        blocker.disableBlockingInSession(ses);
      }
    } catch {}
    return;
  }

  try {
    const blocker = await ensureAdblocker();
    if (!blocker?.isBlockingEnabled?.(ses)) {
      blocker.enableBlockingInSession(ses);
    }
  } catch {}
}

async function setAdblockEnabled(enabled) {
  const next = Boolean(enabled);
  adblockEnabledCache = next;
  const currentStore = await getStore();
  currentStore.set("adblockEnabled", next);

  if (next) {
    for (const view of browserViews.values()) {
      try {
        if (!view || view.webContents.isDestroyed()) continue;
        await applyAdblockToSession(view.webContents.session);
      } catch {}
    }
  } else {
    if (adblockerPromise) {
      for (const view of browserViews.values()) {
        try {
          if (!view || view.webContents.isDestroyed()) continue;
          await applyAdblockToSession(view.webContents.session);
        } catch {}
      }
    }
  }

  sendAdblockState(next);
  return next;
}

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

function ensureNodePtySpawnHelpersExecutable() {
  if (process.platform !== "darwin") return;
  let pkgDir = "";
  try {
    pkgDir = path.dirname(require.resolve("node-pty/package.json"));
  } catch {
    pkgDir = "";
  }
  if (!pkgDir) return;

  const prebuildsDir = path.join(pkgDir, "prebuilds");
  const candidates = [];

  try {
    const entries = fs.readdirSync(prebuildsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry?.isDirectory?.()) continue;
      const name = String(entry.name || "");
      if (!name.startsWith("darwin-")) continue;
      candidates.push(path.join(prebuildsDir, name, "spawn-helper"));
    }
  } catch {}

  if (candidates.length === 0) {
    candidates.push(
      path.join(prebuildsDir, `darwin-${process.arch}`, "spawn-helper"),
      path.join(prebuildsDir, "darwin-arm64", "spawn-helper"),
      path.join(prebuildsDir, "darwin-x64", "spawn-helper"),
    );
  }

  for (const filePath of candidates) {
    const target = String(filePath || "");
    if (!target) continue;
    try {
      const stat = fs.statSync(target);
      const nextMode = stat.mode | 0o111;
      if (nextMode !== stat.mode) fs.chmodSync(target, nextMode);
    } catch {}
  }
}

if (nodePty) {
  ensureNodePtySpawnHelpersExecutable();
}

function buildAugmentedPath(rawPath) {
  const current = String(rawPath || "");
  const parts = current
    .split(path.delimiter)
    .map((p) => String(p || "").trim())
    .filter(Boolean);

  const home = (() => {
    try {
      return os.homedir();
    } catch {
      return "";
    }
  })();

  const prepend = [];
  if (process.platform === "darwin") {
    prepend.push(
      "/opt/homebrew/bin",
      "/opt/homebrew/sbin",
      "/usr/local/bin",
      "/usr/local/sbin",
    );
  }

  if (home) {
    prepend.push(
      path.join(home, ".volta", "bin"),
      path.join(home, ".asdf", "shims"),
    );
  }

  prepend.push("/usr/bin", "/bin", "/usr/sbin", "/sbin");

  const seen = new Set();
  const combined = [];
  for (const entry of [...prepend, ...parts]) {
    if (!entry) continue;
    const normalized = entry.replace(/\/+$/g, "");
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    combined.push(normalized);
  }

  return combined.join(path.delimiter);
}

async function isExecutable(filePath) {
  const abs = String(filePath || "");
  if (!abs) return false;
  try {
    await fs.promises.access(abs, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveExecutableOnPath(binName, envPath) {
  const name = String(binName || "").trim();
  if (!name) return null;
  if (path.isAbsolute(name) || name.includes(path.sep)) {
    return (await isExecutable(name)) ? name : null;
  }

  const searchPath = String(envPath || "");
  const dirs = searchPath
    .split(path.delimiter)
    .map((p) => String(p || "").trim())
    .filter(Boolean);

  for (const dir of dirs) {
    const candidate = path.join(dir, name);
    if (await isExecutable(candidate)) return candidate;
  }

  return null;
}

async function resolveDarwinNpxFallback() {
  if (process.platform !== "darwin") return null;
  const home = (() => {
    try {
      return os.homedir();
    } catch {
      return "";
    }
  })();
  if (!home) return null;

  const directCandidates = [
    path.join(home, ".volta", "bin", "npx"),
    path.join(home, ".asdf", "shims", "npx"),
  ];

  for (const candidate of directCandidates) {
    if (await isExecutable(candidate)) return candidate;
  }

  const nvmVersionsDir = path.join(home, ".nvm", "versions", "node");
  let entries = [];
  try {
    entries = await fs.promises.readdir(nvmVersionsDir, {
      withFileTypes: true,
    });
  } catch {
    entries = [];
  }

  const versionDirs = entries
    .filter((d) => d && d.isDirectory && d.isDirectory())
    .map((d) => String(d.name || "").trim())
    .filter(Boolean)
    .sort()
    .reverse();

  for (const versionDir of versionDirs) {
    const candidate = path.join(nvmVersionsDir, versionDir, "bin", "npx");
    if (await isExecutable(candidate)) return candidate;
  }

  return null;
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

async function getRunInBackground() {
  const currentStore = await getStore();
  return currentStore.get("runInBackground", true);
}

function sendSettingsChanged(key, value) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send("settings-changed", { key, value });
}

function sendVisibilityChanged() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  mainWindow.webContents.send("app-visibility-changed", {
    visible: mainWindow.isVisible(),
    focused: mainWindow.isFocused(),
    minimized: mainWindow.isMinimized(),
  });
}

function safeShowWindow(windowInstance) {
  if (!windowInstance || windowInstance.isDestroyed()) return;
  try {
    if (windowInstance.isMinimized()) windowInstance.restore();
  } catch {}
  try {
    windowInstance.setSkipTaskbar(false);
  } catch {}
  try {
    windowInstance.show();
  } catch {}
  try {
    windowInstance.focus();
  } catch {}
  try {
    if (typeof windowInstance.moveTop === "function") windowInstance.moveTop();
  } catch {}
  try {
    windowInstance.setAlwaysOnTop(true);
    windowInstance.setAlwaysOnTop(false);
  } catch {}
  setTimeout(() => {
    if (!windowInstance || windowInstance.isDestroyed()) return;
    try {
      windowInstance.show();
      windowInstance.focus();
    } catch {}
    sendVisibilityChanged();
    updateTrayMenu().catch(() => {});
  }, 50);
}

function safeHideWindow(windowInstance) {
  if (!windowInstance || windowInstance.isDestroyed()) return;
  try {
    windowInstance.setSkipTaskbar(true);
  } catch {}
  try {
    windowInstance.hide();
  } catch {}
  sendVisibilityChanged();
  updateTrayMenu().catch(() => {});
}

function createWindow({ show = true } = {}) {
  const shouldShow = Boolean(show);
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0f172a",
    show: false,
    skipTaskbar: true,
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

  mainWindow.once("ready-to-show", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (shouldShow) safeShowWindow(mainWindow);
    updateTrayMenu().catch(() => {});
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.on("show", sendVisibilityChanged);
  mainWindow.on("hide", sendVisibilityChanged);
  mainWindow.on("focus", sendVisibilityChanged);
  mainWindow.on("blur", sendVisibilityChanged);
  mainWindow.on("minimize", sendVisibilityChanged);
  mainWindow.on("restore", sendVisibilityChanged);

  mainWindow.on("close", async (event) => {
    if (isQuitting) return;

    if (shouldBlockWindowCloseForMandatoryUpdate()) {
      event.preventDefault();
      try {
        safeShowWindow(mainWindow);
      } catch {}
      showMandatoryUpdateGate().catch(() => {});
      return;
    }
    const runInBackground = await getRunInBackground();
    if (!runInBackground) return;

    event.preventDefault();
    safeHideWindow(mainWindow);
  });
}

function resolveTrayIcon() {
  const packagedCandidates = [
    path.join(
      process.resourcesPath,
      "turbo",
      "generators",
      "templates",
      "rnr-expo",
      "assets",
      "images",
      "favicon.png",
    ),
    path.join(
      process.resourcesPath,
      "turbo",
      "generators",
      "templates",
      "rnr-uniwind",
      "assets",
      "images",
      "favicon.png",
    ),
  ];

  const devCandidates = [
    path.resolve(
      __dirname,
      "../../../turbo/generators/templates/rnr-expo/assets/images/favicon.png",
    ),
    path.resolve(
      __dirname,
      "../../../turbo/generators/templates/rnr-uniwind/assets/images/favicon.png",
    ),
  ];

  const candidates = app.isPackaged
    ? [...packagedCandidates, ...devCandidates]
    : [...devCandidates, ...packagedCandidates];

  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const image = nativeImage.createFromPath(candidate);
      if (image && !image.isEmpty()) {
        const size = process.platform === "darwin" ? 18 : 16;
        return image.resize({ width: size, height: size });
      }
    } catch {}
  }

  return nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAABmSURBVHgB7ZKxDYAwCENzJ3EFd3AEZ3AEZ3AEZ7DgQi1KM3pZVj9kqUQy4X5y0KcQ7mGdR1gHQQQyQq0v7z0yWmWcX4q8WwWQjT2QbC7a0g6y9mYp+Qb9b7QxQy2lQAAAABJRU5ErkJggg==",
  );
}

async function updateTrayMenu() {
  if (!tray) return;
  const currentStore = await getStore();
  const startOnBoot = currentStore.get("startOnBoot", false);

  const hasWindow = Boolean(mainWindow && !mainWindow.isDestroyed());
  const isVisible = hasWindow ? mainWindow.isVisible() : false;

  const contextMenu = Menu.buildFromTemplate([
    { label: "Show App", enabled: !isVisible, click: showMainWindow },
    {
      label: "Hide App",
      enabled: isVisible,
      click: () => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        try {
          mainWindow.setSkipTaskbar(true);
          mainWindow.hide();
        } catch {}
        sendVisibilityChanged();
        updateTrayMenu().catch(() => {});
      },
    },
    { type: "separator" },
    {
      label: "Start on Boot",
      type: "checkbox",
      checked: Boolean(startOnBoot),
      click: async (menuItem) => {
        const enabled = Boolean(menuItem.checked);
        currentStore.set("startOnBoot", enabled);
        const loginSettings = {
          openAtLogin: enabled,
          args: ["--background"],
        };
        if (process.platform === "darwin") {
          loginSettings.openAsHidden = true;
        }
        app.setLoginItemSettings(loginSettings);
        sendSettingsChanged("startOnBoot", enabled);
        updateTrayMenu().catch(() => {});
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

function ensureTray() {
  if (tray) return tray;

  const icon = resolveTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip("Next Gen");

  updateTrayMenu().catch(() => {});

  tray.on("click", () => {
    if (trayClickTimer) clearTimeout(trayClickTimer);
    trayClickTimer = setTimeout(() => {
      trayClickTimer = null;
      toggleMainWindowVisibility();
    }, 250);
  });

  tray.on("double-click", () => {
    if (trayClickTimer) {
      clearTimeout(trayClickTimer);
      trayClickTimer = null;
    }
    toggleMainWindowVisibility();
  });

  return tray;
}

async function getQuickToggleShortcut() {
  const currentStore = await getStore();
  return currentStore.get("quickToggleShortcut", DEFAULT_QUICK_TOGGLE_SHORTCUT);
}

async function getQuickToggleEnabled() {
  const currentStore = await getStore();
  return currentStore.get("quickToggleEnabled", true);
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow({ show: true });
    return;
  }
  safeShowWindow(mainWindow);
}

function toggleMainWindowVisibility() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    showMainWindow();
    return;
  }

  if (mainWindow.isVisible()) {
    safeHideWindow(mainWindow);
  } else {
    showMainWindow();
  }
}

async function registerQuickToggleShortcut() {
  const enabled = await getQuickToggleEnabled();

  if (!enabled) {
    if (registeredQuickToggleShortcut) {
      try {
        globalShortcut.unregister(registeredQuickToggleShortcut);
      } catch {}
      registeredQuickToggleShortcut = null;
    }
    return;
  }

  const shortcut = await getQuickToggleShortcut();
  const normalized =
    String(shortcut || "").trim() || DEFAULT_QUICK_TOGGLE_SHORTCUT;

  if (
    registeredQuickToggleShortcut &&
    registeredQuickToggleShortcut !== normalized
  ) {
    try {
      globalShortcut.unregister(registeredQuickToggleShortcut);
    } catch {}
    registeredQuickToggleShortcut = null;
  }

  if (registeredQuickToggleShortcut === normalized) return;

  try {
    const ok = globalShortcut.register(normalized, toggleMainWindowVisibility);
    if (ok) registeredQuickToggleShortcut = normalized;
  } catch {
    registeredQuickToggleShortcut = null;
  }
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

function getTabIdForWebContents(sender) {
  if (!sender || typeof sender.id !== "number") return null;
  for (const [tabId, view] of browserViews.entries()) {
    if (!view || view.webContents.isDestroyed()) continue;
    if (view.webContents.id === sender.id) return tabId;
  }
  return null;
}

async function ensureBrowserView(tabId, options = {}) {
  const existing = browserViews.get(tabId);
  if (existing && !existing.webContents.isDestroyed()) {
    console.log(`[Main] Returning existing BrowserView for tab ${tabId}`);
    return existing;
  }

  const antiDetectSession = await antiDetection.createAntiDetectionSession(
    tabId,
    options.profileId || null,
  );

  if (antiDetectSession) {
    console.log(
      `[Main] Session created for tab ${tabId}: ${antiDetectSession.getStoragePath() || "memory"}`,
    );
  } else {
    console.error(`[Main] FAILED to create session for tab ${tabId}`);
  }

  const webPreferences = {
    preload: path.join(__dirname, "../preload/browserView.js"),
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: false,
    session: antiDetectSession || undefined,
    enableRemoteModule: false,
    nativeWindowOpen: false,
    webviewTag: false,
    allowRunningInsecureContent: false,
    experimentalFeatures: false,
    webSecurity: true,
    spellcheck: false,
  };

  const view = new BrowserView({ webPreferences });

  applyAdblockToSession(view.webContents.session).catch(() => {});

  try {
    view.webContents.setBackgroundColor("#ffffff");
  } catch {}

  // Inject stealth script on navigation
  view.webContents.on(
    "did-start-navigation",
    (event, url, isInPlace, isMainFrame) => {
      if (isMainFrame) {
        notifyBrowserState(tabId);
      }
    },
  );

  view.webContents.on("did-navigate", () => notifyBrowserState(tabId));
  view.webContents.on("did-navigate-in-page", () => notifyBrowserState(tabId));

  // Inject anti-detection stealth script after page load
  view.webContents.on("did-finish-load", async () => {
    notifyBrowserState(tabId);
    // Check if webContents is still valid before injecting
    if (view.webContents.isDestroyed()) return;
    // Inject stealth script to mask automation signals
    try {
      await antiDetection.injectStealthScript(view.webContents, tabId);
    } catch (err) {
      // Only log if it's not a destroyed webContents error
      if (!String(err?.message || "").includes("destroyed")) {
        console.warn(
          "[Anti-Detection] Failed to inject stealth script:",
          err.message,
        );
      }
    }
  });

  // Also inject on DOM ready for earlier protection
  view.webContents.on("dom-ready", async () => {
    // Check if webContents is still valid before injecting
    if (view.webContents.isDestroyed()) return;
    try {
      await antiDetection.injectStealthScript(view.webContents, tabId, true); // minimal script first
    } catch (err) {
      // Ignore errors on early injection
    }
  });

  // ============================================
  // CRASH RECOVERY HANDLERS
  // ============================================

  // Handle render process crashes
  view.webContents.on("render-process-gone", (event, details) => {
    console.error(
      `[BrowserView ${tabId}] Render process gone:`,
      details.reason,
    );

    // Notify renderer about the crash
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("browserview-state", {
        tabId,
        state: "crashed",
        reason: details.reason,
      });
    }

    // For OOM or crashes, attempt to recover
    if (details.reason === "crashed" || details.reason === "oom") {
      try {
        // Reload the page to recover
        setTimeout(() => {
          if (!view.webContents.isDestroyed()) {
            view.webContents.reload();
          }
        }, 1000);
      } catch (err) {
        console.error("Failed to recover from crash:", err);
      }
    }
  });

  // Handle unresponsive webContents
  view.webContents.on("unresponsive", () => {
    console.warn(`[BrowserView ${tabId}] Page became unresponsive`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("browserview-state", {
        tabId,
        state: "unresponsive",
      });
    }
  });

  // Handle when webContents becomes responsive again
  view.webContents.on("responsive", () => {
    console.log(`[BrowserView ${tabId}] Page became responsive`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("browserview-state", {
        tabId,
        state: "responsive",
      });
    }
  });

  // ============================================
  // SECURITY HANDLERS
  // ============================================

  // Handle certificate errors - allow in dev, reject in prod
  view.webContents.on(
    "certificate-error",
    (event, url, error, certificate, callback) => {
      if (process.env.NODE_ENV === "development") {
        // In development, continue anyway
        event.preventDefault();
        callback(true);
      } else {
        // In production, use default behavior (reject)
        callback(false);
      }
    },
  );

  // Prevent navigation to dangerous protocols
  view.webContents.on("will-navigate", (event, url) => {
    try {
      const parsed = new URL(url);
      const dangerousProtocols = ["file:", "javascript:", "data:"];

      // Allow data: URLs for certain cases (like about:blank replacement)
      if (parsed.protocol === "data:" && !url.includes("<script")) {
        return; // Allow safe data URLs
      }

      if (
        dangerousProtocols.includes(parsed.protocol) &&
        parsed.protocol !== "data:"
      ) {
        console.warn(`[Security] Blocked navigation to dangerous URL: ${url}`);
        event.preventDefault();
      }
    } catch (err) {
      // Invalid URL, allow default handling
    }
  });

  // Handle new window requests securely
  view.webContents.setWindowOpenHandler(({ url, frameName, features }) => {
    try {
      const parsed = new URL(url);

      // Block dangerous protocols
      if (["javascript:", "data:", "file:"].includes(parsed.protocol)) {
        console.warn(`[Security] Blocked popup with dangerous URL: ${url}`);
        return { action: "deny" };
      }

      const prev = browserPopupStatsByTabId.get(tabId) || {
        count: 0,
        lastUrl: "",
      };
      browserPopupStatsByTabId.set(tabId, {
        count: Number(prev.count || 0) + 1,
        lastUrl: String(url || ""),
      });

      if (!adblockEnabledCache) {
        shell.openExternal(url).catch(() => {});
      }
      return { action: "deny" };
    } catch {
      return { action: "deny" };
    }
  });

  // Handle console messages for debugging
  if (process.env.NODE_ENV === "development") {
    view.webContents.on(
      "console-message",
      (event, level, message, line, sourceId) => {
        if (level >= 2) {
          // Warning or error
          console.log(`[BrowserView ${tabId}] Console:`, message);
        }
      },
    );
  }

  browserViews.set(tabId, view);

  attachBrowserView(view);

  return view;
}

function isBrowserViewAttached(view) {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  if (typeof mainWindow.getBrowserViews === "function") {
    try {
      return mainWindow.getBrowserViews().includes(view);
    } catch {
      return false;
    }
  }
  if (typeof mainWindow.getBrowserView === "function") {
    try {
      return mainWindow.getBrowserView() === view;
    } catch {
      return false;
    }
  }
  return false;
}

function attachBrowserView(view) {
  if (!view || !view.webContents || view.webContents.isDestroyed()) return;
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (isBrowserViewAttached(view)) return;

  if (typeof mainWindow.addBrowserView === "function") {
    try {
      mainWindow.addBrowserView(view);
    } catch {}
    return;
  }
  if (typeof mainWindow.setBrowserView === "function") {
    try {
      mainWindow.setBrowserView(view);
    } catch {}
  }
}

function detachBrowserView(view) {
  if (!view || !view.webContents || view.webContents.isDestroyed()) return;
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (!isBrowserViewAttached(view)) return;

  if (typeof mainWindow.removeBrowserView === "function") {
    try {
      mainWindow.removeBrowserView(view);
    } catch {}
    return;
  }
  if (typeof mainWindow.setBrowserView === "function") {
    try {
      mainWindow.setBrowserView(null);
    } catch {}
  }
}

ipcMain.on("inspector-hover", (event, payload) => {
  const tabId = payload?.tabId
    ? String(payload.tabId)
    : getTabIdForWebContents(event.sender);
  if (!tabId) return;
  if (!payload || typeof payload !== "object") return;
  const { tabId: _ignored, ...rest } = payload;
  sendInspectorHover(tabId, rest);
});

ipcMain.on("inspector-selection", (event, payload) => {
  const tabId = payload?.tabId
    ? String(payload.tabId)
    : getTabIdForWebContents(event.sender);
  if (!tabId) return;
  if (!payload || typeof payload !== "object") return;
  const { tabId: _ignored, ...rest } = payload;
  sendInspectorSelection(tabId, rest);
});

function sendInspectorHover(tabId, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("browserview-inspector-hover", {
      ...payload,
      tabId,
    });
  }
}

function sendInspectorSelection(tabId, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("browserview-inspector-selection", {
      ...payload,
      tabId,
    });
  }
}

function hideBrowserView(tabId) {
  const view = browserViews.get(tabId);
  if (!view || view.webContents.isDestroyed()) return;
  detachBrowserView(view);
  view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
}

async function showBrowserView(tabId) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  activeBrowserTabId = tabId;
  for (const [id] of browserViews.entries()) {
    if (id !== tabId) hideBrowserView(id);
  }

  const view = await ensureBrowserView(tabId);
  attachBrowserView(view);
  const bounds = browserBoundsCache.get(tabId);
  if (bounds) view.setBounds(bounds);
  notifyBrowserState(tabId);
}

function destroyBrowserView(tabId) {
  const view = browserViews.get(tabId);
  if (!view) return;
  browserViews.delete(tabId);
  browserBoundsCache.delete(tabId);
  browserPopupStatsByTabId.delete(tabId);
  if (activeBrowserTabId === tabId) activeBrowserTabId = null;

  detachBrowserView(view);

  // Clean up anti-detection resources for this tab
  antiDetection.cleanupTab(tabId);

  try {
    view.webContents.destroy();
  } catch {}
}

ipcMain.handle(
  "browserview-create",
  async (event, { tabId, url, profileId }) => {
    const view = await ensureBrowserView(tabId, { profileId });
    if (url) {
      try {
        await view.webContents.loadURL(url);
      } catch (err) {
        const message = String(err?.message || err);
        if (!message.includes("ERR_ABORTED")) throw err;
      }
    }
    return true;
  },
);

ipcMain.handle("browserview-show", async (event, { tabId, visible = true }) => {
  if (visible) {
    showBrowserView(tabId);
  } else {
    hideBrowserView(tabId);
  }
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
  const view = await ensureBrowserView(tabId);
  view.setBounds(bounds);
  return true;
});

ipcMain.handle("browserview-load-url", async (event, { tabId, url }) => {
  const view = await ensureBrowserView(tabId);
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

ipcMain.handle(
  "browserview-reload",
  async (event, { tabId, ignoreCache = false }) => {
    const view = browserViews.get(tabId);
    if (!view || view.webContents.isDestroyed()) return false;
    if (ignoreCache) {
      view.webContents.reloadIgnoringCache();
    } else {
      view.webContents.reload();
    }
    return true;
  },
);

ipcMain.handle(
  "browserview-set-inspector-enabled",
  async (event, { tabId, enabled }) => {
    const view = browserViews.get(tabId);
    if (!view || view.webContents.isDestroyed()) return false;

    view.webContents.send("browserview-inspector-enabled", {
      enabled: Boolean(enabled),
      tabId,
    });
    return true;
  },
);

ipcMain.handle("browserview-get-page-html", async (event, { tabId }) => {
  const view = browserViews.get(tabId);
  if (!view || view.webContents.isDestroyed()) return { ok: false };
  const html = await view.webContents.executeJavaScript(
    "document.documentElement.outerHTML",
  );
  return { ok: true, html };
});

ipcMain.handle("browserview-capture-region", async (event, { tabId, rect }) => {
  try {
    const view = browserViews.get(tabId);
    if (!view || view.webContents.isDestroyed()) {
      return { ok: false, error: "BrowserView not available" };
    }

    const r = rect && typeof rect === "object" ? rect : null;
    const x = Math.max(0, Math.floor(Number(r?.x) || 0));
    const y = Math.max(0, Math.floor(Number(r?.y) || 0));
    const width = Math.max(1, Math.floor(Number(r?.width) || 0));
    const height = Math.max(1, Math.floor(Number(r?.height) || 0));

    for (let attempt = 0; attempt < 10; attempt++) {
      const image = await view.webContents.capturePage({ x, y, width, height });
      const size = image?.getSize?.() || { width: 0, height: 0 };
      if (!image?.isEmpty?.() && size.width > 0 && size.height > 0) {
        const png = image.toPNG();
        if (png.length > 0) {
          const base64 = png.toString("base64");
          return {
            ok: true,
            mimeType: "image/png",
            byteLength: png.length,
            dataUrl: `data:image/png;base64,${base64}`,
          };
        }
      }

      await new Promise((r) => setTimeout(r, 100));
    }

    return { ok: false, error: "Empty capture" };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("browserview-capture-page", async (event, { tabId }) => {
  try {
    const view = browserViews.get(tabId);
    if (!view || view.webContents.isDestroyed()) {
      return { ok: false, error: "BrowserView not available" };
    }

    for (let attempt = 0; attempt < 10; attempt++) {
      const image = await view.webContents.capturePage();
      const size = image?.getSize?.() || { width: 0, height: 0 };
      if (!image?.isEmpty?.() && size.width > 0 && size.height > 0) {
        const png = image.toPNG();
        if (png.length > 0) {
          const base64 = png.toString("base64");
          return {
            ok: true,
            mimeType: "image/png",
            byteLength: png.length,
            dataUrl: `data:image/png;base64,${base64}`,
          };
        }
      }

      await new Promise((r) => setTimeout(r, 100));
    }

    return { ok: false, error: "Empty capture" };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("adblock-get-enabled", async () => {
  return await getAdblockEnabled();
});

ipcMain.handle("adblock-set-enabled", async (event, enabled) => {
  return await setAdblockEnabled(enabled);
});

ipcMain.handle("browserview-get-popup-stats", async (event, { tabId }) => {
  const id = tabId != null ? String(tabId) : "";
  const stats = browserPopupStatsByTabId.get(id) || { count: 0, lastUrl: "" };
  return {
    tabId: id,
    count: Number(stats.count || 0),
    lastUrl: String(stats.lastUrl || ""),
  };
});

ipcMain.handle("browserview-clear-popup-stats", async (event, { tabId }) => {
  const id = tabId != null ? String(tabId) : "";
  browserPopupStatsByTabId.set(id, { count: 0, lastUrl: "" });
  return true;
});

ipcMain.handle("app-capture-region", async (event, { rect }) => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { ok: false, error: "Main window not available" };
    }

    const r = rect && typeof rect === "object" ? rect : null;
    const x = Math.max(0, Math.floor(Number(r?.x) || 0));
    const y = Math.max(0, Math.floor(Number(r?.y) || 0));
    const width = Math.max(1, Math.floor(Number(r?.width) || 0));
    const height = Math.max(1, Math.floor(Number(r?.height) || 0));

    for (let attempt = 0; attempt < 10; attempt++) {
      const image = await mainWindow.webContents.capturePage({
        x,
        y,
        width,
        height,
      });
      const size = image?.getSize?.() || { width: 0, height: 0 };
      if (!image?.isEmpty?.() && size.width > 0 && size.height > 0) {
        const png = image.toPNG();
        if (png.length > 0) {
          const base64 = png.toString("base64");
          return {
            ok: true,
            mimeType: "image/png",
            byteLength: png.length,
            dataUrl: `data:image/png;base64,${base64}`,
          };
        }
      }

      await new Promise((r) => setTimeout(r, 100));
    }

    return { ok: false, error: "Empty capture" };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("app-capture-page", async () => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { ok: false, error: "Main window not available" };
    }

    for (let attempt = 0; attempt < 10; attempt++) {
      const image = await mainWindow.webContents.capturePage();
      const size = image?.getSize?.() || { width: 0, height: 0 };
      if (!image?.isEmpty?.() && size.width > 0 && size.height > 0) {
        const png = image.toPNG();
        if (png.length > 0) {
          const base64 = png.toString("base64");
          return {
            ok: true,
            mimeType: "image/png",
            byteLength: png.length,
            dataUrl: `data:image/png;base64,${base64}`,
          };
        }
      }

      await new Promise((r) => setTimeout(r, 100));
    }

    return { ok: false, error: "Empty capture" };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

async function selectPrimaryDisplayRegion() {
  const display =
    typeof screen?.getPrimaryDisplay === "function"
      ? screen.getPrimaryDisplay()
      : null;
  const bounds = display?.bounds || { x: 0, y: 0, width: 0, height: 0 };
  const workArea = display?.workArea || bounds;
  const originX = Math.floor(Number(workArea.x) || 0);
  const originY = Math.floor(Number(workArea.y) || 0);
  const boundsWidth = Math.max(1, Math.floor(Number(workArea.width) || 0));
  const boundsHeight = Math.max(1, Math.floor(Number(workArea.height) || 0));
  const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const channel = `external-area-selection-${requestId}`;

  return await new Promise((resolve) => {
    let done = false;
    let selectionWindow = null;

    const finish = (payload) => {
      if (done) return;
      done = true;
      try {
        if (selectionWindow && !selectionWindow.isDestroyed()) {
          selectionWindow.destroy();
        }
      } catch {}
      resolve(payload);
    };

    ipcMain.once(channel, (event, payload) => {
      finish(payload);
    });

    selectionWindow = new BrowserWindow({
      x: originX,
      y: originY,
      width: boundsWidth,
      height: boundsHeight,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      closable: true,
      focusable: true,
      skipTaskbar: true,
      hasShadow: false,
      alwaysOnTop: true,
      fullscreenable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    try {
      selectionWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
      });
    } catch {}
    try {
      selectionWindow.setAlwaysOnTop(true, "screen-saver");
    } catch {}
    try {
      selectionWindow.setContentProtection(true);
    } catch {}

    selectionWindow.on("closed", () => {
      finish({ cancelled: true });
    });

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Select Area</title>
    <style>
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
      body { cursor: crosshair; background: rgba(0, 0, 0, 0.08); }
      #hint { position: fixed; top: 16px; left: 16px; padding: 8px 10px; border-radius: 10px;
        color: rgba(255,255,255,0.92); font: 12px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif;
        background: rgba(15,23,42,0.78); border: 1px solid rgba(255,255,255,0.12);
        user-select: none; pointer-events: none; }
      #box { position: fixed; border: 2px solid rgba(79,70,229,0.95); background: rgba(79,70,229,0.18);
        box-shadow: 0 0 0 1px rgba(15,23,42,0.45) inset; display: none; }
    </style>
  </head>
  <body>
    <div id="hint">Drag to select an area. Press Esc to cancel.</div>
    <div id="box"></div>
    <script>
      const { ipcRenderer } = require('electron');
      const channel = ${JSON.stringify(channel)};
      const originX = ${originX};
      const originY = ${originY};
      const boundsWidth = ${boundsWidth};
      const boundsHeight = ${boundsHeight};
      const box = document.getElementById('box');
      let start = null;

      const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
      const clampScreen = (screen) => ({
        x: clamp(screen.x, originX, originX + boundsWidth),
        y: clamp(screen.y, originY, originY + boundsHeight),
      });
      const toClient = (screen) => ({
        x: screen.x - window.screenX,
        y: screen.y - window.screenY,
      });

      window.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        try { ipcRenderer.send(channel, { cancelled: true }); } catch {}
        window.close();
      }, true);

      window.addEventListener('mousedown', (e) => {
        const s = clampScreen({ x: e.screenX, y: e.screenY });
        start = { screen: s, client: toClient(s) };
        box.style.display = 'block';
        box.style.left = start.client.x + 'px';
        box.style.top = start.client.y + 'px';
        box.style.width = '0px';
        box.style.height = '0px';
      });

      window.addEventListener('mousemove', (e) => {
        if (!start) return;
        const curScreen = clampScreen({ x: e.screenX, y: e.screenY });
        const curClient = toClient(curScreen);
        const left = Math.min(start.client.x, curClient.x);
        const top = Math.min(start.client.y, curClient.y);
        const width = Math.abs(curClient.x - start.client.x);
        const height = Math.abs(curClient.y - start.client.y);
        box.style.left = left + 'px';
        box.style.top = top + 'px';
        box.style.width = width + 'px';
        box.style.height = height + 'px';
      });

      window.addEventListener('mouseup', (e) => {
        if (!start) return;
        const curScreen = clampScreen({ x: e.screenX, y: e.screenY });
        const left = Math.min(start.screen.x, curScreen.x);
        const top = Math.min(start.screen.y, curScreen.y);
        const width = Math.abs(curScreen.x - start.screen.x);
        const height = Math.abs(curScreen.y - start.screen.y);
        start = null;
        try { ipcRenderer.send(channel, { x: left, y: top, width, height }); } catch {}
        window.close();
      });
    </script>
  </body>
</html>`;

    const url = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    selectionWindow.loadURL(url).catch(() => {
      finish({ cancelled: true });
    });

    try {
      selectionWindow.show();
      selectionWindow.focus();
    } catch {}
  });
}

ipcMain.handle("external-capture-primary-screen", async () => {
  try {
    if (!desktopCapturer?.getSources) {
      return { ok: false, error: "desktopCapturer is not available" };
    }

    const status =
      typeof systemPreferences?.getMediaAccessStatus === "function"
        ? systemPreferences.getMediaAccessStatus("screen")
        : "unknown";
    if (status === "denied" || status === "restricted") {
      return { ok: false, error: "Screen recording permission denied" };
    }

    const display =
      typeof screen?.getPrimaryDisplay === "function"
        ? screen.getPrimaryDisplay()
        : null;
    const width = Math.max(1, Math.floor(Number(display?.size?.width) || 0));
    const height = Math.max(1, Math.floor(Number(display?.size?.height) || 0));
    const scaleFactor = Math.max(1, Number(display?.scaleFactor) || 1);

    const thumbnailSize = {
      width: Math.max(1, Math.floor(width * scaleFactor)),
      height: Math.max(1, Math.floor(height * scaleFactor)),
    };

    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize,
    });
    const list = Array.isArray(sources) ? sources : [];
    if (!list.length) return { ok: false, error: "No screen sources" };

    const displayId =
      display && typeof display.id !== "undefined" ? String(display.id) : null;

    const byDisplayId = displayId
      ? list.find((source) => {
          const sid = String(source?.display_id ?? source?.displayId ?? "");
          return sid && sid === displayId;
        })
      : null;

    const expectedW = Math.max(
      1,
      Math.floor(Number(thumbnailSize?.width) || 0),
    );
    const expectedH = Math.max(
      1,
      Math.floor(Number(thumbnailSize?.height) || 0),
    );
    const tolerance = 3;
    const bySize = list.find((source) => {
      const s = source?.thumbnail?.getSize?.() || { width: 0, height: 0 };
      const sw = Math.floor(Number(s.width) || 0);
      const sh = Math.floor(Number(s.height) || 0);
      return (
        Math.abs(sw - expectedW) <= tolerance &&
        Math.abs(sh - expectedH) <= tolerance
      );
    });

    const best =
      byDisplayId ||
      bySize ||
      list.reduce((acc, cur) => {
        const a = acc?.thumbnail?.getSize?.() || { width: 0, height: 0 };
        const b = cur?.thumbnail?.getSize?.() || { width: 0, height: 0 };
        return a.width * a.height >= b.width * b.height ? acc : cur;
      }, list[0]);

    const image = best?.thumbnail;
    const size = image?.getSize?.() || { width: 0, height: 0 };
    if (image?.isEmpty?.() || size.width <= 0 || size.height <= 0) {
      return { ok: false, error: "Empty screen capture" };
    }

    const png = image.toPNG();
    if (!png?.length) return { ok: false, error: "Empty screen capture" };
    const base64 = png.toString("base64");
    return {
      ok: true,
      mimeType: "image/png",
      byteLength: png.length,
      dataUrl: `data:image/png;base64,${base64}`,
    };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("external-capture-primary-screen-region", async () => {
  let shouldShowApp = false;
  try {
    if (!desktopCapturer?.getSources) {
      return { ok: false, error: "desktopCapturer is not available" };
    }

    const status =
      typeof systemPreferences?.getMediaAccessStatus === "function"
        ? systemPreferences.getMediaAccessStatus("screen")
        : "unknown";
    if (status === "denied" || status === "restricted") {
      return { ok: false, error: "Screen recording permission denied" };
    }

    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      shouldShowApp = true;
      safeHideWindow(mainWindow);
    }

    const sel = await selectPrimaryDisplayRegion();
    if (!sel || sel.cancelled) {
      return { ok: false, cancelled: true, error: "Cancelled" };
    }

    const display =
      typeof screen?.getPrimaryDisplay === "function"
        ? screen.getPrimaryDisplay()
        : null;
    const bounds = display?.bounds || { x: 0, y: 0, width: 1, height: 1 };
    const workArea = display?.workArea || bounds;
    const boundsX = Math.floor(Number(bounds.x) || 0);
    const boundsY = Math.floor(Number(bounds.y) || 0);
    const boundsWidth = Math.max(1, Math.floor(Number(bounds.width) || 0));
    const boundsHeight = Math.max(1, Math.floor(Number(bounds.height) || 0));
    const workX = Math.floor(Number(workArea.x) || 0);
    const workY = Math.floor(Number(workArea.y) || 0);
    const workWidth = Math.max(1, Math.floor(Number(workArea.width) || 0));
    const workHeight = Math.max(1, Math.floor(Number(workArea.height) || 0));

    const selXAbs = Math.floor(Number(sel.x) || 0);
    const selYAbs = Math.floor(Number(sel.y) || 0);
    const selW = Math.floor(Number(sel.width) || 0);
    const selH = Math.floor(Number(sel.height) || 0);

    await new Promise((r) => setTimeout(r, 120));

    const scaleFactor = Math.max(1, Number(display?.scaleFactor) || 1);
    const thumbnailSize = {
      width: Math.max(1, Math.floor(boundsWidth * scaleFactor)),
      height: Math.max(1, Math.floor(boundsHeight * scaleFactor)),
    };

    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize,
    });
    const list = Array.isArray(sources) ? sources : [];
    if (!list.length) return { ok: false, error: "No screen sources" };

    const displayId =
      display && typeof display.id !== "undefined" ? String(display.id) : null;

    const byDisplayId = displayId
      ? list.find((source) => {
          const sid = String(source?.display_id ?? source?.displayId ?? "");
          return sid && sid === displayId;
        })
      : null;

    const expectedW = Math.max(
      1,
      Math.floor(Number(thumbnailSize?.width) || 0),
    );
    const expectedH = Math.max(
      1,
      Math.floor(Number(thumbnailSize?.height) || 0),
    );
    const tolerance = 3;
    const bySize = list.find((source) => {
      const s = source?.thumbnail?.getSize?.() || { width: 0, height: 0 };
      const sw = Math.floor(Number(s.width) || 0);
      const sh = Math.floor(Number(s.height) || 0);
      return (
        Math.abs(sw - expectedW) <= tolerance &&
        Math.abs(sh - expectedH) <= tolerance
      );
    });

    const expectedRatio = boundsWidth / boundsHeight;
    const best =
      byDisplayId ||
      bySize ||
      list.reduce((acc, cur) => {
        const aSize = acc?.thumbnail?.getSize?.() || { width: 0, height: 0 };
        const bSize = cur?.thumbnail?.getSize?.() || { width: 0, height: 0 };
        const aArea =
          Math.max(0, Number(aSize.width) || 0) *
          Math.max(0, Number(aSize.height) || 0);
        const bArea =
          Math.max(0, Number(bSize.width) || 0) *
          Math.max(0, Number(bSize.height) || 0);
        const aRatio = aSize.height ? aSize.width / aSize.height : 0;
        const bRatio = bSize.height ? bSize.width / bSize.height : 0;
        const aDiff = Math.abs(aRatio - expectedRatio);
        const bDiff = Math.abs(bRatio - expectedRatio);

        if (bDiff < aDiff - 1e-6) return cur;
        if (aDiff < bDiff - 1e-6) return acc;
        return bArea > aArea ? cur : acc;
      }, list[0]);

    const image = best?.thumbnail;
    const size = image?.getSize?.() || { width: 0, height: 0 };
    if (image?.isEmpty?.() || size.width <= 0 || size.height <= 0) {
      return { ok: false, error: "Empty screen capture" };
    }

    if (typeof image.crop !== "function") {
      return { ok: false, error: "Crop is not supported" };
    }

    const ratioOf = (w, h) => {
      const ww = Math.max(1, Number(w) || 0);
      const hh = Math.max(1, Number(h) || 0);
      return ww / hh;
    };
    const scoreBasis = (rectW, rectH) => {
      const expW = Math.max(1, Math.floor(Number(rectW) * scaleFactor));
      const expH = Math.max(1, Math.floor(Number(rectH) * scaleFactor));
      const dw = Math.abs(size.width - expW);
      const dh = Math.abs(size.height - expH);
      const dr = Math.abs(
        ratioOf(size.width, size.height) - ratioOf(rectW, rectH),
      );
      return dw + dh + dr * 2000;
    };
    const useWorkArea =
      scoreBasis(workWidth, workHeight) < scoreBasis(boundsWidth, boundsHeight);
    const basis = useWorkArea
      ? {
          name: "workArea",
          x: workX,
          y: workY,
          width: workWidth,
          height: workHeight,
        }
      : {
          name: "bounds",
          x: boundsX,
          y: boundsY,
          width: boundsWidth,
          height: boundsHeight,
        };

    const relX = selXAbs - basis.x;
    const relY = selYAbs - basis.y;

    const x1Dip = Math.max(0, Math.min(relX, basis.width));
    const y1Dip = Math.max(0, Math.min(relY, basis.height));
    const x2Dip = Math.max(0, Math.min(relX + selW, basis.width));
    const y2Dip = Math.max(0, Math.min(relY + selH, basis.height));

    const sxDip = Math.min(x1Dip, x2Dip);
    const syDip = Math.min(y1Dip, y2Dip);
    const swDip = Math.max(0, Math.abs(x2Dip - x1Dip));
    const shDip = Math.max(0, Math.abs(y2Dip - y1Dip));

    if (swDip < 2 || shDip < 2) {
      return { ok: false, cancelled: true, error: "Cancelled" };
    }

    const scaleX = size.width / basis.width;
    const scaleY = size.height / basis.height;
    const sx = Math.max(0, Math.floor(sxDip * scaleX));
    const sy = Math.max(0, Math.floor(syDip * scaleY));
    const ex = Math.min(size.width, Math.ceil((sxDip + swDip) * scaleX));
    const ey = Math.min(size.height, Math.ceil((syDip + shDip) * scaleY));
    const sw = Math.max(1, ex - sx);
    const sh = Math.max(1, ey - sy);

    const cx = Math.min(sx, Math.max(0, size.width - 1));
    const cy = Math.min(sy, Math.max(0, size.height - 1));
    const cwidth = Math.max(1, Math.min(sw, size.width - cx));
    const cheight = Math.max(1, Math.min(sh, size.height - cy));

    const cropped = image.crop({
      x: cx,
      y: cy,
      width: cwidth,
      height: cheight,
    });
    const png = cropped.toPNG();
    if (!png?.length) return { ok: false, error: "Empty screen capture" };
    const base64 = png.toString("base64");

    return {
      ok: true,
      mimeType: "image/png",
      byteLength: png.length,
      dataUrl: `data:image/png;base64,${base64}`,
      meta: {
        method: "desktopCapturer+select",
        rect: { x: cx, y: cy, width: cwidth, height: cheight },
        rectDip: { x: sxDip, y: syDip, width: swDip, height: shDip },
        scale: { x: scaleX, y: scaleY },
        scaleFactor,
        basis: {
          name: basis.name,
          rectDip: {
            x: basis.x,
            y: basis.y,
            width: basis.width,
            height: basis.height,
          },
        },
      },
    };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  } finally {
    if (shouldShowApp) {
      try {
        showMainWindow();
      } catch {}
    }
  }
});

ipcMain.handle("clipboard-write-image-data-url", async (event, { dataUrl }) => {
  try {
    const { clipboard, nativeImage } = require("electron");
    const url = String(dataUrl ?? "");
    if (!url.startsWith("data:image/")) return false;

    let image = nativeImage.createFromDataURL(url);
    if (!image || image.isEmpty()) {
      const match = url.match(/^data:image\/(png|jpe?g|webp);base64,(.*)$/i);
      if (match) {
        const buffer = Buffer.from(match[2] || "", "base64");
        image = nativeImage.createFromBuffer(buffer);
      }
    }

    if (!image || image.isEmpty()) return false;
    clipboard.writeImage(image);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle("get-start-on-boot", async () => {
  const currentStore = await getStore();
  return currentStore.get("startOnBoot", false);
});

ipcMain.handle("set-start-on-boot", async (event, enabled) => {
  const currentStore = await getStore();
  const normalized = Boolean(enabled);
  currentStore.set("startOnBoot", normalized);
  const loginSettings = {
    openAtLogin: normalized,
    args: ["--background"],
  };
  if (process.platform === "darwin") {
    loginSettings.openAsHidden = true;
  }
  app.setLoginItemSettings(loginSettings);
  sendSettingsChanged("startOnBoot", normalized);
  updateTrayMenu().catch(() => {});
  return true;
});

ipcMain.handle("get-app-visibility", async () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { visible: false, focused: false, minimized: false };
  }
  return {
    visible: mainWindow.isVisible(),
    focused: mainWindow.isFocused(),
    minimized: mainWindow.isMinimized(),
  };
});

ipcMain.handle("app-show-window", async () => {
  showMainWindow();
  return true;
});

ipcMain.handle("app-hide-window", async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    safeHideWindow(mainWindow);
  }
  return true;
});

ipcMain.handle("app-toggle-window", async () => {
  toggleMainWindowVisibility();
  return true;
});

ipcMain.handle("get-run-in-background", async () => {
  const currentStore = await getStore();
  return currentStore.get("runInBackground", true);
});

ipcMain.handle("set-run-in-background", async (event, enabled) => {
  const currentStore = await getStore();
  currentStore.set("runInBackground", enabled);
  sendSettingsChanged("runInBackground", Boolean(enabled));
  return true;
});

ipcMain.handle("get-keyboard-controls-enabled", async () => {
  const currentStore = await getStore();
  return currentStore.get("keyboardControlsEnabled", true);
});

ipcMain.handle("set-keyboard-controls-enabled", async (event, enabled) => {
  const currentStore = await getStore();
  currentStore.set("keyboardControlsEnabled", enabled);
  sendSettingsChanged("keyboardControlsEnabled", Boolean(enabled));
  return true;
});

ipcMain.handle("get-quick-toggle-enabled", async () => {
  const currentStore = await getStore();
  return currentStore.get("quickToggleEnabled", true);
});

ipcMain.handle("set-quick-toggle-enabled", async (event, enabled) => {
  const currentStore = await getStore();
  currentStore.set("quickToggleEnabled", enabled);
  await registerQuickToggleShortcut();
  sendSettingsChanged("quickToggleEnabled", Boolean(enabled));
  return true;
});

ipcMain.handle("get-quick-toggle-shortcut", async () => {
  const currentStore = await getStore();
  return currentStore.get("quickToggleShortcut", DEFAULT_QUICK_TOGGLE_SHORTCUT);
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

// Open external URL
ipcMain.handle("open-external", async (event, url) => {
  if (url) {
    try {
      await shell.openExternal(url);
      return true;
    } catch (err) {
      console.error("Failed to open external URL:", err);
      return false;
    }
  }
  return false;
});

// Write text to clipboard
ipcMain.handle("clipboard-write-text", async (event, text) => {
  try {
    const { clipboard } = require("electron");
    clipboard.writeText(String(text ?? ""));
    return true;
  } catch (err) {
    console.error("Failed to write to clipboard:", err);
    return false;
  }
});

// Uninstall app (clear data and quit)
ipcMain.handle("app-uninstall", async () => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: "warning",
    title: "Uninstall Application",
    message:
      "Are you sure you want to uninstall the application? This will clear all settings and project data, then close the app.",
    buttons: ["Cancel", "Uninstall"],
    defaultId: 0,
    cancelId: 0,
  });

  if (result.response === 1) {
    try {
      const currentStore = await getStore();
      currentStore.clear();
      if (scrumStore && typeof scrumStore.clear === "function") {
        scrumStore.clear();
      }

      // Quit the application
      isQuitting = true;
      app.quit();
      return true;
    } catch (err) {
      console.error("Failed during uninstallation:", err);
      return false;
    }
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
  const path = require("path");

  console.log(`[IDE] Attempting to open ${projectPath} in ${ide}`);

  try {
    // Make path absolute
    const absolutePath = await ensureAbsolutePath(projectPath);
    console.log(`[IDE] Absolute path: ${absolutePath}`);

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
    const isMac = process.platform === "darwin";

    // For VS Code on Mac, we can try several options
    if (isMac && ["code", "vscode", "vs-code"].includes(ide.toLowerCase())) {
      return new Promise((resolve, reject) => {
        // Option 1: Try 'code' command
        exec(`code "${absolutePath}"`, (error) => {
          if (!error) {
            console.log("[IDE] Opened with 'code' command");
            return resolve({ success: true });
          }

          console.log("[IDE] 'code' command failed, trying 'open -a'");

          // Option 2: Try 'open -a' with common bundle IDs or names
          const macOptions = [
            'open -a "Visual Studio Code"',
            'open -a "Visual Studio Code - Insiders"',
            "open -b com.microsoft.VSCode",
          ];

          const tryMacOptions = (index) => {
            if (index >= macOptions.length) {
              return reject(
                new Error(
                  `Could not find VS Code. Please install the 'code' command in your PATH.`,
                ),
              );
            }

            exec(`${macOptions[index]} "${absolutePath}"`, (err) => {
              if (!err) {
                console.log(`[IDE] Opened with ${macOptions[index]}`);
                resolve({ success: true });
              } else {
                tryMacOptions(index + 1);
              }
            });
          };

          tryMacOptions(0);
        });
      });
    }

    // Default execution for other IDEs or platforms
    const fullCommand = isWindows
      ? `${command} "${absolutePath}"`
      : `${command} "${absolutePath}"`;

    console.log(`[IDE] Running command: ${fullCommand}`);

    return new Promise((resolve, reject) => {
      exec(fullCommand, { shell: true }, (error, stdout, stderr) => {
        if (error) {
          console.error(`[IDE] Error: ${error.message}`);
          // Try with .cmd extension on Windows
          if (isWindows) {
            exec(
              `${command}.cmd "${absolutePath}"`,
              { shell: true },
              (err2) => {
                if (err2) {
                  reject(
                    new Error(`Failed to open in ${ide}: ${error.message}`),
                  );
                } else {
                  resolve({ success: true });
                }
              },
            );
          } else {
            reject(new Error(`Failed to open in ${ide}: ${error.message}`));
          }
        } else {
          console.log(`[IDE] Successfully opened ${ide}`);
          resolve({ success: true });
        }
      });
    });
  } catch (err) {
    console.error(`[IDE] Fatal error: ${err.message}`);
    throw err;
  }
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
  },
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
  },
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
    } = {},
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

    const runEnv = { ...process.env, FORCE_COLOR: "1" };
    runEnv.PATH = buildAugmentedPath(runEnv.PATH);

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
        }),
      );

      const installed = results.every((r) => r.exists);
      const lines = ["▶ local folder check"];
      for (const r of results) {
        lines.push(`${r.folder}: ${r.exists ? "present" : "missing"}`);
      }
      if (!installed) {
        lines.push(
          "BMAD appears not installed (expected _bmad and _config directories).",
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
            "",
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
            "",
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
            "",
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
            "",
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
            "",
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
            "",
          );
        } else if (workflowName === "stories") {
          blocks.push(
            "## Epics",
            "- (fill in)",
            "",
            "## Stories",
            "- (fill in)",
            "",
          );
        } else if (workflowName === "implementation-readiness") {
          blocks.push(
            "## Checklist",
            "- [ ] PRD ready",
            "- [ ] UX ready (if applicable)",
            "- [ ] Architecture ready (if applicable)",
            "- [ ] Stories ready",
            "",
          );
        } else {
          blocks.push("## Output", "(fill in)", "");
        }

        const inputContent = await Promise.all(
          resolvedInputs.map(async (item) => {
            const content = await readIfExists(item.abs);
            if (!content) return null;
            return { label: item.raw, content };
          }),
        );

        const dataContent = await Promise.all(
          resolvedData.map(async (item) => {
            const content = await readIfExists(item.abs);
            if (!content) return null;
            return { label: item.raw, content };
          }),
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

    const resolvedOnPath = await resolveExecutableOnPath(command, runEnv.PATH);
    if (resolvedOnPath) {
      command = resolvedOnPath;
    } else if (process.platform === "darwin") {
      const base = path.basename(String(command)).toLowerCase();
      if (base === "npx") {
        const fallback = await resolveDarwinNpxFallback();
        if (fallback) command = fallback;
      }
    }

    const maybeRetryWithoutVerbose = async (result, runCommand, runArgs) => {
      if (!isVerbose) return result;
      if (!Array.isArray(runArgs) || !runArgs.includes("-v")) return result;
      const combined = `${String(result?.stdout || "")}\n${String(
        result?.stderr || "",
      )}`;
      if (!/unknown option ['"]-v['"]/i.test(combined)) return result;
      const nextArgs = runArgs.filter((a) => a !== "-v");
      return await runOnce(runCommand, nextArgs, { autoAcceptDefaults });
    };

    const maybeFallbackStatus = async (result) => {
      if (selectedAction !== "status") return null;
      const combined = `${String(result?.stdout || "")}\n${String(
        result?.stderr || "",
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
          env: runEnv,
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
            env: runEnv,
          });
        } catch (error) {
          sendBmadLog(
            "error",
            `Process error: ${error?.message || String(error)}`,
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
          "BMAD installer completed but _bmad folder was missing. Created it to unblock project setup.",
        );
      }
      if (created.length > 0 && !created.includes("_bmad")) {
        sendBmadLog(
          "info",
          `Created missing folders: ${created.map((d) => d).join(", ")}`,
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
    let canUsePty = Boolean(nodePty && typeof nodePty.spawn === "function");
    const runOnce = async (runCommand, runArgs, options) => {
      if (wantsInteractive && canUsePty) {
        const result = await runOncePty(runCommand, runArgs, options);
        const stderr = String(result?.stderr || "");
        if (
          !result?.success &&
          result?.code === -1 &&
          /posix_spawnp failed/i.test(stderr)
        ) {
          nodePty = null;
          canUsePty = false;
          return await runOnceSpawn(runCommand, runArgs, options);
        }
        return result;
      }
      return await runOnceSpawn(runCommand, runArgs, options);
    };

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
        `bmad CLI not found in PATH. Falling back to npx ${BMAD_NPX_PACKAGE}.`,
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

      const second = await runOnce(fallbackCommand, fallbackArgs, {
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
  },
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
        `${String(input || "")}${appendNewline ? "\r" : ""}`,
      );
      return true;
    } catch {
      return false;
    }
  }

  if (bmadChildProcess?.stdin?.writable) {
    try {
      bmadChildProcess.stdin.write(
        `${String(input || "")}${appendNewline ? "\n" : ""}`,
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
      cwd = process.resourcesPath;
    } else {
      // Development: relative to the project root
      // Usually: root/apps/ui/out/main/index.js (4 levels from root)
      // or root/apps/ui/src/main/index.js (3 levels from root)
      const possibleRoot4 = path.resolve(__dirname, "../../../../");
      const possibleRoot3 = path.resolve(__dirname, "../../../");

      if (fs.existsSync(path.join(possibleRoot4, "scripts/run-generator.ts"))) {
        scriptPath = path.join(possibleRoot4, "scripts/run-generator.ts");
        cwd = possibleRoot4;
      } else {
        scriptPath = path.join(possibleRoot3, "scripts/run-generator.ts");
        cwd = possibleRoot3;
      }
    }

    if (!fs.existsSync(scriptPath)) {
      sendLog("error", `❌ Generator script not found: ${scriptPath}`);
      return reject(new Error(`Generator script not found: ${scriptPath}`));
    }

    const answersString = JSON.stringify(answers);
    const answersBase64 = Buffer.from(answersString).toString("base64");
    const npx = process.platform === "win32" ? "npx.cmd" : "npx";

    sendLog("info", `🚀 Starting generator: ${generatorName}`);
    sendLog("info", `📁 Working directory: ${cwd}`);
    sendLog(
      "info",
      `📋 Configuration: ${Object.keys(answers).length} options set`,
    );
    sendLog("info", "─".repeat(50));

    const child = spawn(
      npx,
      ["tsx", scriptPath, generatorName, answersBase64],
      {
        cwd,
        shell: true,
        env: { ...process.env, FORCE_COLOR: "1" },
      },
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

const updatesRuntime = {
  autoUpdater: null,
  policy: null,
  state: {
    status: "idle",
    mandatory: false,
    info: null,
    progress: null,
    error: null,
    lastCheckedAt: null,
  },
  gateDialogOpen: false,
  availableDialogOpen: false,
  downloadedDialogOpen: false,
};

function emitUpdatesState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send("updates-state-changed", updatesRuntime.state);
}

function setUpdatesState(patch) {
  updatesRuntime.state = {
    ...updatesRuntime.state,
    ...patch,
  };
  emitUpdatesState();
}

function toVersionParts(input) {
  const raw = String(input || "0");
  const clean = raw.split("-")[0].split("+")[0];
  return clean
    .split(".")
    .map((p) => Number.parseInt(p, 10))
    .map((n) => (Number.isFinite(n) ? n : 0));
}

function compareVersions(a, b) {
  const pa = toVersionParts(a);
  const pb = toVersionParts(b);
  const maxLen = Math.max(pa.length, pb.length, 3);

  for (let i = 0; i < maxLen; i += 1) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va < vb) return -1;
    if (va > vb) return 1;
  }
  return 0;
}

function normalizeReleaseNotes(releaseNotes) {
  if (!releaseNotes) return "";
  if (Array.isArray(releaseNotes)) {
    return releaseNotes
      .map((n) => {
        if (!n) return "";
        if (typeof n === "string") return n;
        return String(n.note || n.title || "");
      })
      .filter(Boolean)
      .join("\n");
  }
  return String(releaseNotes);
}

function isMandatoryFromUpdateInfo(updateInfo) {
  const notes = normalizeReleaseNotes(updateInfo?.releaseNotes).toLowerCase();
  if (!notes) return false;
  return (
    notes.includes("force-update") ||
    notes.includes("force update") ||
    notes.includes("mandatory") ||
    notes.includes("required update")
  );
}

async function loadUpdatesPolicy() {
  const url = process.env.NEXTGEN_UPDATE_POLICY_URL;
  if (!url) return null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "cache-control": "no-cache",
      },
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || typeof json !== "object") return null;
    return json;
  } catch {
    return null;
  }
}

function isMandatoryByPolicy(policy, updateInfo) {
  if (!policy || typeof policy !== "object") return false;
  if (policy.force === true || policy.mandatory === true) return true;

  const minVersion = policy.minVersion;
  if (!minVersion) return false;
  const updateVersion = updateInfo?.version;
  if (!updateVersion) return false;
  if (compareVersions(updateVersion, minVersion) < 0) return false;
  return compareVersions(app.getVersion(), minVersion) < 0;
}

function shouldEnableAutoUpdates() {
  if (process.env.NEXTGEN_DISABLE_UPDATES === "1") return false;
  if (process.env.NODE_ENV === "development") return false;
  if (app.isPackaged) return true;
  return process.env.NEXTGEN_ENABLE_UPDATES_IN_DEV === "1";
}

function shouldBlockWindowCloseForMandatoryUpdate() {
  if (!updatesRuntime.state.mandatory) return false;
  const s = updatesRuntime.state.status;
  return s === "available" || s === "downloading" || s === "downloaded";
}

async function showMandatoryUpdateGate() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (updatesRuntime.gateDialogOpen) return;
  updatesRuntime.gateDialogOpen = true;

  try {
    const status = updatesRuntime.state.status;
    if (status === "downloaded") {
      await dialog.showMessageBox(mainWindow, {
        type: "info",
        title: "Update required",
        message: "A required update is ready to install.",
        buttons: ["Install and relaunch"],
        defaultId: 0,
        cancelId: -1,
        noLink: true,
      });
      try {
        updatesRuntime.autoUpdater?.quitAndInstall(false, true);
      } catch {}
      return;
    }

    if (status === "downloading") {
      await dialog.showMessageBox(mainWindow, {
        type: "info",
        title: "Updating",
        message: "A required update is downloading. Please wait.",
        buttons: ["OK"],
        defaultId: 0,
        cancelId: 0,
        noLink: true,
      });
      return;
    }

    if (status === "available") {
      await dialog.showMessageBox(mainWindow, {
        type: "warning",
        title: "Update required",
        message: "You must install the latest update to continue.",
        buttons: ["Download update"],
        defaultId: 0,
        cancelId: -1,
        noLink: true,
      });
      try {
        updatesRuntime.autoUpdater?.downloadUpdate();
      } catch {}
    }
  } finally {
    updatesRuntime.gateDialogOpen = false;
  }
}

async function promptUpdateAvailable(updateInfo, { mandatory }) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (updatesRuntime.availableDialogOpen) return;
  updatesRuntime.availableDialogOpen = true;

  try {
    if (mandatory) {
      try {
        safeShowWindow(mainWindow);
        mainWindow.focus();
      } catch {}
    }
    const title = mandatory ? "Update required" : "Update available";
    const version = updateInfo?.version ? `Version ${updateInfo.version}` : "";
    const message = mandatory
      ? `A required update is available. ${version}`.trim()
      : `A new update is available. ${version}`.trim();

    const buttons = mandatory ? ["Download update"] : ["Download", "Later"];

    const result = await dialog.showMessageBox(mainWindow, {
      type: mandatory ? "warning" : "info",
      title,
      message,
      buttons,
      defaultId: 0,
      cancelId: mandatory ? -1 : 1,
      noLink: true,
    });

    if (result.response === 0) {
      await updatesRuntime.autoUpdater?.downloadUpdate();
    }
  } finally {
    updatesRuntime.availableDialogOpen = false;
  }
}

async function promptUpdateDownloaded(updateInfo, { mandatory }) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (updatesRuntime.downloadedDialogOpen) return;
  updatesRuntime.downloadedDialogOpen = true;

  try {
    if (mandatory) {
      try {
        safeShowWindow(mainWindow);
        mainWindow.focus();
      } catch {}
    }
    const title = mandatory ? "Update required" : "Update ready";
    const buttons = mandatory ? ["Install and relaunch"] : ["Install", "Later"];

    const result = await dialog.showMessageBox(mainWindow, {
      type: mandatory ? "warning" : "info",
      title,
      message: "The update has been downloaded and is ready to install.",
      buttons,
      defaultId: 0,
      cancelId: mandatory ? -1 : 1,
      noLink: true,
    });

    if (result.response === 0) {
      try {
        updatesRuntime.autoUpdater?.quitAndInstall(false, true);
      } catch {}
    }
  } finally {
    updatesRuntime.downloadedDialogOpen = false;
  }
}

async function ensureAutoUpdater() {
  if (updatesRuntime.autoUpdater) return updatesRuntime.autoUpdater;
  if (!shouldEnableAutoUpdates()) return null;

  let autoUpdater;
  try {
    autoUpdater = require("electron-updater").autoUpdater;
  } catch (err) {
    console.error("[Updates] Failed to load electron-updater:", err);
    return null;
  }

  updatesRuntime.autoUpdater = autoUpdater;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  const genericUrl = process.env.NEXTGEN_UPDATES_URL;
  if (genericUrl) {
    try {
      autoUpdater.setFeedURL({ provider: "generic", url: genericUrl });
    } catch (err) {
      console.error("[Updates] Failed to set feed URL:", err);
    }
  }

  autoUpdater.on("checking-for-update", () => {
    setUpdatesState({
      status: "checking",
      error: null,
      lastCheckedAt: new Date().toISOString(),
    });
  });

  autoUpdater.on("update-not-available", (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setProgressBar(-1);
    }
    setUpdatesState({
      status: "not-available",
      mandatory: false,
      info: info || null,
      progress: null,
      error: null,
    });
  });

  autoUpdater.on("update-available", async (info) => {
    updatesRuntime.policy =
      updatesRuntime.policy || (await loadUpdatesPolicy());
    const mandatory =
      process.env.NEXTGEN_FORCE_UPDATE === "1" ||
      isMandatoryFromUpdateInfo(info) ||
      isMandatoryByPolicy(updatesRuntime.policy, info);

    setUpdatesState({
      status: "available",
      mandatory: Boolean(mandatory),
      info: info || null,
      progress: null,
      error: null,
    });

    if (Notification?.isSupported?.()) {
      try {
        const body = mandatory
          ? "A required update is available."
          : "A new update is available.";
        new Notification({ title: "next-gen-tools", body }).show();
      } catch {}
    }

    promptUpdateAvailable(info, { mandatory: Boolean(mandatory) }).catch(
      () => {},
    );
  });

  autoUpdater.on("download-progress", (progress) => {
    const ratio =
      typeof progress?.percent === "number" && Number.isFinite(progress.percent)
        ? Math.max(0, Math.min(1, progress.percent / 100))
        : -1;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setProgressBar(ratio);
    }
    setUpdatesState({
      status: "downloading",
      progress: progress || null,
      error: null,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setProgressBar(-1);
    }
    setUpdatesState({
      status: "downloaded",
      info: info || updatesRuntime.state.info || null,
      progress: null,
      error: null,
    });

    promptUpdateDownloaded(info, {
      mandatory: updatesRuntime.state.mandatory,
    }).catch(() => {});
  });

  autoUpdater.on("error", (err) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setProgressBar(-1);
    }
    setUpdatesState({
      status: "error",
      error: String(err?.message || err || "Unknown error"),
      progress: null,
    });
  });

  return autoUpdater;
}

ipcMain.handle("updates-get-state", async () => {
  return updatesRuntime.state;
});

ipcMain.handle("updates-check", async () => {
  const updater = await ensureAutoUpdater();
  if (!updater) return updatesRuntime.state;
  try {
    await updater.checkForUpdates();
  } catch (err) {
    setUpdatesState({
      status: "error",
      error: String(err?.message || err || "Unknown error"),
    });
  }
  return updatesRuntime.state;
});

ipcMain.handle("updates-download", async () => {
  const updater = await ensureAutoUpdater();
  if (!updater) return updatesRuntime.state;
  try {
    await updater.downloadUpdate();
  } catch (err) {
    setUpdatesState({
      status: "error",
      error: String(err?.message || err || "Unknown error"),
    });
  }
  return updatesRuntime.state;
});

ipcMain.handle("updates-install", async () => {
  const updater = await ensureAutoUpdater();
  if (!updater) return false;
  try {
    updater.quitAndInstall(false, true);
    return true;
  } catch {
    return false;
  }
});

app.whenReady().then(async () => {
  const currentStore = await getStore();
  const backgroundLaunch = process.argv.includes("--background");

  try {
    adblockEnabledCache = currentStore.get("adblockEnabled", true);
    sendAdblockState(Boolean(adblockEnabledCache));
    if (adblockEnabledCache) {
      ensureAdblocker().catch(() => {});
    }
  } catch {}

  // Initialize anti-detection IPC handlers
  antiDetection.initAntiDetectionIPC();

  ensureTray();

  // Auto-start MCP Server
  startMcpServer();

  createWindow({ show: !backgroundLaunch && !app.isPackaged });
  updateTrayMenu().catch(() => {});

  ensureAutoUpdater().then((updater) => {
    if (!updater) return;
    setTimeout(() => {
      updater.checkForUpdates().catch(() => {});
    }, 8000);

    const intervalMs = 6 * 60 * 60 * 1000;
    setInterval(() => {
      updater.checkForUpdates().catch(() => {});
    }, intervalMs);
  });

  await registerQuickToggleShortcut();

  globalShortcut.register("CommandOrControl+Shift+I", () => {
    if (mainWindow && !mainWindow.isDestroyed())
      mainWindow.webContents.toggleDevTools();
  });

  globalShortcut.register("CommandOrControl+Shift+D", () => {
    if (mainWindow && !mainWindow.isDestroyed()) createFloatDevTools();
  });

  if (currentStore.get("startOnBoot", false)) {
    const loginSettings = {
      openAtLogin: true,
      args: ["--background"],
    };
    if (process.platform === "darwin") {
      loginSettings.openAsHidden = true;
    }
    app.setLoginItemSettings(loginSettings);
  }

  powerMonitor.on("suspend", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send("power-state-changed", { type: "suspend" });
  });

  powerMonitor.on("resume", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send("power-state-changed", { type: "resume" });
  });

  powerMonitor.on("on-battery", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send("power-state-changed", { type: "on-battery" });
  });

  powerMonitor.on("on-ac", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send("power-state-changed", { type: "on-ac" });
  });
});

app.on("before-quit", () => {
  isQuitting = true;
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

ipcMain.handle("run-e2e-test", async (event, { testFile, options = {} }) => {
  const { spawn } = require("child_process");

  // Assuming running from apps/ui root in dev
  const cwd = process.cwd();

  console.log(
    `[Test] Running test: ${testFile} in ${cwd} with options:`,
    options,
  );

  const cmd = "npx";
  const args = ["playwright", "test", testFile, "--reporter=line"];

  // Handle options
  if (options.headless === false) {
    args.push("--headed");
  }

  if (options.silent === true) {
    args.push("--quiet");
  }

  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd,
      shell: true,
      env: {
        ...process.env,
        FORCE_COLOR: "1",
        NODE_ENV: "development",
      },
    });

    child.stdout.on("data", (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("test-output", {
          testFile,
          type: "stdout",
          data: data.toString(),
        });
      }
    });

    child.stderr.on("data", (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("test-output", {
          testFile,
          type: "stderr",
          data: data.toString(),
        });
      }
    });

    child.on("close", (code) => {
      resolve({ code });
    });

    child.on("error", (err) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("test-output", {
          testFile,
          type: "stderr",
          data: `Failed to start test process: ${err.message}`,
        });
      }
      resolve({ code: 1, error: err.message });
    });
  });
});

// ======= BMAD SETUP IPC HANDLERS =======

// Check if BMAD is installed in a project
ipcMain.handle("bmad:check-install", async (event, { projectPath }) => {
  try {
    const bmadDir = path.join(projectPath || "", "_bmad");
    const exists = fs.existsSync(bmadDir);
    return {
      installed: exists,
      path: exists ? bmadDir : null,
      version: exists ? "v6" : null,
    };
  } catch (err) {
    return { installed: false, error: err.message };
  }
});

// Install BMAD in a project
ipcMain.handle("bmad:install", async (event, options) => {
  try {
    const { projectPath, modules = ["core"] } = options || {};
    if (!projectPath) {
      throw new Error("Project path is required");
    }

    // Create _bmad directory structure
    const bmadDir = path.join(projectPath, "_bmad");
    const outputDir = path.join(projectPath, "_bmad-output");

    await fs.promises.mkdir(bmadDir, { recursive: true });
    await fs.promises.mkdir(outputDir, { recursive: true });
    await fs.promises.mkdir(path.join(bmadDir, "agents"), { recursive: true });
    await fs.promises.mkdir(path.join(bmadDir, "workflows"), {
      recursive: true,
    });

    // Create basic config
    const configPath = path.join(bmadDir, "config.json");
    await fs.promises.writeFile(
      configPath,
      JSON.stringify(
        {
          version: "6.0",
          modules,
          createdAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );

    return { success: true, path: bmadDir, version: "v6" };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Get BMAD status
ipcMain.handle("bmad:get-status", async () => {
  return {
    installed: false,
    version: null,
    path: null,
  };
});

// Read a context file
ipcMain.handle(
  "bmad:read-context",
  async (event, { projectPath, contextType }) => {
    try {
      const fileNames = {
        prd: "prd.md",
        architecture: "architecture.md",
        productBrief: "product-brief.md",
      };
      const fileName = fileNames[contextType];
      if (!fileName) {
        throw new Error(`Unknown context type: ${contextType}`);
      }

      const filePath = path.join(projectPath, "_bmad-output", fileName);
      if (!fs.existsSync(filePath)) {
        return { content: null, exists: false };
      }

      const content = await fs.promises.readFile(filePath, "utf-8");
      return { content, exists: true, path: filePath };
    } catch (err) {
      return { content: null, exists: false, error: err.message };
    }
  },
);

// Write a context file
ipcMain.handle(
  "bmad:write-context",
  async (event, { projectPath, contextType, content }) => {
    try {
      const fileNames = {
        prd: "prd.md",
        architecture: "architecture.md",
        productBrief: "product-brief.md",
      };
      const fileName = fileNames[contextType];
      if (!fileName) {
        throw new Error(`Unknown context type: ${contextType}`);
      }

      const outputDir = path.join(projectPath, "_bmad-output");
      await fs.promises.mkdir(outputDir, { recursive: true });

      const filePath = path.join(outputDir, fileName);
      await fs.promises.writeFile(filePath, content, "utf-8");

      return { success: true, path: filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
);

// List available BMAD modules
ipcMain.handle("bmad:list-modules", async () => {
  return [
    { id: "core", name: "BMAD Core", required: true },
    { id: "ux", name: "UX Design", required: false },
    { id: "testing", name: "Testing & QA", required: false },
    { id: "docs", name: "Documentation", required: false },
    { id: "solo", name: "Solo Dev Mode", required: false },
  ];
});

// Configure IDE
ipcMain.handle("bmad:configure-ide", async (event, { ide, projectPath }) => {
  try {
    // TODO: Implement IDE-specific configuration
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ======= FILE OPERATIONS IPC HANDLERS =======

// Read file
ipcMain.handle("read-file", async (event, { filePath }) => {
  try {
    const content = await fs.promises.readFile(filePath, "utf-8");
    return content;
  } catch (err) {
    throw new Error(`Failed to read file: ${err.message}`);
  }
});

// Write file
ipcMain.handle("write-file", async (event, { filePath, content }) => {
  try {
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(filePath, content, "utf-8");
    return { success: true };
  } catch (err) {
    throw new Error(`Failed to write file: ${err.message}`);
  }
});

// Copy file
ipcMain.handle("copy-file", async (event, { src, dest }) => {
  try {
    const dir = path.dirname(dest);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.copyFile(src, dest);
    return { success: true };
  } catch (err) {
    throw new Error(`Failed to copy file: ${err.message}`);
  }
});

// Select file dialog
ipcMain.handle("select-file", async (event, options = {}) => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: options.filters || [{ name: "All Files", extensions: ["*"] }],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  try {
    const content = await fs.promises.readFile(filePath, "utf-8");
    return { path: filePath, content };
  } catch {
    return { path: filePath, content: null };
  }
});

// Save file dialog
ipcMain.handle("save-file", async (event, options = {}) => {
  const result = await dialog.showSaveDialog({
    defaultPath: options.defaultPath,
    filters: options.filters || [{ name: "All Files", extensions: ["*"] }],
  });

  if (result.canceled || !result.filePath) {
    return { success: false, canceled: true };
  }

  try {
    await fs.promises.writeFile(
      result.filePath,
      options.content || "",
      "utf-8",
    );
    return { success: true, path: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ======= ELECTRON STORE IPC HANDLERS (for @nde/llm package) =======

// Store get
ipcMain.handle("store-get", async (event, { key }) => {
  const currentStore = await getStore();
  return currentStore.get(key);
});

// Store set
ipcMain.handle("store-set", async (event, { key, value }) => {
  const currentStore = await getStore();
  currentStore.set(key, value);
  return { success: true };
});

// Store delete
ipcMain.handle("store-delete", async (event, { key }) => {
  const currentStore = await getStore();
  currentStore.delete(key);
  return { success: true };
});
