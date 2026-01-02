import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Globe,
  Monitor,
  Network,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  RotateCw,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { ScrollArea } from "../components/ui/scroll-area";
import { cn } from "../lib/utils";
import { useBrowserTabsStore } from "../stores/browserTabsStore";

function useResizeObserver(targetRef, onResize) {
  useLayoutEffect(() => {
    const el = targetRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => onResize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [onResize, targetRef]);
}

function normalizeUrl(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";

  // If it already has a protocol, try to normalize it using URL object
  if (/^https?:\/\//i.test(raw) || /^file:\/\//i.test(raw)) {
    try {
      return new URL(raw).toString();
    } catch (e) {
      return raw;
    }
  }

  if (/^about:/i.test(raw)) return raw;
  if (/^localhost(:\d+)?(\/|$)/i.test(raw)) {
    try {
      return new URL(`http://${raw}`).toString();
    } catch (e) {
      return `http://${raw}`;
    }
  }

  if (raw.includes(" "))
    return `https://www.google.com/search?q=${encodeURIComponent(raw)}`;

  // Default to https
  try {
    return new URL(`https://${raw}`).toString();
  } catch (e) {
    return `https://${raw}`;
  }
}

function Dashboard({ onOpenUrl }) {
  const [query, setQuery] = useState("");

  const items = useMemo(
    () => [
      { title: "Google", url: "https://www.google.com", group: "Search" },
      { title: "MDN", url: "https://developer.mozilla.org", group: "Docs" },
      { title: "GitHub", url: "https://github.com", group: "Dev" },
      {
        title: "Stack Overflow",
        url: "https://stackoverflow.com",
        group: "Dev",
      },
      { title: "YouTube", url: "https://youtube.com", group: "Entertainment" },
      { title: "Twitch", url: "https://twitch.tv", group: "Entertainment" },
      { title: "Netflix", url: "https://netflix.com", group: "Entertainment" },
      {
        title: "Spotify",
        url: "https://open.spotify.com",
        group: "Entertainment",
      },
    ],
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      [it.title, it.url, it.group].some((v) =>
        String(v).toLowerCase().includes(q)
      )
    );
  }, [items, query]);

  const entertainment = filtered.filter((it) => it.group === "Entertainment");
  const quick = filtered.filter((it) => it.group !== "Entertainment");

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Dashboard</CardTitle>
          <CardDescription>Search and open pages in new tabs.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search links or type a URL"
                className="pl-9"
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                const url = normalizeUrl(query);
                if (!url) return;
                onOpenUrl(url);
              }}
            >
              Open
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Links</CardTitle>
            <CardDescription>Docs and development shortcuts.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {quick.map((it) => (
                <Button
                  key={it.url}
                  onClick={() => onOpenUrl(it.url)}
                  variant="outline"
                  className="h-auto justify-between gap-2 px-3 py-2"
                >
                  <span className="font-medium">{it.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {it.group}
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Entertainment</CardTitle>
            <CardDescription>Quick access for breaks.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {entertainment.map((it) => (
                <Button
                  key={it.url}
                  onClick={() => onOpenUrl(it.url)}
                  variant="outline"
                  className="h-auto justify-between gap-2 px-3 py-2"
                >
                  <span className="font-medium">{it.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {it.group}
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DevPanel() {
  const devPanel = useBrowserTabsStore((s) => s.devPanel);
  const setDevPanelTool = useBrowserTabsStore((s) => s.setDevPanelTool);
  const setDevPanelOpen = useBrowserTabsStore((s) => s.setDevPanelOpen);
  const setDevPanelWidth = useBrowserTabsStore((s) => s.setDevPanelWidth);
  const networkLogs = useBrowserTabsStore((s) => s.networkLogs);
  const addNetworkLog = useBrowserTabsStore((s) => s.addNetworkLog);
  const clearNetworkLogs = useBrowserTabsStore((s) => s.clearNetworkLogs);

  const dragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  useEffect(() => {
    if (!devPanel.isOpen) return;
    if (devPanel.activeTool !== "network") return;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startedAt = Date.now();
      try {
        const res = await originalFetch(...args);
        addNetworkLog({
          kind: "fetch",
          url: String(args[0]),
          status: res.status,
          durationMs: Date.now() - startedAt,
          at: new Date().toISOString(),
        });
        return res;
      } catch (err) {
        addNetworkLog({
          kind: "fetch",
          url: String(args[0]),
          status: 0,
          durationMs: Date.now() - startedAt,
          at: new Date().toISOString(),
          error: String(err?.message || err),
        });
        throw err;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [addNetworkLog, devPanel.activeTool, devPanel.isOpen]);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      const dx = dragStartX.current - e.clientX;
      setDevPanelWidth(dragStartWidth.current + dx);
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [setDevPanelWidth]);

  return (
    <div
      className="relative h-full border-l bg-background"
      style={{ width: devPanel.width }}
    >
      <div
        className="absolute left-0 top-0 h-full w-1 cursor-col-resize bg-transparent"
        onMouseDown={(e) => {
          dragging.current = true;
          dragStartX.current = e.clientX;
          dragStartWidth.current = devPanel.width;
        }}
      />

      <div className="flex h-12 items-center justify-between gap-2 px-2">
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
          <Button
            size="sm"
            variant={
              devPanel.activeTool === "react-query" ? "secondary" : "ghost"
            }
            onClick={() => setDevPanelTool("react-query")}
          >
            <Globe className="mr-2 h-4 w-4" />
            Query
          </Button>
          <Button
            size="sm"
            variant={
              devPanel.activeTool === "inspector" ? "secondary" : "ghost"
            }
            onClick={() => setDevPanelTool("inspector")}
          >
            <Monitor className="mr-2 h-4 w-4" />
            Inspector
          </Button>
          <Button
            size="sm"
            variant={devPanel.activeTool === "network" ? "secondary" : "ghost"}
            onClick={() => setDevPanelTool("network")}
          >
            <Network className="mr-2 h-4 w-4" />
            Network
          </Button>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setDevPanelOpen(false)}
        >
          <PanelRightClose className="h-4 w-4" />
        </Button>
      </div>

      <div className="h-[calc(100%-3rem)]">
        {devPanel.activeTool === "react-query" ? (
          <React.Suspense
            fallback={
              <div className="p-4 text-sm text-muted-foreground">Loading…</div>
            }
          >
            <ReactQueryPanel />
          </React.Suspense>
        ) : null}

        {devPanel.activeTool === "inspector" ? (
          <div className="p-4 text-sm">
            <div className="font-medium">Component inspector</div>
            <div className="mt-1 text-muted-foreground">
              Use the inspector integration to jump from UI to source.
            </div>
          </div>
        ) : null}

        {devPanel.activeTool === "network" ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between px-4 py-2">
              <div className="text-sm font-medium">Network logs</div>
              <Button size="sm" variant="outline" onClick={clearNetworkLogs}>
                Clear
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-2 p-4">
                {networkLogs.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No entries yet.
                  </div>
                ) : null}
                {networkLogs.map((e, idx) => (
                  <div
                    key={`${e.at}-${idx}`}
                    className="rounded-md border bg-background px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-medium">
                        {e.status} {e.kind}
                      </div>
                      <div className="shrink-0 text-xs text-muted-foreground">
                        {e.durationMs}ms
                      </div>
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {e.url}
                    </div>
                    {e.error ? (
                      <div className="mt-1 truncate text-xs text-destructive">
                        {e.error}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const ReactQueryPanel = React.lazy(async () => {
  const mod = await import("@tanstack/react-query-devtools");
  const Comp = mod.ReactQueryDevtoolsPanel;
  return {
    default: (props) => (
      <div className="h-full overflow-hidden">
        <Comp
          onClose={() => {
            const setDevPanelOpen =
              useBrowserTabsStore.getState().setDevPanelOpen;
            setDevPanelOpen(false);
          }}
          style={{ height: "100%", width: "100%" }}
          {...props}
        />
      </div>
    ),
  };
});

export default function BrowserToolView() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tabs = useBrowserTabsStore((s) => s.tabs);
  const activeTabId = useBrowserTabsStore((s) => s.activeTabId);
  const tabStateById = useBrowserTabsStore((s) => s.tabStateById);
  const setActiveTab = useBrowserTabsStore((s) => s.setActiveTab);
  const closeTab = useBrowserTabsStore((s) => s.closeTab);
  const openUrlTab = useBrowserTabsStore((s) => s.openUrlTab);
  const updateTabState = useBrowserTabsStore((s) => s.updateTabState);

  const devPanel = useBrowserTabsStore((s) => s.devPanel);
  const setDevPanelOpen = useBrowserTabsStore((s) => s.setDevPanelOpen);

  const [address, setAddress] = useState("");
  const contentRef = useRef(null);
  const iframeRef = useRef(null);
  const lastProcessedUrlRef = useRef(null);

  const resolvedActiveTabId = tabs.some((t) => t.id === activeTabId)
    ? activeTabId
    : tabs[0]?.id;
  const activeTab = tabs.find((t) => t.id === resolvedActiveTabId) || tabs[0];
  const activeTabState = tabStateById[resolvedActiveTabId] || {};
  const isWeb = typeof __WEB__ !== "undefined" && Boolean(__WEB__);
  const hasElectronView = !isWeb && Boolean(window.electronAPI?.browserView);
  const isRouteActive =
    location.pathname === "/browser" || location.pathname.startsWith("/browser/");

  useEffect(() => {
    if (activeTab?.kind !== "browser") {
      setAddress("");
      return;
    }
    setAddress(activeTabState.url || "");
  }, [activeTab?.kind, activeTabState.url]);

  const updateBounds = useMemo(() => {
    return async () => {
      if (!hasElectronView) return;
      if (!isRouteActive) return;
      if (!contentRef.current) return;
      if (activeTab?.kind !== "browser") return;
      const rect = contentRef.current.getBoundingClientRect();
      await window.electronAPI.browserView.setBounds(resolvedActiveTabId, {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    };
  }, [activeTab?.kind, hasElectronView, isRouteActive, resolvedActiveTabId]);

  useResizeObserver(contentRef, updateBounds);

  useEffect(() => {
    const onResize = () => updateBounds();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [updateBounds]);

  useEffect(() => {
    if (!hasElectronView) return;
    const off = window.electronAPI.browserView.onState((payload) => {
      if (!payload?.tabId) return;
      updateTabState(payload.tabId, {
        url: payload.url,
        canGoBack: payload.canGoBack,
        canGoForward: payload.canGoForward,
      });
    });
    return () => {
      if (typeof off === "function") off();
    };
  }, [hasElectronView, updateTabState]);

  useEffect(() => {
    if (!hasElectronView) return;

    const run = async () => {
      if (!isRouteActive) {
        await window.electronAPI.browserView.hideAll();
        return;
      }
      if (activeTab?.kind === "browser") {
        await window.electronAPI.browserView.show(resolvedActiveTabId);
        await updateBounds();
        return;
      }
      await window.electronAPI.browserView.hideAll();
    };

    run().catch(() => {});
  }, [activeTab?.kind, hasElectronView, isRouteActive, resolvedActiveTabId, updateBounds]);

  const openInNewTab = useCallback(
    async (url) => {
      const normalized = normalizeUrl(url);
      if (!normalized) return;

      const id = openUrlTab(normalized);
      if (!id) return;

      if (hasElectronView) {
        try {
          await window.electronAPI.browserView.create(id, normalized);
          await window.electronAPI.browserView.show(id);
        } catch (err) {
          toast.error("Failed to open tab", {
            description: String(err?.message || err),
          });
        }
      }
    },
    [hasElectronView, openUrlTab]
  );

  useEffect(() => {
    if (!isRouteActive) {
      lastProcessedUrlRef.current = null;
      return;
    }
    const urlParam = searchParams.get("url");
    if (urlParam && urlParam !== lastProcessedUrlRef.current) {
      lastProcessedUrlRef.current = urlParam;

      const normalized = normalizeUrl(urlParam);
      // Robust check: compare normalized versions of all open tab URLs
      const existingTabId = Object.keys(tabStateById).find((id) => {
        const tabUrl = tabStateById[id]?.url;
        return tabUrl && normalizeUrl(tabUrl) === normalized;
      });

      if (existingTabId) {
        setActiveTab(existingTabId);
      } else {
        openInNewTab(normalized);
      }
      // Clear the query parameter from the URL without adding to history
      navigate("/browser", { replace: true });
    } else if (!urlParam) {
      lastProcessedUrlRef.current = null;
    }
  }, [isRouteActive, searchParams, tabStateById, setActiveTab, openInNewTab, navigate]);

  const activeIsBrowser = activeTab?.kind === "browser";
  const canGoBack = Boolean(activeTabState.canGoBack);
  const canGoForward = Boolean(activeTabState.canGoForward);
  const backDisabled = !activeIsBrowser || (hasElectronView && !canGoBack);
  const forwardDisabled =
    !activeIsBrowser || (hasElectronView && !canGoForward);

  const go = async () => {
    if (!activeIsBrowser) return;
    const url = normalizeUrl(address);
    if (!url) return;
    updateTabState(resolvedActiveTabId, { url });

    if (hasElectronView) {
      await window.electronAPI.browserView.loadURL(resolvedActiveTabId, url);
      return;
    }

    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-background">
      <div className="flex items-center gap-2 border-b px-2 py-2">
        <div
          role="tablist"
          aria-label="Browser tabs"
          className="flex flex-1 items-center gap-1 overflow-x-auto"
        >
          {tabs.map((t, idx) => {
            const isActive = t.id === resolvedActiveTabId;
            return (
              <div
                key={t.id}
                className={cn(
                  "group flex items-center rounded-md border transition-all duration-200 ease-in-out",
                  isActive
                    ? "bg-accent text-accent-foreground shadow-sm ring-1 ring-ring/20"
                    : "bg-background/50 hover:bg-accent/50 border-transparent hover:border-border"
                )}
              >
                <button
                  id={`browser-tab-${t.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(t.id)}
                  onKeyDown={(e) => {
                    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                    e.preventDefault();
                    const nextIdx =
                      e.key === "ArrowLeft"
                        ? Math.max(0, idx - 1)
                        : Math.min(tabs.length - 1, idx + 1);
                    const next = tabs[nextIdx];
                    if (next?.id) setActiveTab(next.id);
                  }}
                  title={t.title}
                  className="flex items-center gap-2 px-3 py-1 text-sm"
                >
                  <span className="max-w-[220px] truncate font-medium">
                    {t.title}
                  </span>
                </button>
                {t.closable ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(t.id);
                      if (hasElectronView) {
                        window.electronAPI.browserView
                          .destroy(t.id)
                          .catch(() => {});
                      }
                    }}
                    className="mr-1 flex h-6 w-6 items-center justify-center rounded hover:bg-background/80"
                    aria-label={`Close ${t.title} tab`}
                  >
                    <X className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
                  </button>
                ) : null}
              </div>
            );
          })}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              openInNewTab("https://www.google.com");
            }}
            aria-label="New tab"
            className="h-8 w-8 shrink-0 rounded-full hover:bg-accent/80"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setDevPanelOpen(!devPanel.isOpen)}
          aria-label="Toggle dev panel"
        >
          {devPanel.isOpen ? (
            <PanelRightClose className="h-4 w-4" />
          ) : (
            <PanelRightOpen className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex items-center gap-2 border-b px-2 py-2">
        <Button
          size="icon"
          variant="outline"
          disabled={backDisabled}
          onClick={() => {
            if (!activeIsBrowser) return;
            if (hasElectronView) {
              window.electronAPI.browserView.goBack(resolvedActiveTabId);
              return;
            }
            iframeRef.current?.contentWindow?.history?.back?.();
          }}
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          disabled={forwardDisabled}
          onClick={() => {
            if (!activeIsBrowser) return;
            if (hasElectronView) {
              window.electronAPI.browserView.goForward(resolvedActiveTabId);
              return;
            }
            iframeRef.current?.contentWindow?.history?.forward?.();
          }}
          aria-label="Forward"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          disabled={!activeIsBrowser}
          onClick={() =>
            hasElectronView
              ? window.electronAPI.browserView.reload(resolvedActiveTabId)
              : iframeRef.current
              ? iframeRef.current.contentWindow?.location?.reload?.()
              : null
          }
          aria-label="Reload"
        >
          <RotateCw className="h-4 w-4" />
        </Button>

        <div className="flex flex-1 items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={!activeIsBrowser}
            placeholder="Enter URL or search"
            onKeyDown={(e) => {
              if (e.key === "Enter") go().catch(() => {});
            }}
          />
          <Button
            variant="secondary"
            disabled={!activeIsBrowser}
            onClick={() => go()}
          >
            Go
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-h-0 flex-1">
          {activeTab?.kind === "dashboard" ? (
            <ScrollArea className="h-full">
              <Dashboard onOpenUrl={openInNewTab} />
            </ScrollArea>
          ) : null}

          {activeTab?.kind === "browser" ? (
            <div ref={contentRef} className="absolute inset-0">
              {!hasElectronView ? (
                <iframe
                  ref={iframeRef}
                  title="Web preview"
                  className="h-full w-full"
                  src={activeTabState.url || "about:blank"}
                />
              ) : (
                <div className="h-full w-full" />
              )}
            </div>
          ) : null}
        </div>

        {devPanel.isOpen ? <DevPanel /> : null}
      </div>
    </div>
  );
}
