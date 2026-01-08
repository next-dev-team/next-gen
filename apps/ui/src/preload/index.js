const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },

  // Settings
  getStartOnBoot: () => ipcRenderer.invoke("get-start-on-boot"),
  setStartOnBoot: (enabled) => ipcRenderer.invoke("set-start-on-boot", enabled),
  getRunInBackground: () => ipcRenderer.invoke("get-run-in-background"),
  setRunInBackground: (enabled) =>
    ipcRenderer.invoke("set-run-in-background", enabled),
  getKeyboardControlsEnabled: () =>
    ipcRenderer.invoke("get-keyboard-controls-enabled"),
  setKeyboardControlsEnabled: (enabled) =>
    ipcRenderer.invoke("set-keyboard-controls-enabled", enabled),
  getQuickToggleEnabled: () => ipcRenderer.invoke("get-quick-toggle-enabled"),
  setQuickToggleEnabled: (enabled) =>
    ipcRenderer.invoke("set-quick-toggle-enabled", enabled),
  getQuickToggleShortcut: () => ipcRenderer.invoke("get-quick-toggle-shortcut"),
  getAppVisibility: () => ipcRenderer.invoke("get-app-visibility"),
  showApp: () => ipcRenderer.invoke("app-show-window"),
  hideApp: () => ipcRenderer.invoke("app-hide-window"),
  toggleApp: () => ipcRenderer.invoke("app-toggle-window"),
  onSettingsChanged: (callback) => {
    const handler = (event, payload) => callback(payload);
    ipcRenderer.on("settings-changed", handler);
    return () => ipcRenderer.removeListener("settings-changed", handler);
  },
  onAppVisibilityChanged: (callback) => {
    const handler = (event, payload) => callback(payload);
    ipcRenderer.on("app-visibility-changed", handler);
    return () => ipcRenderer.removeListener("app-visibility-changed", handler);
  },
  onPowerStateChanged: (callback) => {
    const handler = (event, payload) => callback(payload);
    ipcRenderer.on("power-state-changed", handler);
    return () => ipcRenderer.removeListener("power-state-changed", handler);
  },

  updates: {
    getState: () => ipcRenderer.invoke("updates-get-state"),
    check: () => ipcRenderer.invoke("updates-check"),
    download: () => ipcRenderer.invoke("updates-download"),
    install: () => ipcRenderer.invoke("updates-install"),
    onStateChanged: (callback) => {
      const handler = (event, payload) => callback(payload);
      ipcRenderer.on("updates-state-changed", handler);
      return () => ipcRenderer.removeListener("updates-state-changed", handler);
    },
  },

  // Generator
  runGenerator: (generatorName, answers) =>
    ipcRenderer.invoke("run-generator", { generatorName, answers }),

  // Streaming logs listener
  onGeneratorLog: (callback) => {
    const handler = (event, log) => callback(log);
    ipcRenderer.on("generator-log", handler);
    // Return cleanup function
    return () => ipcRenderer.removeListener("generator-log", handler);
  },

  // Folder selection dialog
  selectFolder: (options = {}) => ipcRenderer.invoke("select-folder", options),

  // Open folder in file explorer
  openFolder: (folderPath) => ipcRenderer.invoke("open-folder", folderPath),

  // Get project root path
  getProjectRoot: () => ipcRenderer.invoke("get-project-root"),

  // ======= PROJECT LAUNCHER =======

  // Get all saved projects
  getProjects: () => ipcRenderer.invoke("get-projects"),

  // Save a project
  saveProject: (project) => ipcRenderer.invoke("save-project", project),

  // Delete a project
  deleteProject: (projectId) => ipcRenderer.invoke("delete-project", projectId),

  // Uninstall app
  uninstallApp: () => ipcRenderer.invoke("app-uninstall"),

  // Open project in IDE
  openInIDE: (projectPath, ide) =>
    ipcRenderer.invoke("open-in-ide", { projectPath, ide }),

  // Check if path exists
  checkPathExists: (path) => ipcRenderer.invoke("check-path-exists", path),

  // ======= SCRUM BOARD =======

  getScrumState: () => ipcRenderer.invoke("get-scrum-state"),
  setScrumState: (nextState) =>
    ipcRenderer.invoke("set-scrum-state", nextState),

  // ======= MCP SERVER =======
  startMcpServer: () => ipcRenderer.invoke("mcp-server-start"),
  stopMcpServer: () => ipcRenderer.invoke("mcp-server-stop"),
  getMcpServerStatus: () => ipcRenderer.invoke("mcp-server-status"),
  onMcpLog: (callback) => {
    const handler = (event, log) => callback(log);
    ipcRenderer.on("mcp-server-log", handler);
    return () => ipcRenderer.removeListener("mcp-server-log", handler);
  },
  getMcpLogs: () => ipcRenderer.invoke("get-mcp-logs"),

  // ======= BMAD METHOD =======
  runBmadCli: (options) => ipcRenderer.invoke("bmad-cli-run", options),
  stopBmadCli: () => ipcRenderer.invoke("bmad-cli-stop"),
  sendBmadCliInput: (payload) => ipcRenderer.invoke("bmad-cli-input", payload),
  getBmadLogs: () => ipcRenderer.invoke("get-bmad-logs"),
  onBmadLog: (callback) => {
    const handler = (event, log) => callback(log);
    ipcRenderer.on("bmad-cli-log", handler);
    return () => ipcRenderer.removeListener("bmad-cli-log", handler);
  },

  browserView: {
    create: (tabId, url, profileId) =>
      ipcRenderer.invoke("browserview-create", { tabId, url, profileId }),
    show: (tabId, visible = true) =>
      ipcRenderer.invoke("browserview-show", { tabId, visible }),
    hideAll: () => ipcRenderer.invoke("browserview-hide-all"),
    destroy: (tabId) => ipcRenderer.invoke("browserview-destroy", { tabId }),
    setBounds: (tabId, bounds) =>
      ipcRenderer.invoke("browserview-set-bounds", { tabId, bounds }),
    loadURL: (tabId, url) =>
      ipcRenderer.invoke("browserview-load-url", { tabId, url }),
    goBack: (tabId) => ipcRenderer.invoke("browserview-go-back", { tabId }),
    goForward: (tabId) =>
      ipcRenderer.invoke("browserview-go-forward", { tabId }),
    reload: (tabId, ignoreCache = false) =>
      ipcRenderer.invoke("browserview-reload", { tabId, ignoreCache }),
    setInspectorEnabled: (tabId, enabled) =>
      ipcRenderer.invoke("browserview-set-inspector-enabled", {
        tabId,
        enabled,
      }),
    getPageHtml: (tabId) =>
      ipcRenderer.invoke("browserview-get-page-html", { tabId }),
    captureRegion: (tabId, rect) =>
      ipcRenderer.invoke("browserview-capture-region", { tabId, rect }),
    capturePage: (tabId) =>
      ipcRenderer.invoke("browserview-capture-page", { tabId }),
    onInspectorHover: (callback) => {
      const handler = (event, payload) => callback(payload);
      ipcRenderer.on("browserview-inspector-hover", handler);
      return () =>
        ipcRenderer.removeListener("browserview-inspector-hover", handler);
    },
    onInspectorSelection: (callback) => {
      const handler = (event, payload) => callback(payload);
      ipcRenderer.on("browserview-inspector-selection", handler);
      return () =>
        ipcRenderer.removeListener("browserview-inspector-selection", handler);
    },
    onState: (callback) => {
      const handler = (event, payload) => callback(payload);
      ipcRenderer.on("browserview-state", handler);
      return () => ipcRenderer.removeListener("browserview-state", handler);
    },
    getAdblockEnabled: () => ipcRenderer.invoke("adblock-get-enabled"),
    setAdblockEnabled: (enabled) =>
      ipcRenderer.invoke("adblock-set-enabled", enabled),
    onAdblockState: (callback) => {
      const handler = (event, payload) => callback(payload);
      ipcRenderer.on("adblock-state", handler);
      return () => ipcRenderer.removeListener("adblock-state", handler);
    },
    getPopupStats: (tabId) =>
      ipcRenderer.invoke("browserview-get-popup-stats", { tabId }),
    clearPopupStats: (tabId) =>
      ipcRenderer.invoke("browserview-clear-popup-stats", { tabId }),
  },

  // ======= ANTI-DETECTION / FINGERPRINTING PROTECTION =======
  antiDetection: {
    // Get list of all available device profiles
    listProfiles: () => ipcRenderer.invoke("anti-detection:list-profiles"),

    // Get the current active profile for a browser tab
    getActiveProfile: (tabId) =>
      ipcRenderer.invoke("anti-detection:get-active-profile", { tabId }),

    // Switch to a different device profile
    switchProfile: (tabId, profileId) =>
      ipcRenderer.invoke("anti-detection:switch-profile", { tabId, profileId }),

    // Apply random variations to current profile (timezone, screen, etc.)
    randomizeProfile: (tabId) =>
      ipcRenderer.invoke("anti-detection:randomize-profile", { tabId }),

    // Create a custom profile based on an existing one
    createCustomProfile: (baseProfileId, customizations) =>
      ipcRenderer.invoke("anti-detection:create-custom-profile", {
        baseProfileId,
        customizations,
      }),

    // Proxy management
    setProxy: (profileId, proxyData) =>
      ipcRenderer.invoke("anti-detection:set-proxy", {
        profileId,
        proxyData,
      }),
    getProxy: (profileId) =>
      ipcRenderer.invoke("anti-detection:get-proxy", { profileId }),
    getAllProxies: () => ipcRenderer.invoke("anti-detection:get-all-proxies"),
  },

  appCapture: {
    captureRegion: (rect) => ipcRenderer.invoke("app-capture-region", { rect }),
    capturePage: () => ipcRenderer.invoke("app-capture-page"),
  },

  externalCapture: {
    capturePrimaryScreen: () =>
      ipcRenderer.invoke("external-capture-primary-screen"),
    capturePrimaryScreenRegion: () =>
      ipcRenderer.invoke("external-capture-primary-screen-region"),
  },

  clipboardWriteText: (text) =>
    ipcRenderer.invoke("clipboard-write-text", text),

  clipboardWriteImageDataUrl: (dataUrl) =>
    ipcRenderer.invoke("clipboard-write-image-data-url", { dataUrl }),

  writeProjectFile: (payload) =>
    ipcRenderer.invoke("write-project-file", payload),
  readProjectFile: (payload) =>
    ipcRenderer.invoke("read-project-file", payload),

  // E2E Tests
  tests: {
    run: (testFile, options) =>
      ipcRenderer.invoke("run-e2e-test", { testFile, options }),
    onOutput: (callback) => {
      const handler = (event, payload) => callback(payload);
      ipcRenderer.on("test-output", handler);
      return () => ipcRenderer.removeListener("test-output", handler);
    },
  },

  // External links
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
});
