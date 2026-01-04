const { ipcRenderer } = require("electron");

const MAX_OUTER_HTML_CHARS = 200_000;

function sanitizePayload(payload) {
  if (!payload || typeof payload !== "object") return null;

  const next = {
    tagName: payload.tagName ? String(payload.tagName) : undefined,
    id: payload.id ? String(payload.id) : undefined,
    className: payload.className ? String(payload.className) : undefined,
    text: payload.text ? String(payload.text).slice(0, 500) : undefined,
    selector: payload.selector
      ? String(payload.selector).slice(0, 2000)
      : undefined,
    outerHTML: payload.outerHTML
      ? String(payload.outerHTML).slice(0, MAX_OUTER_HTML_CHARS)
      : undefined,
    rect:
      payload.rect && typeof payload.rect === "object"
        ? {
            x: Number(payload.rect.x) || 0,
            y: Number(payload.rect.y) || 0,
            width: Number(payload.rect.width) || 0,
            height: Number(payload.rect.height) || 0,
          }
        : undefined,
  };

  return next;
}

function getSelector(el) {
  if (!el) return "";
  if (el.id) return `#${el.id}`;
  if (el.tagName === "BODY") return "body";
  let path = el.tagName.toLowerCase();
  if (el.className) {
    const classes = Array.from(el.classList || [])
      .map((c) => String(c || "").trim())
      .filter(Boolean)
      .join(".");
    if (classes) path += `.${classes}`;
  }
  return path;
}

function getElementInfo(el) {
  const rect = el.getBoundingClientRect();
  return sanitizePayload({
    tagName: el.tagName,
    id: el.id,
    className: el.className,
    text: el.innerText,
    selector: getSelector(el),
    outerHTML: el.outerHTML,
    rect: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    },
  });
}

let cleanup = null;
let currentTabId = null;

function enableInspector() {
  if (cleanup) return;
  if (window.__inspector_active) return;
  window.__inspector_active = true;

  const style = document.createElement("style");
  style.id = "inspector-style";
  style.innerHTML = `
    .__inspector_overlay {
      position: fixed !important;
      pointer-events: none !important;
      z-index: 2147483647 !important;
      background: rgba(99, 102, 241, 0.2) !important;
      border: 2px solid rgb(99, 102, 241) !important;
      transition: all 0.1s ease-out !important;
    }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.className = "__inspector_overlay";
  document.body.appendChild(overlay);

  const onMouseMove = (e) => {
    const prevDisplay = overlay.style.display;
    overlay.style.display = "none";
    const el = document.elementFromPoint(e.clientX, e.clientY);
    overlay.style.display = prevDisplay;
    if (!el || el === overlay || el.closest(".__inspector_overlay")) return;

    const rect = el.getBoundingClientRect();
    overlay.style.top = rect.top + "px";
    overlay.style.left = rect.left + "px";
    overlay.style.width = rect.width + "px";
    overlay.style.height = rect.height + "px";

    const payload = getElementInfo(el);
    if (payload) {
      ipcRenderer.send("inspector-hover", { ...payload, tabId: currentTabId });
    }
  };

  const onMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === "function") {
      e.stopImmediatePropagation();
    }
    const prevDisplay = overlay.style.display;
    overlay.style.display = "none";
    const el = document.elementFromPoint(e.clientX, e.clientY);
    overlay.style.display = prevDisplay;
    if (!el || el === overlay || el.closest(".__inspector_overlay")) return;

    const payload = getElementInfo(el);
    if (payload) {
      ipcRenderer.send("inspector-selection", {
        ...payload,
        tabId: currentTabId,
      });
    }
  };

  document.addEventListener("mousemove", onMouseMove, true);
  document.addEventListener("mousedown", onMouseDown, true);

  cleanup = () => {
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("mousedown", onMouseDown, true);
    try {
      style.remove();
    } catch {}
    try {
      overlay.remove();
    } catch {}
    window.__inspector_active = false;
    cleanup = null;
  };

  window.addEventListener(
    "beforeunload",
    () => {
      if (cleanup) cleanup();
    },
    { once: true }
  );
}

function disableInspector() {
  if (cleanup) cleanup();
}

ipcRenderer.on("browserview-inspector-enabled", (_event, payload) => {
  const enabled =
    payload && typeof payload === "object"
      ? Boolean(payload.enabled)
      : Boolean(payload);

  if (payload && typeof payload === "object" && payload.tabId != null) {
    currentTabId = String(payload.tabId);
  }

  if (enabled) enableInspector();
  else disableInspector();
});
