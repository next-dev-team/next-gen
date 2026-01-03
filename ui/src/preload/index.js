const { contextBridge, ipcRenderer, shell } = require("electron");

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
  getQuickToggleShortcut: () =>
    ipcRenderer.invoke("get-quick-toggle-shortcut"),
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
    create: (tabId, url) => ipcRenderer.invoke("browserview-create", { tabId, url }),
    show: (tabId) => ipcRenderer.invoke("browserview-show", { tabId }),
    hideAll: () => ipcRenderer.invoke("browserview-hide-all"),
    destroy: (tabId) => ipcRenderer.invoke("browserview-destroy", { tabId }),
    setBounds: (tabId, bounds) =>
      ipcRenderer.invoke("browserview-set-bounds", { tabId, bounds }),
    loadURL: (tabId, url) =>
      ipcRenderer.invoke("browserview-load-url", { tabId, url }),
    goBack: (tabId) => ipcRenderer.invoke("browserview-go-back", { tabId }),
    goForward: (tabId) => ipcRenderer.invoke("browserview-go-forward", { tabId }),
    reload: (tabId) => ipcRenderer.invoke("browserview-reload", { tabId }),
    setInspectorEnabled: (tabId, enabled) =>
      ipcRenderer.invoke("browserview-set-inspector-enabled", { tabId, enabled }),
    getPageHtml: (tabId) =>
      ipcRenderer.invoke("browserview-get-page-html", { tabId }),
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
  },

  writeProjectFile: (payload) => ipcRenderer.invoke("write-project-file", payload),
  readProjectFile: (payload) => ipcRenderer.invoke("read-project-file", payload),

  // External links
  openExternal: (url) => {
    shell.openExternal(url);
  },
});
