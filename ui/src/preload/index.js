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

  // External links
  openExternal: (url) => {
    shell.openExternal(url);
  },
});
