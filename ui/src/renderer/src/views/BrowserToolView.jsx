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
  Check,
  Copy,
  Globe,
  Monitor,
  MousePointerClick,
  Network,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  RotateCw,
  Search,
  Star,
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
import { ComponentRenderer } from "../components/editor/canvas/ComponentRenderer";
import { copyToClipboard, generateElementCode } from "../utils/codeGenerator";

const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function extractText(node) {
  const raw = node?.textContent ? String(node.textContent) : "";
  return raw.replace(/\s+/g, " ").trim();
}

function clampText(text, max = 220) {
  const t = String(text || "");
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function guessButtonVariant({ tag, className }) {
  const cls = String(className || "").toLowerCase();
  if (tag === "a") return "link";
  if (cls.includes("outline") || cls.includes("border")) return "outline";
  if (cls.includes("ghost")) return "ghost";
  if (cls.includes("secondary")) return "secondary";
  if (cls.includes("destructive") || cls.includes("danger"))
    return "destructive";
  return "default";
}

function domToCanvasElements(node, depth = 0, limitRef = { count: 0 }) {
  if (!node || depth > 6) return [];
  if (limitRef.count > 40) return [];

  if (node.nodeType === Node.TEXT_NODE) {
    const txt = extractText(node);
    if (!txt) return [];
    limitRef.count += 1;
    return [
      {
        id: createId(),
        type: "paragraph",
        props: { text: clampText(txt, 240) },
        children: [],
      },
    ];
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return [];

  const el = node;
  const tag = String(el.tagName || "").toLowerCase();
  const text = extractText(el);
  const className = el.getAttribute?.("class") || "";

  const childrenFromDom = () => {
    const out = [];
    for (const child of Array.from(el.childNodes || [])) {
      out.push(...domToCanvasElements(child, depth + 1, limitRef));
      if (limitRef.count > 40) break;
    }
    return out;
  };

  if (/^h[1-6]$/.test(tag)) {
    limitRef.count += 1;
    const level = Number(tag.slice(1)) || 2;
    return [
      {
        id: createId(),
        type: "heading",
        props: {
          level: Math.min(4, Math.max(1, level)),
          text: text || "Heading",
        },
        children: [],
      },
    ];
  }

  if (tag === "p" || tag === "span" || tag === "small" || tag === "label") {
    if (!text) return childrenFromDom();
    limitRef.count += 1;
    return [
      {
        id: createId(),
        type: "paragraph",
        props: { text: clampText(text, 360) },
        children: [],
      },
    ];
  }

  if (tag === "button" || tag === "a") {
    limitRef.count += 1;
    return [
      {
        id: createId(),
        type: "button",
        props: {
          variant: guessButtonVariant({ tag, className }),
          children: text || (tag === "a" ? "Link" : "Button"),
        },
        children: [],
      },
    ];
  }

  if (tag === "input") {
    limitRef.count += 1;
    const type = el.getAttribute?.("type") || "text";
    const placeholder = el.getAttribute?.("placeholder") || "";
    return [
      {
        id: createId(),
        type: "input",
        props: { type, placeholder },
        children: [],
      },
    ];
  }

  if (tag === "textarea") {
    limitRef.count += 1;
    const placeholder = el.getAttribute?.("placeholder") || "";
    return [
      {
        id: createId(),
        type: "textarea",
        props: { placeholder },
        children: [],
      },
    ];
  }

  if (tag === "hr") {
    limitRef.count += 1;
    return [
      {
        id: createId(),
        type: "divider",
        props: { spacing: "sm" },
        children: [],
      },
    ];
  }

  const nested = childrenFromDom();
  if (depth === 0) {
    return [
      {
        id: createId(),
        type: "section-container",
        props: {
          padding: 6,
          background: "transparent",
          layout: "vertical",
          align: "left",
          maxWidth: "6xl",
        },
        children: nested.length
          ? [
              {
                id: createId(),
                type: "card-root",
                props: { width: "w-full" },
                children: [
                  {
                    id: createId(),
                    type: "card-content",
                    props: { layout: "stack", className: "space-y-4" },
                    children: nested,
                  },
                ],
              },
            ]
          : [
              {
                id: createId(),
                type: "card-root",
                props: { width: "w-full" },
                children: [
                  {
                    id: createId(),
                    type: "card-content",
                    props: { layout: "stack" },
                    children: [
                      {
                        id: createId(),
                        type: "paragraph",
                        props: { text: "(Empty selection)" },
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
      },
    ];
  }

  if (nested.length) return nested;
  if (text) {
    limitRef.count += 1;
    return [
      {
        id: createId(),
        type: "paragraph",
        props: { text: clampText(text, 360) },
        children: [],
      },
    ];
  }
  return [];
}

function htmlToCanvasElementTree(html) {
  const safeHtml = String(html || "").slice(0, 200_000);
  const parser = new DOMParser();
  const doc = parser.parseFromString(safeHtml, "text/html");
  const root = doc.body?.firstElementChild || doc.body;
  const elements = domToCanvasElements(root, 0);
  return elements[0] || null;
}

function collectImports(element, out = new Set()) {
  if (!element) return out;
  const t = String(element.type || "");
  if (t === "button") out.add("Button");
  if (t === "input") out.add("Input");
  if (t === "card-root" || t === "card-container" || t === "card")
    out.add("Card");
  if (t === "card-header") out.add("CardHeader");
  if (t === "card-content") out.add("CardContent");
  if (t === "card-footer") out.add("CardFooter");
  if (t === "card-title") out.add("CardTitle");
  if (t === "card-description") out.add("CardDescription");
  if (t === "divider") out.add("Separator");
  if (t === "switch") out.add("Switch");
  if (t === "badge") out.add("Badge");

  for (const child of Array.isArray(element.children) ? element.children : []) {
    collectImports(child, out);
  }
  return out;
}

function buildShadcnSnippet(element) {
  if (!element) return "";

  const imports = Array.from(collectImports(element));
  const importLines = [];
  if (imports.some((x) => x.startsWith("Card")) || imports.includes("Card")) {
    const cards = [
      "Card",
      "CardHeader",
      "CardTitle",
      "CardDescription",
      "CardContent",
      "CardFooter",
    ].filter((x) => imports.includes(x));
    if (cards.length) {
      importLines.push(
        `import { ${cards.join(", ")} } from "@/components/ui/card";`
      );
    }
  }
  if (imports.includes("Button")) {
    importLines.push(`import { Button } from "@/components/ui/button";`);
  }
  if (imports.includes("Input")) {
    importLines.push(`import { Input } from "@/components/ui/input";`);
  }
  if (imports.includes("Separator")) {
    importLines.push(`import { Separator } from "@/components/ui/separator";`);
  }
  if (imports.includes("Switch")) {
    importLines.push(`import { Switch } from "@/components/ui/switch";`);
  }
  if (imports.includes("Badge")) {
    importLines.push(`import { Badge } from "@/components/ui/badge";`);
  }

  const jsx = generateElementCode(element);
  return `${importLines.join("\n")}\n\n${jsx}`.trim();
}

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

function formatUrlLabel(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const u = new URL(raw);
    const path = u.pathname && u.pathname !== "/" ? u.pathname : "";
    return `${u.hostname}${path}`;
  } catch {
    return raw;
  }
}

function Dashboard({ onOpenUrl }) {
  const [query, setQuery] = useState("");

  const bookmarks = useBrowserTabsStore((s) => s.bookmarks);
  const history = useBrowserTabsStore((s) => s.history);
  const removeBookmark = useBrowserTabsStore((s) => s.removeBookmark);
  const clearHistory = useBrowserTabsStore((s) => s.clearHistory);

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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Bookmarks</CardTitle>
            <CardDescription>Your saved pages.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {bookmarks.length ? (
              <div className="flex flex-col gap-2">
                {bookmarks.map((b) => (
                  <div key={b.url} className="flex items-center gap-2">
                    <Button
                      onClick={() => onOpenUrl(b.url)}
                      variant="outline"
                      className="h-auto flex-1 justify-start gap-2 px-3 py-2"
                      title={b.url}
                    >
                      <span className="truncate font-medium">
                        {b.title || formatUrlLabel(b.url)}
                      </span>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeBookmark(b.url)}
                      aria-label="Remove bookmark"
                      className="h-9 w-9"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No bookmarks yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Recent History</CardTitle>
              {history.length ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearHistory}
                  className="h-8"
                >
                  Clear
                </Button>
              ) : null}
            </div>
            <CardDescription>Last 10 opened pages.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {history.length ? (
              <div className="flex flex-col gap-2">
                {history.map((h) => (
                  <Button
                    key={`${h.url}-${h.at}`}
                    onClick={() => onOpenUrl(h.url)}
                    variant="outline"
                    className="h-auto justify-start gap-2 px-3 py-2"
                    title={h.url}
                  >
                    <span className="truncate font-medium">
                      {h.title || formatUrlLabel(h.url)}
                    </span>
                    <span className="ml-auto truncate text-xs text-muted-foreground">
                      {formatUrlLabel(h.url)}
                    </span>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No history yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DevPanel({
  activeTabId,
  activeIsBrowser,
  hasElectronView,
  isRouteActive,
}) {
  const devPanel = useBrowserTabsStore((s) => s.devPanel);
  const setDevPanelTool = useBrowserTabsStore((s) => s.setDevPanelTool);
  const setDevPanelOpen = useBrowserTabsStore((s) => s.setDevPanelOpen);
  const setDevPanelWidth = useBrowserTabsStore((s) => s.setDevPanelWidth);
  const networkLogs = useBrowserTabsStore((s) => s.networkLogs);
  const addNetworkLog = useBrowserTabsStore((s) => s.addNetworkLog);
  const clearNetworkLogs = useBrowserTabsStore((s) => s.clearNetworkLogs);
  const inspector = useBrowserTabsStore((s) => s.inspector);
  const setInspectorEnabled = useBrowserTabsStore((s) => s.setInspectorEnabled);
  const clearInspector = useBrowserTabsStore((s) => s.clearInspector);

  const [copied, setCopied] = useState(false);
  const [cloneBusy, setCloneBusy] = useState(false);
  const [previewElement, setPreviewElement] = useState(null);
  const [code, setCode] = useState("");

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
    if (devPanel.activeTool !== "inspector") return;
    if (!inspector?.selected?.element?.outerHTML) {
      setPreviewElement(null);
      setCode("");
      return;
    }
    const next = htmlToCanvasElementTree(
      inspector?.selected?.element?.outerHTML
    );
    setPreviewElement(next);
    setCode(buildShadcnSnippet(next));
    setCopied(false);
  }, [devPanel.activeTool, inspector?.selected?.element?.outerHTML]);

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
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-2 px-4 py-2">
              <div className="min-w-0">
                <div className="text-sm font-medium">Inspector</div>
                <div className="text-xs text-muted-foreground truncate">
                  {activeIsBrowser
                    ? inspector?.selected?.element?.selector ||
                      inspector?.hover?.element?.selector ||
                      "Pick an element to convert"
                    : "Open a browser tab to inspect"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={inspector?.enabled ? "secondary" : "outline"}
                  disabled={
                    !hasElectronView || !activeIsBrowser || !isRouteActive
                  }
                  onClick={async () => {
                    const next = !inspector?.enabled;
                    setInspectorEnabled(next);
                    clearInspector();
                    try {
                      if (
                        window.electronAPI?.browserView?.setInspectorEnabled
                      ) {
                        await window.electronAPI.browserView.setInspectorEnabled(
                          activeTabId,
                          next
                        );
                      } else {
                        console.warn(
                          "setInspectorEnabled not available in electronAPI"
                        );
                      }
                    } catch (err) {
                      setInspectorEnabled(false);
                      toast.error("Inspector failed", {
                        description: String(err?.message || err),
                      });
                    }
                  }}
                >
                  <MousePointerClick className="mr-2 h-4 w-4" />
                  {inspector?.enabled ? "Picking" : "Pick"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    !hasElectronView || !activeIsBrowser || !isRouteActive
                  }
                  onClick={async () => {
                    setCloneBusy(true);
                    try {
                      if (!window.electronAPI?.browserView?.getPageHtml) {
                        toast.error("Clone failed", {
                          description:
                            "getPageHtml not available. Please restart the app.",
                        });
                        setCloneBusy(false);
                        return;
                      }
                      const res =
                        await window.electronAPI.browserView.getPageHtml(
                          activeTabId
                        );
                      if (!res?.ok) {
                        toast.error("Failed to read page HTML", {
                          description: String(res?.error || "Unknown error"),
                        });
                        return;
                      }
                      const doc = new DOMParser().parseFromString(
                        String(res.html || ""),
                        "text/html"
                      );
                      const body = doc.body;
                      const element = body?.firstElementChild || body;
                      const tree = htmlToCanvasElementTree(
                        element?.outerHTML || ""
                      );
                      setPreviewElement(tree);
                      setCode(buildShadcnSnippet(tree));
                      setCopied(false);
                    } catch (err) {
                      toast.error("Clone failed", {
                        description: String(err?.message || err),
                      });
                    } finally {
                      setCloneBusy(false);
                    }
                  }}
                >
                  {cloneBusy ? "Cloning…" : "Clone page"}
                </Button>
              </div>
            </div>

            <div className="border-t" />

            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-4 p-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Selection</CardTitle>
                    <CardDescription>
                      {inspector?.selected?.element?.tagName
                        ? `${String(
                            inspector?.selected?.element?.tagName
                          ).toLowerCase()} · ${
                            inspector?.selected?.element?.rect?.width
                              ? `${Math.round(
                                  inspector?.selected?.element?.rect?.width
                                )}×${Math.round(
                                  inspector?.selected?.element?.rect?.height ||
                                    0
                                )}`
                              : ""
                          }`
                        : "No element selected yet"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {inspector?.selected?.element?.text ? (
                      <div className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {inspector?.selected?.element?.text}
                      </div>
                    ) : null}
                    {inspector?.selected?.element?.selector ? (
                      <div className="text-xs font-mono text-muted-foreground break-words">
                        {inspector?.selected?.element?.selector}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm">Preview</CardTitle>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!previewElement}
                        onClick={() => {
                          setPreviewElement(null);
                          setCode("");
                          setCopied(false);
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {previewElement ? (
                      <div className="rounded-md border bg-background p-3">
                        <ComponentRenderer element={previewElement} />
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Pick an element or clone the page.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm">Shadcn code</CardTitle>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!code}
                        onClick={async () => {
                          if (!code) return;
                          const ok = await copyToClipboard(code);
                          if (!ok) {
                            toast.error("Copy failed");
                            return;
                          }
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1000);
                        }}
                      >
                        {copied ? (
                          <Check className="mr-2 h-4 w-4" />
                        ) : (
                          <Copy className="mr-2 h-4 w-4" />
                        )}
                        Copy
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {code ? (
                      <pre className="max-h-[380px] overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
                        {code}
                      </pre>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No code generated yet.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
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
  const addHistoryEntry = useBrowserTabsStore((s) => s.addHistoryEntry);
  const toggleBookmark = useBrowserTabsStore((s) => s.toggleBookmark);
  const bookmarks = useBrowserTabsStore((s) => s.bookmarks);

  const devPanel = useBrowserTabsStore((s) => s.devPanel);
  const setDevPanelOpen = useBrowserTabsStore((s) => s.setDevPanelOpen);

  const inspector = useBrowserTabsStore((s) => s.inspector);
  const setInspectorEnabled = useBrowserTabsStore((s) => s.setInspectorEnabled);
  const setInspectorHover = useBrowserTabsStore((s) => s.setInspectorHover);
  const setInspectorSelection = useBrowserTabsStore(
    (s) => s.setInspectorSelection
  );
  const clearInspector = useBrowserTabsStore((s) => s.clearInspector);

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
    location.pathname === "/browser" ||
    location.pathname.startsWith("/browser/");

  const lastInspectorTabIdRef = useRef(null);

  useEffect(() => {
    if (!hasElectronView) return;
    if (!window.electronAPI?.browserView?.onInspectorHover) return;

    const offHover = window.electronAPI.browserView.onInspectorHover(
      (payload) => {
        if (!payload?.tabId) return;
        if (payload.tabId !== resolvedActiveTabId) return;
        setInspectorHover(payload);
      }
    );

    if (!window.electronAPI?.browserView?.onInspectorSelection) return;

    const offSelection = window.electronAPI.browserView.onInspectorSelection(
      (payload) => {
        if (!payload?.tabId) return;
        if (payload.tabId !== resolvedActiveTabId) return;
        setInspectorSelection(payload);
        setInspectorEnabled(false);
        if (window.electronAPI?.browserView?.setInspectorEnabled) {
          window.electronAPI.browserView
            .setInspectorEnabled(payload.tabId, false)
            .catch(() => {});
        }
      }
    );
    return () => {
      if (typeof offHover === "function") offHover();
      if (typeof offSelection === "function") offSelection();
    };
  }, [
    hasElectronView,
    resolvedActiveTabId,
    setInspectorEnabled,
    setInspectorHover,
    setInspectorSelection,
  ]);

  useEffect(() => {
    if (!hasElectronView) return;

    const prevTabId = lastInspectorTabIdRef.current;
    lastInspectorTabIdRef.current = resolvedActiveTabId;

    if (
      prevTabId &&
      prevTabId !== resolvedActiveTabId &&
      window.electronAPI?.browserView?.setInspectorEnabled
    ) {
      window.electronAPI.browserView
        .setInspectorEnabled(prevTabId, false)
        .catch(() => {});
    }

    const shouldEnable =
      Boolean(inspector?.enabled) &&
      activeTab?.kind === "browser" &&
      isRouteActive;

    if (!shouldEnable) {
      if (inspector?.enabled) setInspectorEnabled(false);
      clearInspector();
      if (
        resolvedActiveTabId &&
        window.electronAPI?.browserView?.setInspectorEnabled
      ) {
        window.electronAPI.browserView
          .setInspectorEnabled(resolvedActiveTabId, false)
          .catch(() => {});
      }
      return;
    }

    if (window.electronAPI?.browserView?.setInspectorEnabled) {
      window.electronAPI.browserView
        .setInspectorEnabled(resolvedActiveTabId, true)
        .catch(() => {
          setInspectorEnabled(false);
        });
    }
  }, [
    activeTab?.kind,
    clearInspector,
    hasElectronView,
    inspector?.enabled,
    isRouteActive,
    resolvedActiveTabId,
    setInspectorEnabled,
  ]);

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
      if (window.electronAPI?.browserView?.setBounds) {
        await window.electronAPI.browserView.setBounds(resolvedActiveTabId, {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
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
    if (!window.electronAPI?.browserView?.onState) return;
    const off = window.electronAPI.browserView.onState((payload) => {
      if (!payload?.tabId) return;
      updateTabState(payload.tabId, {
        url: payload.url,
        canGoBack: payload.canGoBack,
        canGoForward: payload.canGoForward,
      });
      if (payload.url) addHistoryEntry(payload.url, payload.url);
    });
    return () => {
      if (typeof off === "function") off();
    };
  }, [addHistoryEntry, hasElectronView, updateTabState]);

  useEffect(() => {
    if (!hasElectronView) return;

    const run = async () => {
      if (!isRouteActive) {
        if (window.electronAPI?.browserView?.hideAll) {
          await window.electronAPI.browserView.hideAll();
        }
        return;
      }
      if (activeTab?.kind === "browser") {
        if (window.electronAPI?.browserView?.show) {
          await window.electronAPI.browserView.show(resolvedActiveTabId);
        }
        await updateBounds();
        return;
      }
      if (window.electronAPI?.browserView?.hideAll) {
        await window.electronAPI.browserView.hideAll();
      }
    };

    run().catch(() => {});
  }, [
    activeTab?.kind,
    hasElectronView,
    isRouteActive,
    resolvedActiveTabId,
    updateBounds,
  ]);

  const openInNewTab = useCallback(
    async (url) => {
      const normalized = normalizeUrl(url);
      if (!normalized) return;

      addHistoryEntry(normalized, normalized);
      const id = openUrlTab(normalized);
      if (!id) return;

      if (hasElectronView) {
        try {
          if (window.electronAPI?.browserView?.create) {
            await window.electronAPI.browserView.create(id, normalized);
          }
          if (window.electronAPI?.browserView?.show) {
            await window.electronAPI.browserView.show(id);
          }
        } catch (err) {
          toast.error("Failed to open tab", {
            description: String(err?.message || err),
          });
        }
      }
    },
    [addHistoryEntry, hasElectronView, openUrlTab]
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
  }, [
    isRouteActive,
    searchParams,
    tabStateById,
    setActiveTab,
    openInNewTab,
    navigate,
  ]);

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
    addHistoryEntry(url, url);

    if (hasElectronView) {
      if (window.electronAPI?.browserView?.loadURL) {
        await window.electronAPI.browserView.loadURL(resolvedActiveTabId, url);
      }
      return;
    }

    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
  };

  const activeUrlForBookmark = useMemo(() => {
    if (!activeIsBrowser) return "";
    return normalizeUrl(activeTabState.url || address);
  }, [activeIsBrowser, activeTabState.url, address]);

  const isActiveBookmarked = useMemo(() => {
    if (!activeUrlForBookmark) return false;
    return bookmarks.some((b) => normalizeUrl(b?.url) === activeUrlForBookmark);
  }, [activeUrlForBookmark, bookmarks]);

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
                        if (window.electronAPI?.browserView?.destroy) {
                          window.electronAPI.browserView
                            .destroy(t.id)
                            .catch(() => {});
                        }
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
              if (window.electronAPI?.browserView?.goBack) {
                window.electronAPI.browserView.goBack(resolvedActiveTabId);
              }
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
              if (window.electronAPI?.browserView?.goForward) {
                window.electronAPI.browserView.goForward(resolvedActiveTabId);
              }
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
          onClick={() => {
            if (hasElectronView) {
              if (window.electronAPI?.browserView?.reload) {
                window.electronAPI.browserView.reload(resolvedActiveTabId);
              }
              return;
            }
            if (iframeRef.current) {
              iframeRef.current.contentWindow?.location?.reload?.();
            }
          }}
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
          <Button
            size="icon"
            variant={isActiveBookmarked ? "secondary" : "outline"}
            disabled={!activeIsBrowser || !activeUrlForBookmark}
            onClick={() => {
              if (!activeUrlForBookmark) return;
              toggleBookmark(activeUrlForBookmark, activeUrlForBookmark);
            }}
            aria-label={isActiveBookmarked ? "Remove bookmark" : "Add bookmark"}
          >
            <Star
              className={cn(
                "h-4 w-4",
                isActiveBookmarked ? "fill-current" : ""
              )}
            />
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

        {devPanel.isOpen ? (
          <DevPanel
            activeTabId={resolvedActiveTabId}
            activeIsBrowser={activeIsBrowser}
            hasElectronView={hasElectronView}
            isRouteActive={isRouteActive}
          />
        ) : null}
      </div>
    </div>
  );
}
