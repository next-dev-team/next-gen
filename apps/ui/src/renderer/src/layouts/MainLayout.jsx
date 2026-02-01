import {
  AppWindow,
  Camera,
  Folder,
  Github,
  Globe,
  LayoutGrid,
  Pin,
  PinOff,
  Rocket,
  Search,
  Settings,
  Sparkles,
  Table,
  TestTube,
} from "lucide-react";
import React, { lazy, Suspense } from "react";
import { useLocation, useNavigate, useOutlet } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import { useResourceStore } from "../stores/resourceStore";

// Lazy load dialog components
const OCRCapture = lazy(() => import("../components/OCRCapture"));
const DeviceMockup = lazy(() => import("../components/DeviceMockup"));
const WallpaperPicker = lazy(() => import("../components/WallpaperPicker"));
const PluginManager = lazy(() => import("../components/PluginManager"));
const MCPInstaller = lazy(() => import("../components/MCPInstaller"));

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function KeepAliveOutlet({ outletContext, keepAliveKeys }) {
  const location = useLocation();
  const outlet = useOutlet(outletContext);
  const cacheRef = React.useRef(new Map());
  const [, forceRender] = React.useState(0);

  const currentKey =
    location.pathname === "/"
      ? "generator"
      : location.pathname.substring(1).split("/")[0];
  const shouldKeepAlive = keepAliveKeys.includes(currentKey);

  React.useEffect(() => {
    if (!shouldKeepAlive) return;
    if (!outlet) return;
    if (cacheRef.current.has(currentKey)) return;

    cacheRef.current.set(currentKey, outlet);
    forceRender((v) => v + 1);
  }, [currentKey, outlet, shouldKeepAlive]);

  const entries = Array.from(cacheRef.current.entries());
  const hasCurrent = cacheRef.current.has(currentKey);
  const renderEntries =
    shouldKeepAlive && outlet && !hasCurrent
      ? [...entries, [currentKey, outlet]]
      : entries;

  return (
    <div className="relative flex-1 min-h-0 w-full">
      {renderEntries.map(([key, element]) => (
        <div
          key={key}
          className="absolute inset-0 w-full h-full"
          style={{ display: key === currentKey ? "block" : "none" }}
        >
          {element}
        </div>
      ))}
      {!shouldKeepAlive ? <div className="w-full h-full">{outlet}</div> : null}
    </div>
  );
}

