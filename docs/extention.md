# **Complete Electron-Native Extension Development Flow**

I'll build a complete example: **A web page highlighter extension** that lets users highlight text on any webpage and save it.

---

## **Step 1: Project Setup**

### Create Project Structure

```bash
mkdir electron-highlighter
cd electron-highlighter
npm init -y
npm install electron --save-dev
```

### Final Structure:

```
electron-highlighter/
├── main.js                 # Main process (Node.js)
├── preload.js             # Bridge script
├── index.html             # Optional: Extension UI
├── renderer.js            # Optional: Extension UI logic
├── extension/
│   ├── content.js         # Code injected into pages
│   ├── background.js      # Background logic
│   └── storage.js         # Data persistence
├── assets/
│   └── icon.png
└── package.json
```

---

## **Step 2: package.json**

```json
{
  "name": "electron-highlighter",
  "version": "1.0.0",
  "description": "Highlight and save text from any webpage",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "dev": "electron . --inspect=5858"
  },
  "devDependencies": {
    "electron": "^28.0.0"
  }
}
```

---

## **Step 3: Main Process (main.js)**

```javascript
const { app, BrowserWindow, ipcMain, session, Menu } = require("electron");
const path = require("path");
const fs = require("fs").promises;

let mainWindow;
let extensionWindow;
const HIGHLIGHTS_FILE = path.join(app.getPath("userData"), "highlights.json");

// Initialize app
app.whenReady().then(async () => {
  await setupExtension();
  createMainWindow();
  createExtensionUI();
  setupMenu();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

// Create main browser window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadURL("https://example.com");

  // Open DevTools in development
  if (process.argv.includes("--inspect")) {
    mainWindow.webContents.openDevTools();
  }
}

// Create extension control panel
function createExtensionUI() {
  extensionWindow = new BrowserWindow({
    width: 400,
    height: 600,
    x: 50,
    y: 50,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  extensionWindow.loadFile("index.html");
}

// Setup custom menu
function setupMenu() {
  const template = [
    {
      label: "Extension",
      submenu: [
        {
          label: "Show Highlights",
          click: () => extensionWindow.show(),
        },
        {
          label: "Clear All Highlights",
          click: async () => {
            await clearAllHighlights();
            refreshAllWindows();
          },
        },
      ],
    },
    {
      label: "Navigate",
      submenu: [
        {
          label: "Go to Example.com",
          click: () => mainWindow.loadURL("https://example.com"),
        },
        {
          label: "Go to Wikipedia",
          click: () => mainWindow.loadURL("https://wikipedia.org"),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Setup extension functionality
async function setupExtension() {
  console.log("Setting up extension features...");

  // Ensure highlights file exists
  try {
    await fs.access(HIGHLIGHTS_FILE);
  } catch {
    await fs.writeFile(HIGHLIGHTS_FILE, JSON.stringify([]));
  }

  // Inject content script into all pages
  app.on("web-contents-created", (event, contents) => {
    contents.on("did-finish-load", async () => {
      const url = contents.getURL();

      // Don't inject into extension UI
      if (url.startsWith("file://")) return;

      console.log("Injecting into:", url);

      // Read content script
      const contentScript = await fs.readFile(
        path.join(__dirname, "extension", "content.js"),
        "utf-8"
      );

      // Inject the script
      await contents.executeJavaScript(contentScript);

      // Load existing highlights for this page
      const highlights = await loadHighlights(url);
      await contents.executeJavaScript(`
        if (window.ExtensionContent) {
          window.ExtensionContent.loadHighlights(${JSON.stringify(highlights)});
        }
      `);
    });
  });

  // Setup IPC handlers (like background script)
  setupIPCHandlers();
}

// IPC Handlers (Background Logic)
function setupIPCHandlers() {
  // Save highlight
  ipcMain.handle("extension:saveHighlight", async (event, highlight) => {
    try {
      const highlights = await loadAllHighlights();

      highlight.id = Date.now().toString();
      highlight.timestamp = new Date().toISOString();

      highlights.push(highlight);

      await fs.writeFile(HIGHLIGHTS_FILE, JSON.stringify(highlights, null, 2));

      // Notify extension UI
      if (extensionWindow) {
        extensionWindow.webContents.send("highlights-updated", highlights);
      }

      return { success: true, highlight };
    } catch (error) {
      console.error("Error saving highlight:", error);
      return { success: false, error: error.message };
    }
  });

  // Get all highlights
  ipcMain.handle("extension:getHighlights", async (event, url) => {
    try {
      if (url) {
        return await loadHighlights(url);
      }
      return await loadAllHighlights();
    } catch (error) {
      console.error("Error loading highlights:", error);
      return [];
    }
  });

  // Delete highlight
  ipcMain.handle("extension:deleteHighlight", async (event, id) => {
    try {
      let highlights = await loadAllHighlights();
      highlights = highlights.filter((h) => h.id !== id);

      await fs.writeFile(HIGHLIGHTS_FILE, JSON.stringify(highlights, null, 2));

      // Notify all windows
      refreshAllWindows();

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Navigate to highlight
  ipcMain.handle("extension:navigateToHighlight", async (event, highlight) => {
    if (mainWindow) {
      await mainWindow.loadURL(highlight.url);
      // Wait for page to load, then scroll to highlight
      mainWindow.webContents.once("did-finish-load", () => {
        mainWindow.webContents.executeJavaScript(`
          if (window.ExtensionContent) {
            window.ExtensionContent.scrollToHighlight('${highlight.id}');
          }
        `);
      });
    }
  });
}

// Helper functions
async function loadAllHighlights() {
  try {
    const data = await fs.readFile(HIGHLIGHTS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function loadHighlights(url) {
  const all = await loadAllHighlights();
  return all.filter((h) => h.url === url);
}

async function clearAllHighlights() {
  await fs.writeFile(HIGHLIGHTS_FILE, JSON.stringify([]));
}

function refreshAllWindows() {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (win.webContents.getURL().startsWith("http")) {
      win.webContents.reload();
    } else {
      // Refresh extension UI
      win.webContents.send("highlights-updated", []);
    }
  });
}
```

