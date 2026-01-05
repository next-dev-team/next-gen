import { Segmented } from "antd";
import {
  AppWindow,
  Camera,
  Github,
  Globe,
  LayoutGrid,
  Rocket,
  Settings,
  Table,
} from "lucide-react";
import React from "react";
import { useLocation, useNavigate, useOutlet } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import { useResourceStore } from "../stores/resourceStore";

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
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const isWeb = typeof __WEB__ !== "undefined" && Boolean(__WEB__);
  const canAppCapture =
    !isWeb &&
    Boolean(
      window.electronAPI?.appCapture?.capturePage &&
      window.electronAPI?.appCapture?.captureRegion &&
      window.electronAPI?.clipboardWriteImageDataUrl
    );

  const canOpenExternal = Boolean(window.electronAPI?.openExternal);

  const addScreenshot = useResourceStore((s) => s.addScreenshot);

  const [captureOverlayOpen, setCaptureOverlayOpen] = React.useState(false);
  const [captureRect, setCaptureRect] = React.useState(null);
  const captureRectRef = React.useRef(null);
  const captureDragRef = React.useRef({ active: false, startX: 0, startY: 0 });

  const closeCaptureOverlay = React.useCallback(() => {
    captureDragRef.current.active = false;
    captureRectRef.current = null;
    setCaptureRect(null);
    setCaptureOverlayOpen(false);
  }, []);

  const captureAndCopy = React.useCallback(
    async ({ mode, rect }) => {
      if (!canAppCapture) {
        toast.error("Screenshot capture is not available");
        return;
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

        const ts = new Date().toISOString().replaceAll(":", "-");
        const fileName = `app-${mode}-${ts}.png`;
        addScreenshot({
          name: fileName,
          source: "app",
          mode,
          dataUrl: String(res.dataUrl),
          mimeType: String(res?.mimeType || "image/png"),
          byteLength: Number(res?.byteLength) || 0,
          meta: rect ? { rect } : null,
          originId: `${mode}::${ts}`,
        });

        const ok = await window.electronAPI.clipboardWriteImageDataUrl(
          res.dataUrl
        );
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
      } catch (err) {
        toast.error(String(err?.message || err || "Capture failed"));
      }
    },
    [addScreenshot, canAppCapture, navigate]
  );

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

  // Derive active tab from pathname
  const activeTab =
    location.pathname === "/"
      ? "generator"
      : location.pathname.substring(1).split("/")[0];

  const handleTabChange = (value) => {
    navigate(`/${value}`);
  };

  const tabOptions = [
    { key: "generator", label: "Generator", icon: Rocket },
    { key: "projects", label: "Projects", icon: AppWindow },
    { key: "ui", label: "UI", icon: LayoutGrid },
    { key: "scrum-board", label: "Scrum Board", icon: Table },
    { key: "browser", label: "Browser", icon: Globe },
  ];

  const segmentedValue = tabOptions.some((t) => t.key === activeTab)
    ? activeTab
    : "generator";

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col bg-[var(--color-bg-base)]">
        <div
          className="flex h-16 items-center justify-between border-b bg-[var(--color-bg-container)] px-6"
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
            <Segmented
              value={segmentedValue}
              onChange={handleTabChange}
              options={tabOptions.map((t) => {
                const Icon = t.icon;
                return {
                  value: t.key,
                  label: (
                    <span className="inline-flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{t.label}</span>
                    </span>
                  ),
                };
              })}
            />
          </div>

          <div
            className="flex flex-1 items-center justify-end gap-2"
            style={{ WebkitAppRegion: "no-drag" }}
          >
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block">
                    <DropdownMenuTrigger asChild disabled={!canAppCapture}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground"
                        disabled={!canAppCapture}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {canAppCapture
                    ? "Capture screenshot"
                    : "Screenshot capture is not available"}
                </TooltipContent>
              </Tooltip>
              {canAppCapture && (
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => startAreaCapture()}>
                    Area (default)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => captureAndCopy({ mode: "full" })}
                  >
                    Full
                  </DropdownMenuItem>
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
                          "https://github.com/next-dev-team/next-gen"
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
                <DropdownMenuItem onClick={() => navigate("/resources")}>
                  Resources
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div
          className="flex flex-1 flex-col overflow-hidden px-12 pb-6"
          style={{ WebkitAppRegion: "no-drag" }}
        >
          <KeepAliveOutlet
            outletContext={{
              isDarkMode,
              setIsDarkMode,
              designMode,
              setDesignMode,
            }}
            keepAliveKeys={["browser"]}
          />
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
      </div>
    </TooltipProvider>
  );
}