export default function MainLayout({
  isDarkMode,
  setIsDarkMode,
  designMode,
  setDesignMode,
  dockSettings,
  setDockSettings,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const isWeb = typeof __WEB__ !== "undefined" && Boolean(__WEB__);
  const canAppCapture =
    !isWeb &&
    Boolean(
      window.electronAPI?.appCapture?.capturePage &&
      window.electronAPI?.appCapture?.captureRegion &&
      window.electronAPI?.clipboardWriteImageDataUrl,
    );

  const canExternalCapture =
    !isWeb &&
    Boolean(
      window.electronAPI?.externalCapture?.capturePrimaryScreen &&
      window.electronAPI?.clipboardWriteImageDataUrl,
    );

  const canCapture = canAppCapture || canExternalCapture;

  const canOpenExternal = Boolean(window.electronAPI?.openExternal);

  const withAutoHideApp = React.useCallback(
    async (fn) => {
      const hideApp = window.electronAPI?.hideApp;
      const showApp = window.electronAPI?.showApp;
      const canAutoHide =
        !isWeb &&
        typeof hideApp === "function" &&
        typeof showApp === "function";

      if (!canAutoHide) return await fn();

      try {
        await hideApp();
      } catch {}

      await new Promise((r) => setTimeout(r, 180));

      try {
        return await fn();
      } finally {
        try {
          await showApp();
        } catch {}
      }
    },
    [isWeb],
  );

  const addScreenshot = useResourceStore((s) => s.addScreenshot);

  const [captureOverlayOpen, setCaptureOverlayOpen] = React.useState(false);
  const [captureDropdownOpen, setCaptureDropdownOpen] = React.useState(false);
  const [captureRect, setCaptureRect] = React.useState(null);
  const captureRectRef = React.useRef(null);
  const captureDragRef = React.useRef({ active: false, startX: 0, startY: 0 });

  const [externalCropOpen, setExternalCropOpen] = React.useState(false);
  const [externalCropDataUrl, setExternalCropDataUrl] = React.useState(null);
  const [externalCropSelection, setExternalCropSelection] =
    React.useState(null);
  const externalCropImgRef = React.useRef(null);
  const externalCropDragRef = React.useRef({
    active: false,
    startX: 0,
    startY: 0,
  });

  // New feature dialogs state
  const [ocrCaptureOpen, setOcrCaptureOpen] = React.useState(false);
  const [deviceMockupOpen, setDeviceMockupOpen] = React.useState(false);
  const [wallpaperPickerOpen, setWallpaperPickerOpen] = React.useState(false);
  const [pluginManagerOpen, setPluginManagerOpen] = React.useState(false);
  const [mcpInstallerOpen, setMcpInstallerOpen] = React.useState(false);

  const closeCaptureOverlay = React.useCallback(() => {
    captureDragRef.current.active = false;
    captureRectRef.current = null;
    setCaptureRect(null);
    setCaptureOverlayOpen(false);
  }, []);

  const closeExternalCrop = React.useCallback(() => {
    externalCropDragRef.current.active = false;
    setExternalCropSelection(null);
    setExternalCropDataUrl(null);
    setExternalCropOpen(false);
  }, []);

  const estimateByteLengthFromDataUrl = React.useCallback((dataUrl) => {
    const s = String(dataUrl || "");
    const idx = s.indexOf(",");
    if (idx < 0) return 0;
    const base64 = s.slice(idx + 1);
    const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
    return Math.max(0, Math.floor((base64.length * 3) / 4 - padding));
  }, []);

  const captureViaDisplayMedia = React.useCallback(async () => {
    const getDisplayMedia = navigator?.mediaDevices?.getDisplayMedia;
    if (typeof getDisplayMedia !== "function") {
      return { ok: false, error: "Display capture is not supported" };
    }

    let stream;
    try {
      stream = await getDisplayMedia.call(navigator.mediaDevices, {
        video: true,
        audio: false,
      });
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }

    try {
      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      await new Promise((resolve, reject) => {
        const onLoaded = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error("Video load failed"));
        };
        const cleanup = () => {
          video.removeEventListener("loadedmetadata", onLoaded);
          video.removeEventListener("error", onError);
        };
        video.addEventListener("loadedmetadata", onLoaded);
        video.addEventListener("error", onError);
      });

      try {
        await video.play();
      } catch {}

      await new Promise((r) => setTimeout(r, 60));

      const width = Math.max(1, Number(video.videoWidth) || 0);
      const height = Math.max(1, Number(video.videoHeight) || 0);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return { ok: false, error: "Capture failed" };
      ctx.drawImage(video, 0, 0, width, height);

      const dataUrl = canvas.toDataURL("image/png");
      if (!String(dataUrl || "").startsWith("data:image/")) {
        return { ok: false, error: "Capture failed" };
      }

      const byteLength = estimateByteLengthFromDataUrl(dataUrl);
      return {
        ok: true,
        mimeType: "image/png",
        byteLength,
        dataUrl,
        meta: { method: "displayMedia", width, height },
      };
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    } finally {
      try {
        const tracks = stream?.getTracks?.() || [];
        for (const t of tracks) {
          try {
            t.stop();
          } catch {}
        }
      } catch {}
    }
  }, [estimateByteLengthFromDataUrl]);

  const saveCapture = React.useCallback(
    async ({ source, mode, dataUrl, mimeType, byteLength, meta }) => {
      const url = String(dataUrl || "");
      if (!url.startsWith("data:image/")) {
        toast.error("Capture failed");
        return;
      }

      const ts = new Date().toISOString().replaceAll(":", "-");
      const fileName = `${String(source || "capture")}-${String(
        mode || "full",
      )}-${ts}.png`;

      addScreenshot({
        name: fileName,
        source: String(source || "unknown"),
        mode: String(mode || "full"),
        dataUrl: url,
        mimeType: String(mimeType || "image/png"),
        byteLength: Number(byteLength) || 0,
        meta: meta && typeof meta === "object" ? meta : null,
        originId: `${String(mode || "full")}::${ts}`,
      });

      const ok = await window.electronAPI.clipboardWriteImageDataUrl(url);
      if (!ok) {
        toast.error("Copy to clipboard failed");
        return;
      }

      toast.success("Copied screenshot to clipboard", {
        action: {
          label: "Resources",
          onClick: () =>
            navigate(`/resources?shot=${encodeURIComponent(fileName)}`),
        },
      });
    },
    [addScreenshot, navigate],
  );

  const captureAndCopy = React.useCallback(
    async ({ mode, rect }) => {
      if (!canAppCapture) {
        toast.error("Screenshot capture is not available");
        return;
      }

      // Small delay to let dropdowns/tooltips close if needed
      if (mode === "full") {
        await new Promise((r) => setTimeout(r, 150));
      }

      try {
        const res =
          mode === "full"
            ? await window.electronAPI.appCapture.capturePage()
            : await window.electronAPI.appCapture.captureRegion(rect);

        if (!res?.ok || !res?.dataUrl) {
          toast.error(res?.error ? String(res.error) : "Capture failed");
          return;
        }

        await saveCapture({
          source: "app",
          mode,
          dataUrl: String(res.dataUrl),
          mimeType: String(res?.mimeType || "image/png"),
          byteLength: Number(res?.byteLength) || 0,
          meta: rect ? { rect } : null,
        });
      } catch (err) {
        toast.error(String(err?.message || err || "Capture failed"));
      }
    },
    [canAppCapture, saveCapture],
  );

  const captureExternalFull = React.useCallback(async () => {
    if (!canExternalCapture) {
      toast.error("External capture is not available");
      return;
    }

    await withAutoHideApp(async () => {
      await new Promise((r) => setTimeout(r, 150));

      try {
        let res =
          await window.electronAPI.externalCapture.capturePrimaryScreen();
        if (!res?.ok) {
          const fallback = await captureViaDisplayMedia();
          if (fallback?.ok) res = fallback;
        }
        if (!res?.ok || !res?.dataUrl) {
          toast.error(res?.error ? String(res.error) : "Capture failed");
          return;
        }

        await saveCapture({
          source: "external",
          mode: "full",
          dataUrl: String(res.dataUrl),
          mimeType: String(res?.mimeType || "image/png"),
          byteLength: Number(res?.byteLength) || 0,
          meta: res?.meta && typeof res.meta === "object" ? res.meta : null,
        });
      } catch (err) {
        toast.error(String(err?.message || err || "Capture failed"));
      }
    });
  }, [
    canExternalCapture,
    captureViaDisplayMedia,
    saveCapture,
    withAutoHideApp,
  ]);

  const startExternalAreaCapture = React.useCallback(async () => {
    if (!canExternalCapture) {
      toast.error("External capture is not available");
      return;
    }

    await withAutoHideApp(async () => {
      try {
        const captureRegion =
          window.electronAPI?.externalCapture?.capturePrimaryScreenRegion;
        if (typeof captureRegion === "function") {
          const res = await captureRegion();
          if (!res?.ok) {
            if (res?.cancelled) return;
            toast.error(res?.error ? String(res.error) : "Capture failed");
            return;
          }

          await saveCapture({
            source: "external",
            mode: "area",
            dataUrl: String(res.dataUrl),
            mimeType: String(res?.mimeType || "image/png"),
            byteLength: Number(res?.byteLength) || 0,
            meta: res?.meta && typeof res.meta === "object" ? res.meta : null,
          });
          return;
        }

        await new Promise((r) => setTimeout(r, 150));

        let res =
          await window.electronAPI.externalCapture.capturePrimaryScreen();
        if (!res?.ok) {
          const fallback = await captureViaDisplayMedia();
          if (fallback?.ok) res = fallback;
        }
        if (!res?.ok || !res?.dataUrl) {
          toast.error(res?.error ? String(res.error) : "Capture failed");
          return;
        }

        setExternalCropSelection(null);
        setExternalCropDataUrl(String(res.dataUrl));
        setExternalCropOpen(true);
      } catch (err) {
        toast.error(String(err?.message || err || "Capture failed"));
      }
    });
  }, [
    canExternalCapture,
    captureViaDisplayMedia,
    saveCapture,
    withAutoHideApp,
  ]);

  const confirmExternalCrop = React.useCallback(async () => {
    const img = externalCropImgRef.current;
    const sel = externalCropSelection;
    if (!img || !sel) return;

    const displayRect = img.getBoundingClientRect();
    const dispW = Math.max(1, Number(displayRect.width) || 0);
    const dispH = Math.max(1, Number(displayRect.height) || 0);
    const natW = Math.max(1, Number(img.naturalWidth) || 0);
    const natH = Math.max(1, Number(img.naturalHeight) || 0);

    const scaleX = natW / dispW;
    const scaleY = natH / dispH;

    const sx = Math.max(0, Math.floor(Number(sel.x) * scaleX));
    const sy = Math.max(0, Math.floor(Number(sel.y) * scaleY));
    const sw = Math.max(1, Math.floor(Number(sel.width) * scaleX));
    const sh = Math.max(1, Math.floor(Number(sel.height) * scaleY));

    if (sw < 2 || sh < 2) return;

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      toast.error("Capture failed");
      return;
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const dataUrl = canvas.toDataURL("image/png");
    const byteLength = estimateByteLengthFromDataUrl(dataUrl);

    closeExternalCrop();

    await saveCapture({
      source: "external",
      mode: "area",
      dataUrl,
      mimeType: "image/png",
      byteLength,
      meta: {
        rect: { x: sx, y: sy, width: sw, height: sh },
      },
    });
  }, [
    closeExternalCrop,
    estimateByteLengthFromDataUrl,
    externalCropSelection,
    saveCapture,
  ]);

  const startAreaCapture = React.useCallback(() => {
    if (!canAppCapture) {
      toast.error("Screenshot capture is not available");
      return;
    }
    setCaptureOverlayOpen(true);
    captureRectRef.current = null;
    setCaptureRect(null);
  }, [canAppCapture]);

  React.useEffect(() => {
    if (!captureOverlayOpen) return;
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      closeCaptureOverlay();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [captureOverlayOpen, closeCaptureOverlay]);

  React.useEffect(() => {
    if (!externalCropOpen) return;
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      closeExternalCrop();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [externalCropOpen, closeExternalCrop]);

  // Derive active tab from pathname
  const activeTab =
    location.pathname === "/"
      ? "generator"
      : location.pathname.substring(1).split("/")[0];

  const [isDockVisible, setIsDockVisible] = React.useState(
    !dockSettings.autoHide,
  );

  React.useEffect(() => {
    setIsDockVisible(!dockSettings.autoHide);
  }, [dockSettings.autoHide]);

  const appOptions = React.useMemo(
    () => [
      {
        key: "launchpad",
        label: "Launchpad",
        icon: Search,
        gradient:
          "bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500",
      },
      {
        key: "generator",
        label: "Generator",
        icon: Rocket,
        gradient:
          "bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500",
      },
      {
        key: "projects",
        label: "Projects",
        icon: AppWindow,
        gradient: "bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600",
      },
      {
        key: "resources",
        label: "Resources",
        icon: Folder,
        gradient: "bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500",
      },
      {
        key: "ui",
        label: "UI Builder",
        icon: LayoutGrid,
        gradient: "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600",
      },
      {
        key: "scrum-board",
        label: "Scrum Board",
        icon: Table,
        gradient: "bg-gradient-to-br from-fuchsia-500 via-pink-500 to-rose-600",
      },
      {
        key: "browser",
        label: "Browser",
        icon: Globe,
        gradient: "bg-gradient-to-br from-blue-500 via-cyan-500 to-emerald-500",
      },
      {
        key: "tests",
        label: "Tests",
        icon: TestTube,
        gradient:
          "bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-700",
      },
      {
        key: "settings",
        label: "Settings",
        icon: Settings,
        gradient: "bg-gradient-to-br from-zinc-500 via-slate-600 to-stone-700",
      },
    ],
    [],
  );

  const appByKey = React.useMemo(() => {
    const map = new Map();
    for (const a of appOptions) map.set(a.key, a);
    return map;
  }, [appOptions]);

  const pinnedAppKeys = React.useMemo(
    () => ["launchpad", "generator", "projects", "resources"],
    [],
  );

  const [recentAppKeys, setRecentAppKeys] = React.useState(() => {
    try {
      const raw = localStorage.getItem("dockRecentAppKeys");
      const parsed = JSON.parse(raw || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((k) => typeof k === "string");
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem("dockRecentAppKeys", JSON.stringify(recentAppKeys));
    } catch {}
  }, [recentAppKeys]);

  React.useEffect(() => {
    if (!activeTab || pinnedAppKeys.includes(activeTab)) return;
    if (!appByKey.has(activeTab)) return;
    setRecentAppKeys((prev) => {
      const next = [activeTab, ...prev.filter((k) => k !== activeTab)];
      return next.slice(0, 4);
    });
  }, [activeTab, appByKey, pinnedAppKeys]);

  const dockApps = React.useMemo(() => {
    const pinned = pinnedAppKeys.map((k) => appByKey.get(k)).filter(Boolean);
    const recents = recentAppKeys
      .filter((k) => !pinnedAppKeys.includes(k))
      .map((k) => appByKey.get(k))
      .filter(Boolean);
    return { pinned, recents };
  }, [appByKey, pinnedAppKeys, recentAppKeys]);

  const openApp = React.useCallback(
    (key) => {
      navigate(`/${key}`);
    },
    [navigate],
  );

  const loadRecentDockActions = React.useCallback(() => {
    try {
      const raw = localStorage.getItem("dockRecentActions");
      const parsed = JSON.parse(raw || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((it) => it && typeof it === "object")
        .map((it) => ({
          key: String(it.key || "").trim(),
          label: String(it.label || "").trim(),
          iconName: String(it.iconName || "search").trim(),
          actionKey: String(it.actionKey || "").trim(),
          gradient: String(it.gradient || "").trim(),
        }))
        .filter((it) => it.key && it.label && it.actionKey)
        .slice(0, 6);
    } catch {
      return [];
    }
  }, []);

  const [recentDockActions, setRecentDockActions] = React.useState(() =>
    loadRecentDockActions(),
  );

  React.useEffect(() => {
    const onUpdate = () => setRecentDockActions(loadRecentDockActions());
    window.addEventListener("dock:recentActionsUpdated", onUpdate);
    return () =>
      window.removeEventListener("dock:recentActionsUpdated", onUpdate);
  }, [loadRecentDockActions]);

  const dockActionIconByName = React.useMemo(
    () => ({
      search: Search,
      rocket: Rocket,
      app: AppWindow,
      folder: Folder,
      grid: LayoutGrid,
      table: Table,
      globe: Globe,
      test: TestTube,
      settings: Settings,
      camera: Camera,
      sparkles: Sparkles,
    }),
    [],
  );

  const runLaunchpadAction = React.useCallback(
    async (actionKey, payload) => {
      const key = String(actionKey || "").trim();
      if (!key) return;

      if (key.startsWith("nav:")) {
        const dest = key.slice("nav:".length);
        if (!dest) return;
        navigate(`/${dest}`);
        return;
      }

      if (key === "openExternal:github") {
        if (!window.electronAPI?.openExternal) {
          toast.error("External links are not available");
          return;
        }
        try {
          await window.electronAPI.openExternal(
            "https://github.com/next-dev-team/next-gen",
          );
        } catch (err) {
          toast.error(String(err?.message || err || "Failed to open"));
        }
        return;
      }

      if (key === "capture:app:full") {
        await captureAndCopy({ mode: "full" });
        return;
      }

      if (key === "capture:app:area") {
        startAreaCapture();
        return;
      }

      if (key === "capture:screen:full") {
        await captureExternalFull();
        return;
      }

      if (key === "capture:screen:area") {
        await startExternalAreaCapture();
        return;
      }

      if (key === "dock:toggleAutoHide") {
        setDockSettings((prev) => ({ ...prev, autoHide: !prev.autoHide }));
        return;
      }

      if (key === "dock:setPosition") {
        const pos = String(payload?.position || "");
        if (!pos) return;
        if (pos !== "left" && pos !== "bottom" && pos !== "right") return;
        setDockSettings((prev) => ({ ...prev, position: pos }));
        return;
      }

      // New feature action handlers
      if (key === "ocr:capture") {
        setOcrCaptureOpen(true);
        return;
      }

      if (key === "mockup:device") {
        setDeviceMockupOpen(true);
        return;
      }

      if (key === "settings:wallpaper") {
        setWallpaperPickerOpen(true);
        return;
      }

      if (key === "settings:plugins") {
        setPluginManagerOpen(true);
        return;
      }

      if (key === "mcp:installer") {
        setMcpInstallerOpen(true);
        return;
      }
    },
    [
      captureAndCopy,
      captureExternalFull,
      navigate,
      setDockSettings,
      startAreaCapture,
      startExternalAreaCapture,
    ],
  );

  React.useEffect(() => {
    const handler = (e) => {
      const detail = e?.detail && typeof e.detail === "object" ? e.detail : {};
      runLaunchpadAction(detail.actionKey, detail.payload).catch(() => {});
    };
    window.addEventListener("launchpad:run", handler);
    return () => window.removeEventListener("launchpad:run", handler);
  }, [runLaunchpadAction]);

  const tabOptions = React.useMemo(
    () => [
      { key: "generator", label: "Generator", icon: Rocket },

      { key: "projects", label: "Projects", icon: AppWindow },
      { key: "resources", label: "Resources", icon: Folder },
      { key: "launchpad", label: "Launchpad", icon: Search },
      { key: "ui", label: "UI", icon: LayoutGrid },
      { key: "scrum-board", label: "Scrum Board", icon: Table },
      { key: "browser", label: "Browser", icon: Globe },
    ],
    [],
  );

  const segmentedValue = tabOptions.some((t) => t.key === activeTab)
    ? activeTab
    : "launchpad";

  const handleTabChange = React.useCallback(
    (value) => {
      openApp(value);
    },
    [openApp],
  );

  const handleTabsKeyDown = React.useCallback(
    (e) => {
      if (
        e.key !== "ArrowLeft" &&
        e.key !== "ArrowRight" &&
        e.key !== "Home" &&
        e.key !== "End"
      ) {
        return;
      }

      e.preventDefault();
      const currentIndex = tabOptions.findIndex(
        (t) => t.key === segmentedValue,
      );
      if (currentIndex < 0) return;

      const lastIndex = tabOptions.length - 1;
      let nextIndex = currentIndex;

      if (e.key === "ArrowLeft") {
        nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
      } else if (e.key === "ArrowRight") {
        nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
      } else if (e.key === "Home") {
        nextIndex = 0;
      } else if (e.key === "End") {
        nextIndex = lastIndex;
      }

      const next = tabOptions[nextIndex];
      if (!next) return;
      handleTabChange(next.key);
    },
    [handleTabChange, segmentedValue, tabOptions],
  );

  const dockItemRefs = React.useRef([]);
  const dockRafRef = React.useRef(null);
  const dockPointerRef = React.useRef(null);
  const [dockPointer, setDockPointer] = React.useState(null);

  const scheduleDockPointerUpdate = React.useCallback(() => {
    if (dockRafRef.current) return;
    dockRafRef.current = window.requestAnimationFrame(() => {
      dockRafRef.current = null;
      setDockPointer(dockPointerRef.current);
    });
  }, []);

  const dockRef = React.useRef(null);

  const onDockWheel = React.useCallback(
    (e) => {
      if (dockSettings.position === "bottom" && dockRef.current) {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          dockRef.current.scrollLeft += e.deltaY;
        }
      }
    },
    [dockSettings.position],
  );

  const onDockMouseMove = React.useCallback(
    (e) => {
      dockPointerRef.current = { x: e.clientX, y: e.clientY };
      scheduleDockPointerUpdate();
    },
    [scheduleDockPointerUpdate],
  );

  const onDockMouseLeave = React.useCallback(() => {
    dockPointerRef.current = null;
    setDockPointer(null);
    if (dockRafRef.current) {
      window.cancelAnimationFrame(dockRafRef.current);
      dockRafRef.current = null;
    }
  }, []);

  const getDockItemScale = React.useCallback(
    (index) => {
      if (!dockPointer) return 1;
      const el = dockItemRefs.current[index];
      if (!el) return 1;
      const rect = el.getBoundingClientRect();

      let distance;
      if (dockSettings.position === "bottom") {
        const centerX = rect.left + rect.width / 2;
        distance = Math.abs(dockPointer.x - centerX);
      } else {
        const centerY = rect.top + rect.height / 2;
        distance = Math.abs(dockPointer.y - centerY);
      }

      const t = 1 - clamp(distance / 120, 0, 1);
      return 1 + t * 0.35;
    },
    [dockPointer, dockSettings.position],
  );

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col bg-[var(--color-bg-base)] text-[var(--color-text-primary)] transition-colors duration-300">
        <div
          className="flex h-16 items-center justify-between border-b bg-[var(--color-bg-container)] px-6 transition-colors duration-300"
          style={{ WebkitAppRegion: "drag", paddingRight: 150 }}
        >
          <div
            className="flex min-w-0 flex-1 items-center gap-3"
            style={{ WebkitAppRegion: "no-drag" }}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-indigo-600 to-indigo-500">
              <Rocket className="h-[18px] w-[18px] text-white" />
            </div>
            <h1 className="truncate text-sm font-medium text-[var(--color-text-primary)]">
              {activeTab === "ui"
                ? "UI Builder"
                : activeTab === "resources"
                  ? "Resources"
                  : activeTab === "launchpad"
                    ? "Launchpad"
                    : "Next Gen"}
            </h1>
            <div className="rounded bg-[var(--color-bg-elevated)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)]">
              v1.0
            </div>
          </div>

          <div
            className="flex flex-1 items-center justify-center"
            style={{ WebkitAppRegion: "no-drag" }}
          >
            <div
              role="tablist"
              aria-label="segmented control"
              tabIndex={0}
              onKeyDown={handleTabsKeyDown}
              className="600  flex items-center gap-1 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_100%)] p-1 shadow-inner overflow-visible"
            >
              {tabOptions.map((t) => {
                const Icon = t.icon;
                const isActive = t.key === segmentedValue;
                const isLaunchpad = t.key === "launchpad";

                return (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={t.label}
                    onClick={() => handleTabChange(t.key)}
                    className={
                      (isLaunchpad
                        ? "relative -my-2 inline-flex items-center justify-center rounded-full p-1 transition-all duration-200 ease-out [will-change:transform] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(var(--lines-color-rgb),.5)] hover:scale-[1.03] active:scale-[0.98]"
                        : "cursor-pointer hover:bg-menu-active text-[var(--Base-White)] hover:shadow-sm inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium leading-none transition-colors focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(var(--lines-color-rgb),.5)] ") +
                      (isActive
                        ? "border-menu-active bg-menu-active text-[var(--Base-White)] shadow-sm"
                        : isLaunchpad
                          ? "text-[var(--color-text-secondary)]"
                          : "border-transparent text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-[var(--Base-White)]")
                    }
                  >
                    {isLaunchpad ? (
                      <span
                        className={
                          "relative flex h-10 w-10 items-center justify-center rounded-full border bg-[radial-gradient(85%_85%_at_32%_22%,rgba(255,255,255,0.32)_0%,rgba(255,255,255,0.12)_36%,rgba(0,0,0,0.32)_100%)] shadow-[0_14px_26px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.24)] transition-all duration-200 ease-out [will-change:transform] " +
                          (isActive
                            ? "border-[hsla(0,0%,100%,.14)]"
                            : "border-white/10")
                        }
                      >
                        <span className="pointer-events-none absolute -inset-3 -z-10 rounded-full bg-[radial-gradient(55%_55%_at_50%_45%,rgba(var(--lines-color-rgb),0.45)_0%,rgba(var(--lines-color-rgb),0.12)_35%,transparent_72%)] blur-md" />
                        <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(60%_60%_at_30%_20%,rgba(255,255,255,0.38)_0%,transparent_70%)]" />
                        <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(70%_80%_at_50%_85%,rgba(0,0,0,0.35)_0%,transparent_55%)]" />
                        <Icon
                          className="h-[18px] w-[18px]"
                          aria-hidden="true"
                        />
                      </span>
                    ) : (
                      <>
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{t.label}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="flex flex-1 items-center justify-end gap-2"
            style={{ WebkitAppRegion: "no-drag" }}
          >
            <DropdownMenu
              open={captureDropdownOpen}
              onOpenChange={setCaptureDropdownOpen}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block">
                    <DropdownMenuTrigger asChild disabled={!canCapture}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground"
                        disabled={!canCapture}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {canCapture
                    ? "Capture screenshot"
                    : "Screenshot capture is not available"}
                </TooltipContent>
              </Tooltip>
              {canCapture && (
                <DropdownMenuContent align="end">
                  {canAppCapture ? (
                    <>
                      <DropdownMenuItem
                        onClick={() => {
                          setCaptureDropdownOpen(false);
                          startAreaCapture();
                        }}
                      >
                        Area (default)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setCaptureDropdownOpen(false);
                          captureAndCopy({ mode: "full" });
                        }}
                      >
                        Full
                      </DropdownMenuItem>
                    </>
                  ) : null}

                  {canAppCapture && canExternalCapture ? (
                    <DropdownMenuSeparator />
                  ) : null}

                  {canExternalCapture ? (
                    <>
                      <DropdownMenuItem
                        onClick={() => {
                          setCaptureDropdownOpen(false);
                          startExternalAreaCapture();
                        }}
                      >
                        Area (External)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setCaptureDropdownOpen(false);
                          captureExternalFull();
                        }}
                      >
                        Full (External)
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              )}
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground"
                    disabled={!canOpenExternal}
                    onClick={() => {
                      if (window.electronAPI?.openExternal) {
                        window.electronAPI.openExternal(
                          "https://github.com/next-dev-team/next-gen",
                        );
                      }
                    }}
                  >
                    <Github className="h-4 w-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {canOpenExternal
                  ? "View on GitHub"
                  : "External links are not available"}
              </TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div
          className={
            "flex flex-1 flex-col min-h-0 " +
            (activeTab === "launchpad"
              ? "p-0 overflow-hidden"
              : "p-6 overflow-auto")
          }
          style={{ WebkitAppRegion: "no-drag" }}
        >
          <KeepAliveOutlet
            outletContext={{
              isDarkMode,
              setIsDarkMode,
              designMode,
              setDesignMode,
              dockSettings,
              setDockSettings,
            }}
            keepAliveKeys={["browser"]}
          />
        </div>

        {/* Dock Hover Detection Area */}
        {dockSettings.autoHide && (
          <button
            type="button"
            aria-label="Show Dock"
            tabIndex={-1}
            className={`fixed z-[49] ${
              dockSettings.position === "bottom"
                ? "inset-x-0 bottom-0 h-4 w-full"
                : dockSettings.position === "left"
                  ? "inset-y-0 left-0 w-4 h-full"
                  : "inset-y-0 right-0 w-4 h-full"
            } border-none bg-transparent outline-none`}
            onMouseEnter={() => setIsDockVisible(true)}
          />
        )}

        <div
          className={`pointer-events-none fixed z-50 flex transition-all duration-300 ease-in-out ${
            dockSettings.position === "bottom"
              ? "inset-x-0 bottom-2 justify-center"
              : dockSettings.position === "left"
                ? "inset-y-0 left-2 items-center"
                : "inset-y-0 right-2 items-center"
          } ${
            dockSettings.autoHide && !isDockVisible
              ? dockSettings.position === "bottom"
                ? "translate-y-20 opacity-0"
                : dockSettings.position === "left"
                  ? "-translate-x-20 opacity-0"
                  : "translate-x-20 opacity-0"
              : "translate-0 opacity-100"
          }`}
        >
          <div
            ref={dockRef}
            role="toolbar"
            aria-label="Dock"
            className={`pointer-events-auto flex gap-2 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_100%)] shadow-[0_26px_70px_rgba(0,0,0,0.38)] backdrop-blur-2xl transition-all duration-300 ${
              dockSettings.position === "bottom"
                ? "items-center px-3 py-2 max-w-[90vw] overflow-x-auto overflow-y-hidden scrollbar-hide"
                : "flex-col items-center px-2 py-3 max-h-[90vh] overflow-y-auto overflow-x-hidden scrollbar-hide"
            }`}
            onWheel={onDockWheel}
            onMouseMove={onDockMouseMove}
            onMouseLeave={(e) => {
              onDockMouseLeave(e);
              if (dockSettings.autoHide) setIsDockVisible(false);
            }}
            style={{ WebkitAppRegion: "no-drag" }}
          >
            {/* Dock Items */}
            {(() => {
              const allApps = [...dockApps.pinned, ...dockApps.recents];
              const maxItems = 20;
              const displayedApps = allApps.slice(0, maxItems);
              const remainingSlots = maxItems - displayedApps.length;
              const displayedActions = recentDockActions.slice(
                0,
                remainingSlots,
              );

              return (
                <>
                  {displayedApps.map((app, idx) => {
                    const isRecent = idx >= dockApps.pinned.length;
                    const Icon = app.icon;
                    const isActive = activeTab === app.key;
                    const scale = getDockItemScale(idx);

                    return (
                      <React.Fragment key={app.key}>
                        {isRecent && idx === dockApps.pinned.length ? (
                          <div
                            className={`mx-1 rounded bg-white/10 ${
                              dockSettings.position === "bottom"
                                ? "h-9 w-px"
                                : "h-px w-9"
                            }`}
                          />
                        ) : null}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              ref={(el) => {
                                dockItemRefs.current[idx] = el;
                              }}
                              type="button"
                              onClick={() => openApp(app.key)}
                              className="relative flex h-14 w-14 items-center justify-center focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(var(--lines-color-rgb),.55)]"
                              style={{ transform: `scale(${scale})` }}
                            >
                              <span
                                className={
                                  "relative flex h-12 w-12 items-center justify-center rounded-2xl border bg-[radial-gradient(85%_85%_at_32%_22%,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0.11)_38%,rgba(0,0,0,0.32)_100%)] shadow-[0_18px_34px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.20)] transition-transform duration-100 ease-out " +
                                  (isActive
                                    ? "border-white/20"
                                    : "border-white/10 hover:border-white/16")
                                }
                              >
                                {app.gradient ? (
                                  <span
                                    className={
                                      "pointer-events-none absolute inset-0 rounded-2xl opacity-90 " +
                                      app.gradient
                                    }
                                  />
                                ) : null}
                                <span className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(60%_60%_at_30%_18%,rgba(255,255,255,0.34)_0%,transparent_70%)]" />
                                <span className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(70%_85%_at_50%_92%,rgba(0,0,0,0.42)_0%,transparent_58%)]" />
                                <Icon
                                  className={
                                    "relative h-6 w-6 " +
                                    (isActive ? "text-white" : "text-white/85")
                                  }
                                  aria-hidden="true"
                                />
                              </span>

                              <span
                                className={
                                  "absolute rounded-full transition-opacity " +
                                  (isActive
                                    ? "bg-white/70 opacity-100 "
                                    : "opacity-0 ") +
                                  (dockSettings.position === "bottom"
                                    ? "bottom-0 h-1 w-1"
                                    : dockSettings.position === "left"
                                      ? "left-0 h-1 w-1"
                                      : "right-0 h-1 w-1")
                                }
                              />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side={
                              dockSettings.position === "bottom"
                                ? "top"
                                : dockSettings.position === "left"
                                  ? "right"
                                  : "left"
                            }
                          >
                            {app.label}
                          </TooltipContent>
                        </Tooltip>
                      </React.Fragment>
                    );
                  })}

                  {displayedActions.length ? (
                    <div
                      className={`mx-1 rounded bg-white/10 ${
                        dockSettings.position === "bottom"
                          ? "h-9 w-px"
                          : "h-px w-9"
                      }`}
                    />
                  ) : null}

                  {displayedActions.map((action, actionIdx) => {
                    const Icon =
                      dockActionIconByName[action.iconName] ||
                      dockActionIconByName.search;
                    const idx = displayedApps.length + actionIdx;
                    const scale = getDockItemScale(idx);

                    const isActive =
                      action.actionKey.startsWith("nav:") &&
                      activeTab === action.actionKey.slice("nav:".length);

                    return (
                      <Tooltip key={action.key}>
                        <TooltipTrigger asChild>
                          <button
                            ref={(el) => {
                              dockItemRefs.current[idx] = el;
                            }}
                            type="button"
                            onClick={() => {
                              runLaunchpadAction(action.actionKey).catch(
                                () => {},
                              );
                              try {
                                const raw =
                                  localStorage.getItem("dockRecentActions");
                                const parsed = JSON.parse(raw || "[]");
                                const arr = Array.isArray(parsed) ? parsed : [];
                                const next = [
                                  {
                                    key: action.key,
                                    label: action.label,
                                    iconName: action.iconName,
                                    actionKey: action.actionKey,
                                    gradient: action.gradient,
                                  },
                                  ...arr.filter((it) => it?.key !== action.key),
                                ].slice(0, 6);
                                localStorage.setItem(
                                  "dockRecentActions",
                                  JSON.stringify(next),
                                );
                                window.dispatchEvent(
                                  new Event("dock:recentActionsUpdated"),
                                );
                              } catch {}
                            }}
                            className="relative flex h-14 w-14 items-center justify-center focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(var(--lines-color-rgb),.55)]"
                            style={{ transform: `scale(${scale})` }}
                          >
                            <span
                              className={
                                "relative flex h-12 w-12 items-center justify-center rounded-2xl border bg-[radial-gradient(85%_85%_at_32%_22%,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0.11)_38%,rgba(0,0,0,0.32)_100%)] shadow-[0_18px_34px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.20)] transition-transform duration-100 ease-out " +
                                (isActive
                                  ? "border-white/20"
                                  : "border-white/10 hover:border-white/16")
                              }
                            >
                              {action.gradient ? (
                                <span
                                  className={
                                    "pointer-events-none absolute inset-0 rounded-2xl opacity-90 " +
                                    action.gradient
                                  }
                                />
                              ) : null}
                              <span className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(60%_60%_at_30%_18%,rgba(255,255,255,0.34)_0%,transparent_70%)]" />
                              <span className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(70%_85%_at_50%_92%,rgba(0,0,0,0.42)_0%,transparent_58%)]" />
                              <Icon
                                className={
                                  "relative h-6 w-6 " +
                                  (isActive ? "text-white" : "text-white/85")
                                }
                                aria-hidden="true"
                              />
                            </span>

                            <span
                              className={
                                "absolute rounded-full transition-opacity " +
                                (isActive
                                  ? "bg-white/70 opacity-100 "
                                  : "opacity-0 ") +
                                (dockSettings.position === "bottom"
                                  ? "bottom-0 h-1 w-1"
                                  : dockSettings.position === "left"
                                    ? "left-0 h-1 w-1"
                                    : "right-0 h-1 w-1")
                              }
                            />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side={
                            dockSettings.position === "bottom"
                              ? "top"
                              : dockSettings.position === "left"
                                ? "right"
                                : "left"
                          }
                        >
                          {action.label}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </>
              );
            })()}

            {/* Settings Toggle */}
            <div
              className={`mx-1 rounded bg-white/10 ${
                dockSettings.position === "bottom" ? "h-6 w-px" : "h-px w-6"
              }`}
            />

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() =>
                    setDockSettings((prev) => ({
                      ...prev,
                      autoHide: !prev.autoHide,
                    }))
                  }
                  className="group relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 hover:bg-white/10 focus-visible:outline-none"
                >
                  {dockSettings.autoHide ? (
                    <PinOff className="h-3.5 w-3.5 text-white/40 transition-colors group-hover:text-white/70" />
                  ) : (
                    <Pin className="h-3.5 w-3.5 text-white/70 transition-colors group-hover:text-white" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent
                side={
                  dockSettings.position === "bottom"
                    ? "top"
                    : dockSettings.position === "left"
                      ? "right"
                      : "left"
                }
              >
                {dockSettings.autoHide ? "Always Show" : "Auto-hide"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {captureOverlayOpen ? (
          <button
            type="button"
            aria-label="Capture overlay"
            onKeyDown={(e) => {
              if (e.key !== "Escape") return;
              e.preventDefault();
              closeCaptureOverlay();
            }}
            onMouseDown={(e) => {
              captureDragRef.current.active = true;
              captureDragRef.current.startX = e.clientX;
              captureDragRef.current.startY = e.clientY;
              const next = { x: e.clientX, y: e.clientY, width: 0, height: 0 };
              captureRectRef.current = next;
              setCaptureRect(next);
            }}
            onMouseMove={(e) => {
              if (!captureDragRef.current.active) return;
              const x1 = captureDragRef.current.startX;
              const y1 = captureDragRef.current.startY;
              const x2 = e.clientX;
              const y2 = e.clientY;
              const x = Math.min(x1, x2);
              const y = Math.min(y1, y2);
              const width = Math.max(0, Math.abs(x2 - x1));
              const height = Math.max(0, Math.abs(y2 - y1));
              const next = { x, y, width, height };
              captureRectRef.current = next;
              setCaptureRect(next);
            }}
            onMouseUp={async () => {
              const r = captureRectRef.current;
              closeCaptureOverlay();
              if (!r) return;
              const width = Math.floor(Number(r.width) || 0);
              const height = Math.floor(Number(r.height) || 0);
              if (width < 2 || height < 2) return;
              await captureAndCopy({
                mode: "area",
                rect: {
                  x: Math.floor(Number(r.x) || 0),
                  y: Math.floor(Number(r.y) || 0),
                  width,
                  height,
                },
              });
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              closeCaptureOverlay();
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10000,
              padding: 0,
              border: "none",
              background: "rgba(15,23,42,0.18)",
              cursor: "crosshair",
              WebkitAppRegion: "no-drag",
              userSelect: "none",
            }}
          >
            {captureRect ? (
              <div
                style={{
                  position: "absolute",
                  left: captureRect.x,
                  top: captureRect.y,
                  width: captureRect.width,
                  height: captureRect.height,
                  border: "1px solid var(--color-primary)",
                  background: "rgba(79,70,229,0.12)",
                  boxShadow: "0 0 0 1px rgba(15,23,42,0.45) inset",
                }}
              />
            ) : null}
          </button>
        ) : null}

        {externalCropOpen ? (
          <div
            role="dialog"
            aria-label="External capture crop"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10000,
              background: "rgba(0,0,0,0.72)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              WebkitAppRegion: "no-drag",
            }}
            onMouseMove={(e) => {
              if (!externalCropDragRef.current.active) return;
              const img = externalCropImgRef.current;
              if (!img) return;
              const rect = img.getBoundingClientRect();
              const x2 = Math.min(
                Math.max(0, e.clientX - rect.left),
                rect.width,
              );
              const y2 = Math.min(
                Math.max(0, e.clientY - rect.top),
                rect.height,
              );
              const x1 = externalCropDragRef.current.startX;
              const y1 = externalCropDragRef.current.startY;
              setExternalCropSelection({
                x: Math.min(x1, x2),
                y: Math.min(y1, y2),
                width: Math.abs(x2 - x1),
                height: Math.abs(y2 - y1),
              });
            }}
            onMouseUp={() => {
              externalCropDragRef.current.active = false;
            }}
          >
            <div
              style={{
                width: "min(92vw, 1200px)",
                maxHeight: "92vh",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
              >
                <Button variant="outline" size="sm" onClick={closeExternalCrop}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={confirmExternalCrop}
                  disabled={
                    !externalCropSelection ||
                    externalCropSelection.width < 2 ||
                    externalCropSelection.height < 2
                  }
                >
                  Capture
                </Button>
              </div>

              <button
                type="button"
                aria-label="Crop selection"
                style={{
                  position: "relative",
                  borderRadius: 10,
                  overflow: "hidden",
                  background: "rgba(15,23,42,0.55)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  alignSelf: "center",
                  maxHeight: "calc(92vh - 60px)",
                  padding: 0,
                  cursor: "crosshair",
                }}
                onMouseDown={(e) => {
                  const img = externalCropImgRef.current;
                  if (!img) return;
                  const rect = img.getBoundingClientRect();
                  const x = Math.min(
                    Math.max(0, e.clientX - rect.left),
                    rect.width,
                  );
                  const y = Math.min(
                    Math.max(0, e.clientY - rect.top),
                    rect.height,
                  );
                  externalCropDragRef.current.active = true;
                  externalCropDragRef.current.startX = x;
                  externalCropDragRef.current.startY = y;
                  setExternalCropSelection({ x, y, width: 0, height: 0 });
                }}
              >
                {externalCropDataUrl ? (
                  <img
                    ref={externalCropImgRef}
                    src={externalCropDataUrl}
                    alt="External capture"
                    draggable={false}
                    style={{
                      display: "block",
                      maxWidth: "92vw",
                      maxHeight: "calc(92vh - 60px)",
                      width: "auto",
                      height: "auto",
                      userSelect: "none",
                      pointerEvents: "none",
                    }}
                  />
                ) : null}

                {externalCropSelection ? (
                  <div
                    style={{
                      position: "absolute",
                      left: externalCropSelection.x,
                      top: externalCropSelection.y,
                      width: externalCropSelection.width,
                      height: externalCropSelection.height,
                      border: "2px solid var(--color-primary)",
                      background: "rgba(79,70,229,0.15)",
                      boxShadow: "0 0 0 1px rgba(15,23,42,0.45) inset",
                      pointerEvents: "none",
                    }}
                  />
                ) : null}
              </button>
            </div>
          </div>
        ) : null}

        {/* Lazy-loaded Feature Dialogs */}
        <Suspense fallback={null}>
          <OCRCapture open={ocrCaptureOpen} onOpenChange={setOcrCaptureOpen} />
          <DeviceMockup
            open={deviceMockupOpen}
            onOpenChange={setDeviceMockupOpen}
          />
          <WallpaperPicker
            open={wallpaperPickerOpen}
            onOpenChange={setWallpaperPickerOpen}
          />
          <PluginManager
            open={pluginManagerOpen}
            onOpenChange={setPluginManagerOpen}
          />
          <MCPInstaller
            open={mcpInstallerOpen}
            onOpenChange={setMcpInstallerOpen}
          />
        </Suspense>
      </div>
    </TooltipProvider>
  );
}