---

## **Step 4: Preload Script (preload.js)**

```javascript
const { contextBridge, ipcRenderer } = require("electron");

// Expose safe APIs to renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  // Highlight operations
  saveHighlight: (highlight) =>
    ipcRenderer.invoke("extension:saveHighlight", highlight),

  getHighlights: (url) => ipcRenderer.invoke("extension:getHighlights", url),

  deleteHighlight: (id) => ipcRenderer.invoke("extension:deleteHighlight", id),

  navigateToHighlight: (highlight) =>
    ipcRenderer.invoke("extension:navigateToHighlight", highlight),

  // Listen for updates
  onHighlightsUpdated: (callback) => {
    ipcRenderer.on("highlights-updated", (event, highlights) => {
      callback(highlights);
    });
  },
});

console.log("Preload script loaded");
```

---

## **Step 5: Content Script (extension/content.js)**

This gets injected into every webpage:

```javascript
// Content script - runs on every page
(function () {
  "use strict";

  console.log("Extension content script loaded");

  // Create namespace
  window.ExtensionContent = {
    highlights: [],

    // Initialize
    init: function () {
      this.setupHighlightListener();
      this.injectStyles();
    },

    // Setup text selection listener
    setupHighlightListener: function () {
      document.addEventListener("mouseup", async () => {
        const selection = window.getSelection();
        const text = selection.toString().trim();

        if (text.length > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();

          // Show highlight button
          this.showHighlightButton(rect, text, range);
        }
      });
    },

    // Show button to save highlight
    showHighlightButton: function (rect, text, range) {
      // Remove existing button
      const existing = document.getElementById("extension-highlight-btn");
      if (existing) existing.remove();

      // Create button
      const button = document.createElement("button");
      button.id = "extension-highlight-btn";
      button.textContent = "💡 Highlight";
      button.style.cssText = `
        position: absolute;
        left: ${rect.left + window.scrollX}px;
        top: ${rect.bottom + window.scrollY + 5}px;
        z-index: 10000;
        padding: 8px 12px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      `;

      button.addEventListener("click", async (e) => {
        e.stopPropagation();
        await this.saveHighlight(text, range);
        button.remove();
        window.getSelection().removeAllRanges();
      });

      // Auto-remove after 5 seconds
      setTimeout(() => button.remove(), 5000);

      document.body.appendChild(button);
    },

    // Save highlight
    saveHighlight: async function (text, range) {
      // Create unique identifier for this text position
      const xpath = this.getXPath(range.startContainer);

      const highlight = {
        text: text,
        url: window.location.href,
        title: document.title,
        xpath: xpath,
        offset: range.startOffset,
      };

      // Send to main process
      const result = await window.electronAPI.saveHighlight(highlight);

      if (result.success) {
        // Mark text as highlighted
        this.markHighlight(range, result.highlight.id);
        this.showNotification("Highlight saved!");
      }
    },

    // Mark text with highlight
    markHighlight: function (range, id) {
      const span = document.createElement("span");
      span.className = "extension-highlight";
      span.dataset.highlightId = id;
      span.style.backgroundColor = "#ffeb3b";
      span.style.cursor = "pointer";

      try {
        range.surroundContents(span);

        // Add click listener to remove
        span.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (confirm("Delete this highlight?")) {
            await window.electronAPI.deleteHighlight(id);
            span.replaceWith(...span.childNodes);
          }
        });
      } catch (e) {
        console.error("Could not highlight:", e);
      }
    },

    // Load existing highlights for this page
    loadHighlights: function (highlights) {
      this.highlights = highlights;
      console.log(`Loading ${highlights.length} highlights`);

      highlights.forEach((h) => {
        try {
          const node = this.getNodeByXPath(h.xpath);
          if (node && node.textContent) {
            const text = node.textContent;
            const index = text.indexOf(h.text);

            if (index !== -1) {
              const range = document.createRange();
              range.setStart(node, index);
              range.setEnd(node, index + h.text.length);
              this.markHighlight(range, h.id);
            }
          }
        } catch (e) {
          console.error("Could not restore highlight:", e);
        }
      });
    },

    // Scroll to specific highlight
    scrollToHighlight: function (id) {
      const element = document.querySelector(`[data-highlight-id="${id}"]`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.style.backgroundColor = "#ff9800"; // Orange flash
        setTimeout(() => {
          element.style.backgroundColor = "#ffeb3b";
        }, 1000);
      }
    },

    // Get XPath for element
    getXPath: function (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode;
      }

      if (node.id) {
        return `//*[@id="${node.id}"]`;
      }

      const path = [];
      while (node && node.nodeType === Node.ELEMENT_NODE) {
        let index = 0;
        let sibling = node.previousSibling;

        while (sibling) {
          if (
            sibling.nodeType === Node.ELEMENT_NODE &&
            sibling.nodeName === node.nodeName
          ) {
            index++;
          }
          sibling = sibling.previousSibling;
        }

        const tagName = node.nodeName.toLowerCase();
        const pathIndex = index ? `[${index + 1}]` : "";
        path.unshift(`${tagName}${pathIndex}`);

        node = node.parentNode;
      }

      return `/${path.join("/")}`;
    },

    // Get node by XPath
    getNodeByXPath: function (xpath) {
      return document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
    },

    // Inject custom styles
    injectStyles: function () {
      if (document.getElementById("extension-styles")) return;

      const style = document.createElement("style");
      style.id = "extension-styles";
      style.textContent = `
        .extension-highlight {
          background-color: #ffeb3b !important;
          transition: background-color 0.3s;
        }
        .extension-highlight:hover {
          background-color: #fdd835 !important;
        }
      `;
      document.head.appendChild(style);
    },

    // Show notification
    showNotification: function (message) {
      const notification = document.createElement("div");
      notification.textContent = message;
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10001;
        padding: 15px 20px;
        background: #4CAF50;
        color: white;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        font-size: 14px;
      `;

      document.body.appendChild(notification);

      setTimeout(() => {
        notification.style.opacity = "0";
        notification.style.transition = "opacity 0.3s";
        setTimeout(() => notification.remove(), 300);
      }, 2000);
    },
  };

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      window.ExtensionContent.init();
    });
  } else {
    window.ExtensionContent.init();
  }
})();
```

---

## **Step 6: Extension UI (index.html)**

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Highlighter Extension</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family:
          -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
        background: #f5f5f5;
        padding: 20px;
      }

      h1 {
        font-size: 24px;
        margin-bottom: 20px;
        color: #333;
      }

      .stats {
        background: white;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 20px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .stats-number {
        font-size: 32px;
        font-weight: bold;
        color: #4caf50;
      }

      .highlights-list {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        max-height: 450px;
        overflow-y: auto;
      }

      .highlight-item {
        padding: 15px;
        border-bottom: 1px solid #eee;
        cursor: pointer;
        transition: background 0.2s;
      }

      .highlight-item:hover {
        background: #f9f9f9;
      }

      .highlight-item:last-child {
        border-bottom: none;
      }

      .highlight-text {
        font-weight: 500;
        margin-bottom: 8px;
        color: #333;
        line-height: 1.4;
      }

      .highlight-meta {
        font-size: 12px;
        color: #666;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .highlight-url {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 70%;
      }

      .highlight-delete {
        background: #f44336;
        color: white;
        border: none;
        padding: 4px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
      }

      .highlight-delete:hover {
        background: #d32f2f;
      }

      .empty-state {
        text-align: center;
        padding: 40px;
        color: #999;
      }

      .clear-all {
        width: 100%;
        padding: 12px;
        background: #ff9800;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        margin-top: 15px;
        font-weight: 500;
      }

      .clear-all:hover {
        background: #f57c00;
      }
    </style>
  </head>
  <body>
    <h1>💡 Your Highlights</h1>

    <div class="stats">
      <div class="stats-number" id="totalCount">0</div>
      <div>Total Highlights</div>
    </div>

    <div class="highlights-list" id="highlightsList">
      <div class="empty-state">
        No highlights yet. Select text on any webpage and click "Highlight"!
      </div>
    </div>

    <button class="clear-all" id="clearAll">Clear All Highlights</button>

    <script src="renderer.js"></script>
  </body>
</html>
```

---

## **Step 7: Extension UI Logic (renderer.js)**

```javascript
// Renderer process for extension UI

let allHighlights = [];

// Load highlights on start
async function loadHighlights() {
  allHighlights = await window.electronAPI.getHighlights();
  renderHighlights();
}

// Render highlights list
function renderHighlights() {
  const list = document.getElementById("highlightsList");
  const count = document.getElementById("totalCount");

  count.textContent = allHighlights.length;

  if (allHighlights.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        No highlights yet. Select text on any webpage and click "Highlight"!
      </div>
    `;
    return;
  }

  // Sort by timestamp, newest first
  allHighlights.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  list.innerHTML = allHighlights
    .map(
      (h) => `
    <div class="highlight-item" data-id="${h.id}">
      <div class="highlight-text">"${h.text}"</div>
      <div class="highlight-meta">
        <span class="highlight-url" title="${h.url}">${h.title || h.url}</span>
        <button class="highlight-delete" data-id="${h.id}">Delete</button>
      </div>
    </div>
  `
    )
    .join("");

  // Add event listeners
  document.querySelectorAll(".highlight-item").forEach((item) => {
    const id = item.dataset.id;
    const highlight = allHighlights.find((h) => h.id === id);

    item.addEventListener("click", (e) => {
      if (!e.target.classList.contains("highlight-delete")) {
        window.electronAPI.navigateToHighlight(highlight);
      }
    });
  });

  document.querySelectorAll(".highlight-delete").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;

      if (confirm("Delete this highlight?")) {
        await window.electronAPI.deleteHighlight(id);
        await loadHighlights();
      }
    });
  });
}

// Clear all button
document.getElementById("clearAll").addEventListener("click", async () => {
  if (confirm("Delete ALL highlights? This cannot be undone!")) {
    for (const h of allHighlights) {
      await window.electronAPI.deleteHighlight(h.id);
    }
    await loadHighlights();
  }
});

// Listen for updates from main process
window.electronAPI.onHighlightsUpdated((highlights) => {
  allHighlights = highlights;
  renderHighlights();
});

// Initial load
loadHighlights();
```

---

## **Step 8: Run the Application**

```bash
npm start
```

---

## **How It Works - Complete Flow:**

### **1. User Flow:**

```
User selects text on webpage
  ↓
Content script detects selection
  ↓
Shows "Highlight" button
  ↓
User clicks button
  ↓
Content script sends to Main Process (via preload)
  ↓
Main Process saves to file
  ↓
Main Process notifies Extension UI
  ↓
Text is marked with yellow background
```

### **2. Architecture:**

```
┌─────────────────────────────────────────┐
│           Main Process (main.js)         │
│  - Manages windows                       │
│  - Handles file I/O                      │
│  - Injects content scripts               │
│  - Background logic (IPC handlers)       │
└────────────┬────────────────────────────┘
             │
             │ (IPC Communication)
             │
      ┌──────┴──────┐
      │             │
┌─────▼─────┐  ┌───▼──────────┐
│  Preload  │  │   Preload    │
│  Script   │  │   Script     │
└─────┬─────┘  └───┬──────────┘
      │            │
┌─────▼─────┐  ┌───▼──────────┐
│  Web Page │  │ Extension UI │
│ (content) │  │  (renderer)  │
└───────────┘  └──────────────┘
```

### **3. Data Flow:**

```
Webpage → Content Script → Preload → Main Process → File System
                                          ↓
                                    Extension UI
```

---

## **Step 9: Advanced Features You Can Add**

### **1. Different highlight colors:**

```javascript
// In content.js
const colors = ['#ffeb3b', '#ff9800', '#4CAF50', '#2196F3'];
let currentColor = 0;

// Show color picker
showColorPicker: function(rect) {
  // Add color selection UI
}
```

### **2. Search highlights:**

```javascript
// In renderer.js
const searchInput = document.createElement("input");
searchInput.addEventListener("input", (e) => {
  const filtered = allHighlights.filter((h) =>
    h.text.toLowerCase().includes(e.target.value.toLowerCase())
  );
  renderHighlights(filtered);
});
```

### **3. Export highlights:**

```javascript
// In main.js
ipcMain.handle("extension:exportHighlights", async () => {
  const highlights = await loadAllHighlights();
  const csv = highlights
    .map((h) => `"${h.text}","${h.url}","${h.timestamp}"`)
    .join("\n");

  // Save to file
  const { dialog } = require("electron");
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: "highlights.csv",
  });

  if (filePath) {
    await fs.writeFile(filePath, csv);
  }
});
```

### **4. Sync across devices:**

```javascript
// Add cloud sync
const axios = require("axios");

async function syncHighlights() {
  const local = await loadAllHighlights();
  const response = await axios.post("https://your-api.com/sync", {
    highlights: local,
  });
  // Merge with server data
}
```

---

## **Step 10: Debugging Tips**

### **Main Process:**

```bash
npm run dev
# Open chrome://inspect in Chrome
```

### **Renderer/Content:**

- Press `Ctrl+Shift+I` in the window
- Check Console tab for errors
- Use `console.log()` extensively

### **Common Issues:**

1. **Content script not injecting:**
   - Check `did-finish-load` event fires
   - Verify file path is correct
   - Check for JavaScript errors

2. **IPC not working:**
   - Ensure preload script loaded
   - Check `contextBridge` setup
   - Verify handler names match

3. **Highlights not persisting:**
   - Check file permissions
   - Verify `app.getPath('userData')` works
   - Check JSON is valid

---

## **Step 11: Package for Distribution**

```bash
npm install electron-builder --save-dev
```

Add to `package.json`:

```json
"build": {
  "appId": "com.yourname.highlighter",
  "files": [
    "main.js",
    "preload.js",
    "index.html",
    "renderer.js",
    "extension/**/*"
  ]
},
"scripts": {
  "dist": "electron-builder"
}
```

Build:

```bash
npm run dist
```

---

## **Complete! 🎉**

You now have a fully functional Electron-native extension with:

- ✅ Content script injection
- ✅ Background logic (IPC handlers)
- ✅ Data persistence
- ✅ Extension UI
- ✅ Real-world features (highlight, save, navigate)
