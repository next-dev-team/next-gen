import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Download,
  FileJson,
  Globe,
  Image,
  Monitor,
  MousePointerClick,
  Network,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  RotateCw,
  Search,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ComponentRenderer } from "../components/editor/canvas/ComponentRenderer";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { cn } from "../lib/utils";
import { useBrowserTabsStore } from "../stores/browserTabsStore";
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

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  const fixed = v >= 10 || i === 0 ? 0 : 1;
  return `${v.toFixed(fixed)} ${units[i]}`;
}

function formatDateTime(value) {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString();
  } catch {
    return "";
  }
}

function inferFileKind(mimeType, name) {
  const type = String(mimeType || "").toLowerCase();
  const n = String(name || "").toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (
    type.includes("zip") ||
    type.includes("x-7z") ||
    type.includes("x-rar") ||
    n.endsWith(".zip") ||
    n.endsWith(".7z") ||
    n.endsWith(".rar") ||
    n.endsWith(".tar") ||
    n.endsWith(".gz")
  ) {
    return "archive";
  }
  if (
    type.includes("pdf") ||
    type.includes("msword") ||
    type.includes("officedocument") ||
    type.startsWith("text/") ||
    n.endsWith(".md")
  ) {
    return "document";
  }
  return "file";
}

function revokeAttachmentUrl(attachment) {
  const url = attachment?.objectUrl;
  if (!url || typeof url !== "string") return;
  if (!url.startsWith("blob:")) return;
  try {
    URL.revokeObjectURL(url);
  } catch {}
}

function downloadFromUrl(url, filename) {
  const href = String(url || "");
  if (!href) return;
  const a = document.createElement("a");
  a.href = href;
  a.download = filename ? String(filename) : "download";
  a.rel = "noopener";
  a.target = "_blank";
  a.click();
}

function isImageAttachment(attachment) {
  const type = String(attachment?.mimeType || "").toLowerCase();
  if (type.startsWith("image/")) return true;
  return String(attachment?.kind || "") === "image";
}

async function urlToDataUrl(url) {
  const href = String(url || "");
  if (!href) return "";
  if (href.startsWith("data:image/")) return href;
  if (!href.startsWith("blob:")) return "";

  try {
    const res = await fetch(href);
    const blob = await res.blob();
    if (!blob || !String(blob.type || "").startsWith("image/")) return "";

    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
    return String(dataUrl || "");
  } catch {
    return "";
  }
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
  const dashboardState = useBrowserTabsStore((s) => s.dashboardState);
  const setDashboardSearchQuery = useBrowserTabsStore(
    (s) => s.setDashboardSearchQuery
  );
  const setDashboardActiveTab = useBrowserTabsStore(
    (s) => s.setDashboardActiveTab
  );

  const query = dashboardState.searchQuery;
  const setQuery = setDashboardSearchQuery;
  const activeTab = dashboardState.activeTab;
  const setActiveTab = setDashboardActiveTab;

  const [bookmarksQuery, setBookmarksQuery] = useState("");
  const [historyQuery, setHistoryQuery] = useState("");

  const bookmarks = useBrowserTabsStore((s) => s.bookmarks);
  const history = useBrowserTabsStore((s) => s.history);
  const removeBookmark = useBrowserTabsStore((s) => s.removeBookmark);
  const clearHistory = useBrowserTabsStore((s) => s.clearHistory);

  const items = useMemo(
    () => [
      { title: "Google", url: "https://www.google.com", group: "Search" },
      { title: "GitHub", url: "https://github.com", group: "Dev" },
      { title: "React Docs", url: "https://react.dev", group: "Docs" },
      {
        title: "Tailwind CSS",
        url: "https://tailwindcss.com/docs",
        group: "Docs",
      },
      { title: "Lucide Icons", url: "https://lucide.dev", group: "Docs" },
      {
        title: "Shadcn Chat",
        url: "https://context7.com/websites/ui_shadcn?tab=chat",
        group: "Docs",
      },
      { title: "YouTube", url: "https://youtube.com", group: "Entertainment" },
      { title: "Netflix", url: "https://netflix.com", group: "Entertainment" },
      {
        title: "Spotify",
        url: "https://open.spotify.com",
        group: "Entertainment",
      },
      {
        title: "Monochrome",
        url: "https://monochrome.samidy.com",
        group: "Music",
      },
      {
        title: "BiniLossless",
        url: "https://music.binimum.org/",
        group: "Music",
      },
      {
        title: "SquidWTF",
        url: "https://tidal.squid.wtf/",
        group: "Music",
      },
      {
        title: "QQDL",
        url: "https://tidal.qqdl.site/",
        group: "Music",
      },
      {
        title: "HiFi Flow",
        url: "https://hifi-flow.vercel.app/",
        group: "Music",
      },
      { title: "Vercel", url: "https://vercel.com", group: "More" },
      { title: "Supabase", url: "https://supabase.com", group: "More" },
    ],
    []
  );

  const handleOpen = useCallback(
    async (url) => {
      try {
        const normalized = normalizeUrl(url);
        if (!normalized) return;
        await onOpenUrl(normalized);
      } catch (err) {
        console.error("Navigation error:", err);
        toast.error("Failed to open URL", {
          description: String(err?.message || err),
        });
      }
    },
    [onOpenUrl]
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

  const filteredBookmarks = useMemo(() => {
    const q = bookmarksQuery.trim().toLowerCase();
    if (!q) return bookmarks;
    return bookmarks.filter((b) =>
      [b.title, b.url].some((v) =>
        String(v || "")
          .toLowerCase()
          .includes(q)
      )
    );
  }, [bookmarks, bookmarksQuery]);

  const filteredHistory = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    if (!q) return history;
    return history.filter((h) =>
      [h.title, h.url].some((v) =>
        String(v || "")
          .toLowerCase()
          .includes(q)
      )
    );
  }, [history, historyQuery]);

  const entertainmentItems = filtered.filter(
    (it) => it.group === "Entertainment"
  );
  const musicItems = filtered.filter((it) => it.group === "Music");
  const docsItems = filtered.filter((it) => it.group === "Docs");
  const moreItems = filtered.filter(
    (it) => !["Entertainment", "Music", "Docs"].includes(it.group)
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Quick Access</CardTitle>
                <CardDescription>Shortcuts and entertainment.</CardDescription>
              </div>
              <div className="relative w-32 sm:w-48">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter links..."
                  className="h-8 pl-7 text-xs"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="mb-4">
                <TabsTrigger value="docs">Docs</TabsTrigger>
                <TabsTrigger value="entertainment">Entertainment</TabsTrigger>
                <TabsTrigger value="music">Music</TabsTrigger>
                <TabsTrigger value="more">More</TabsTrigger>
              </TabsList>
              <TabsContent value="entertainment">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {entertainmentItems.map((it) => (
                    <Button
                      key={it.url}
                      onClick={() => handleOpen(it.url)}
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
              </TabsContent>
              <TabsContent value="music">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {musicItems.map((it) => (
                    <Button
                      key={it.url}
                      onClick={() => handleOpen(it.url)}
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
              </TabsContent>
              <TabsContent value="docs">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {docsItems.map((it) => (
                    <Button
                      key={it.url}
                      onClick={() => handleOpen(it.url)}
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
              </TabsContent>
              <TabsContent value="more">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {moreItems.map((it) => (
                    <Button
                      key={it.url}
                      onClick={() => handleOpen(it.url)}
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
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Bookmarks</CardTitle>
              {bookmarks.length > 0 && (
                <div className="relative w-32 sm:w-48">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    value={bookmarksQuery}
                    onChange={(e) => setBookmarksQuery(e.target.value)}
                    placeholder="Search..."
                    className="h-8 pl-7 text-xs"
                  />
                </div>
              )}
            </div>
            <CardDescription>Your saved pages.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {filteredBookmarks.length ? (
              <div className="flex flex-col gap-2">
                {filteredBookmarks.map((b) => (
                  <div key={b.url} className="flex items-center gap-2">
                    <Button
                      onClick={() => handleOpen(b.url)}
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
                {bookmarksQuery
                  ? "No matching bookmarks."
                  : "No bookmarks yet."}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Recent History</CardTitle>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <div className="relative w-32 sm:w-48">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      value={historyQuery}
                      onChange={(e) => setHistoryQuery(e.target.value)}
                      placeholder="Search..."
                      className="h-8 pl-7 text-xs"
                    />
                  </div>
                )}
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
            </div>
            <CardDescription>Last 10 opened pages.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {filteredHistory.length ? (
              <div className="flex flex-col gap-2">
                {filteredHistory.map((h) => (
                  <Button
                    key={`${h.url}-${h.at}`}
                    onClick={() => handleOpen(h.url)}
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
                {historyQuery ? "No matching history." : "No history yet."}
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
  const addInspectorAttachments = useBrowserTabsStore(
    (s) => s.addInspectorAttachments
  );
  const removeInspectorAttachment = useBrowserTabsStore(
    (s) => s.removeInspectorAttachment
  );
  const setInspectorCaptureMode = useBrowserTabsStore(
    (s) => s.setInspectorCaptureMode
  );
  const removeInspectorAutoCaptures = useBrowserTabsStore(
    (s) => s.removeInspectorAutoCaptures
  );

  const selectedElement = inspector?.selected?.element || inspector?.selected;
  const hoverElement = inspector?.hover?.element || inspector?.hover;
  const inspectorAttachmentsByTabId = inspector?.attachmentsByTabId || {};
  const inspectorAttachments = inspectorAttachmentsByTabId?.[activeTabId] || [];
  const captureModeByTabId = inspector?.captureModeByTabId || {};
  const captureMode = captureModeByTabId?.[activeTabId] || "area";

  const [copied, setCopied] = useState(false);
  const [htmlCopied, setHtmlCopied] = useState(false);
  const [cloneBusy, setCloneBusy] = useState(false);
  const [previewElement, setPreviewElement] = useState(null);
  const [code, setCode] = useState("");
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [fileInputBusy, setFileInputBusy] = useState(false);
  const fileInputRef = useRef(null);
  const [dropActive, setDropActive] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const attachmentsRef = useRef([]);

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
    if (!selectedElement?.outerHTML) {
      setPreviewElement(null);
      setCode("");
      setHtmlCopied(false);
      return;
    }
    const next = htmlToCanvasElementTree(selectedElement?.outerHTML);
    setPreviewElement(next);
    setCode(buildShadcnSnippet(next));
    setCopied(false);
    setHtmlCopied(false);
  }, [devPanel.activeTool, selectedElement?.outerHTML]);

  const handleOpenFilePicker = useCallback(() => {
    if (fileInputBusy) return;
    try {
      fileInputRef.current?.click?.();
    } catch {}
  }, [fileInputBusy]);

  const handleAddFiles = useCallback(
    async (files) => {
      if (!activeTabId) return;
      if (!files) return;

      const MAX_FILES = 20;
      const MAX_FILE_BYTES = 25 * 1024 * 1024;

      const list = Array.from(files || []).filter(Boolean);
      if (list.length === 0) return;

      const existing = Array.isArray(inspectorAttachments)
        ? inspectorAttachments
        : [];
      const availableSlots = MAX_FILES - existing.length;
      if (availableSlots <= 0) {
        toast.error("Upload limit reached", {
          description: `You can attach up to ${MAX_FILES} files per inspect session.`,
        });
        return;
      }

      if (list.length > availableSlots) {
        toast.error("Upload limit reached", {
          description: `Only the first ${availableSlots} file(s) will be attached.`,
        });
      }

      setFileInputBusy(true);
      try {
        const nextAttachments = [];
        for (const file of list.slice(0, availableSlots)) {
          const name = String(file?.name || "file");
          const sizeBytes = Number(file?.size) || 0;
          const mimeType = String(file?.type || "application/octet-stream");

          if (sizeBytes <= 0) {
            toast.error("Unsupported file", { description: name });
            continue;
          }

          if (sizeBytes > MAX_FILE_BYTES) {
            toast.error("File too large", {
              description: `${name} exceeds ${formatBytes(MAX_FILE_BYTES)}.`,
            });
            continue;
          }

          let objectUrl;
          try {
            objectUrl = URL.createObjectURL(file);
          } catch {
            toast.error("Failed to attach file", { description: name });
            continue;
          }

          nextAttachments.push({
            id: createId(),
            name,
            sizeBytes,
            mimeType,
            kind: inferFileKind(mimeType, name),
            createdAt: new Date().toISOString(),
            source: "upload",
            objectUrl,
          });
        }

        if (nextAttachments.length === 0) return;
        addInspectorAttachments(activeTabId, nextAttachments);
      } catch (err) {
        toast.error("Upload failed", {
          description: String(err?.message || err),
        });
      } finally {
        setFileInputBusy(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [activeTabId, addInspectorAttachments, inspectorAttachments]
  );

  const handleDeleteAttachment = useCallback(
    (attachment) => {
      try {
        revokeAttachmentUrl(attachment);
      } finally {
        removeInspectorAttachment(activeTabId, attachment?.id);
      }
    },
    [activeTabId, removeInspectorAttachment]
  );

  const handleCopyAttachment = useCallback(async (attachment) => {
    const a = attachment && typeof attachment === "object" ? attachment : null;
    if (!a) return;
    if (!isImageAttachment(a)) return;
    const url = a.dataUrl || a.objectUrl;
    const dataUrl = await urlToDataUrl(url);
    if (!dataUrl) {
      toast.error("Copy failed", { description: "Unsupported image source." });
      return;
    }

    let ok = false;
    try {
      const fn = window.electronAPI?.clipboardWriteImageDataUrl;
      ok = typeof fn === "function" ? Boolean(await fn(dataUrl)) : false;
    } catch {
      ok = false;
    }
    if (!ok) {
      toast.error("Copy failed", { description: "Clipboard not available." });
      return;
    }
    toast("Copied to clipboard");
  }, []);

  const handleRemoveCaptures = useCallback(() => {
    if (!activeTabId) return;
    const items = Array.isArray(inspectorAttachments)
      ? inspectorAttachments
      : [];
    const removed = items.filter((a) => String(a?.source) === "auto-capture");
    for (const a of removed) revokeAttachmentUrl(a);
    removeInspectorAutoCaptures(activeTabId);
  }, [activeTabId, inspectorAttachments, removeInspectorAutoCaptures]);

  const openAttachmentPreview = useCallback((attachment) => {
    const a = attachment && typeof attachment === "object" ? attachment : null;
    if (!a) return;
    const url = a.dataUrl || a.objectUrl;
    if (!url) return;

    if (a.kind === "image") {
      setPreviewAttachment(a);
      setFileDialogOpen(true);
      return;
    }
    try {
      window.open(String(url), "_blank", "noopener,noreferrer");
    } catch {}
  }, []);

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

  useEffect(() => {
    attachmentsRef.current = Array.isArray(inspectorAttachments)
      ? inspectorAttachments
      : [];
  }, [inspectorAttachments]);

  useEffect(() => {
    return () => {
      for (const a of attachmentsRef.current) revokeAttachmentUrl(a);
    };
  }, []);

  return (
    <div
      className="relative h-full border-l bg-background"
      style={{ width: devPanel.width }}
    >
      <div className="absolute left-0 top-0 h-full w-1 cursor-col-resize bg-transparent" />

      <button
        type="button"
        aria-label="Resize panel"
        className="absolute left-0 top-0 h-full w-2 cursor-col-resize bg-transparent"
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
          <Button
            size="sm"
            variant={
              devPanel.activeTool === "kubb-hooks" ? "secondary" : "ghost"
            }
            onClick={() => setDevPanelTool("kubb-hooks")}
          >
            <FileJson className="mr-2 h-4 w-4" />
            Kubb Hooks
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
              <div className="p-4 text-sm text-muted-foreground">
                Loading...
              </div>
            }
          >
            <ReactQueryPanel />
          </React.Suspense>
        ) : null}

        {devPanel.activeTool === "kubb-hooks" ? (
          <React.Suspense
            fallback={
              <div className="p-4 text-sm text-muted-foreground">
                Loading...
              </div>
            }
          >
            <KubbHooksPlaygroundPanel />
          </React.Suspense>
        ) : null}

        {devPanel.activeTool === "inspector" ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-2 px-4 py-2">
              <div className="min-w-0">
                <div className="text-sm font-medium">Inspector</div>
                <div className="text-xs text-muted-foreground truncate">
                  {activeIsBrowser
                    ? selectedElement?.selector ||
                      hoverElement?.selector ||
                      "Pick an element to convert"
                    : "Open a browser tab to inspect"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-md border bg-background p-1">
                  <Button
                    size="sm"
                    variant={captureMode === "area" ? "secondary" : "ghost"}
                    className="h-8 px-2"
                    disabled={
                      !hasElectronView || !activeIsBrowser || !isRouteActive
                    }
                    aria-label="Capture mode: Area"
                    onClick={() => setInspectorCaptureMode(activeTabId, "area")}
                  >
                    Area
                  </Button>
                  <Button
                    size="sm"
                    variant={captureMode === "full" ? "secondary" : "ghost"}
                    className="h-8 px-2"
                    disabled={
                      !hasElectronView || !activeIsBrowser || !isRouteActive
                    }
                    aria-label="Capture mode: Full"
                    onClick={() => setInspectorCaptureMode(activeTabId, "full")}
                  >
                    Full
                  </Button>
                </div>
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
                      {selectedElement?.tagName
                        ? `${String(
                            selectedElement?.tagName
                          ).toLowerCase()} · ${
                            selectedElement?.rect?.width
                              ? `${Math.round(
                                  selectedElement?.rect?.width
                                )}×${Math.round(
                                  selectedElement?.rect?.height || 0
                                )}`
                              : ""
                          }`
                        : "No element selected yet"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedElement?.text ? (
                      <div className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {selectedElement?.text}
                      </div>
                    ) : null}
                    {selectedElement?.selector ? (
                      <div className="text-xs font-mono text-muted-foreground break-words">
                        {selectedElement?.selector}
                      </div>
                    ) : null}
                    {selectedElement?.outerHTML ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-medium text-muted-foreground">
                            HTML
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            aria-label="Copy HTML"
                            onClick={async () => {
                              const html = String(
                                selectedElement?.outerHTML || ""
                              );
                              if (!html) return;
                              const ok = await copyToClipboard(html);
                              if (!ok) {
                                toast.error("Copy failed");
                                return;
                              }
                              setHtmlCopied(true);
                              setTimeout(() => setHtmlCopied(false), 1000);
                            }}
                          >
                            {htmlCopied ? (
                              <Check className="mr-2 h-4 w-4" />
                            ) : (
                              <Copy className="mr-2 h-4 w-4" />
                            )}
                            Copy
                          </Button>
                        </div>
                        <pre className="max-h-[220px] overflow-auto rounded-md border bg-muted/30 p-3 text-[11px]">
                          {String(selectedElement?.outerHTML)}
                        </pre>
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

                <Card className="border-l-4 border-primary/60 bg-primary/5">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-sm">
                          Agent attachments
                        </CardTitle>
                        <CardDescription>
                          Auto-captured screenshots and your uploaded files.
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {Array.isArray(inspectorAttachments)
                            ? inspectorAttachments.length
                            : 0}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={
                            !Array.isArray(inspectorAttachments) ||
                            !inspectorAttachments.some(
                              (a) => String(a?.source) === "auto-capture"
                            )
                          }
                          onClick={handleRemoveCaptures}
                          aria-label="Remove captures"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Remove
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={fileInputBusy}
                          onClick={handleOpenFilePicker}
                          aria-label="Upload files"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Upload
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      aria-label="File upload input"
                      onChange={(e) => handleAddFiles(e.target.files)}
                    />

                    <button
                      type="button"
                      aria-label="Drop files to upload"
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        dropActive
                          ? "border-primary bg-background"
                          : "bg-background/60 hover:bg-background"
                      )}
                      onClick={handleOpenFilePicker}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDropActive(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDropActive(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDropActive(false);
                        handleAddFiles(e.dataTransfer?.files);
                      }}
                    >
                      <div className="font-medium text-foreground">
                        Drag and drop files here
                      </div>
                      <div>or click to upload</div>
                      <div className="text-[11px]">
                        Max 20 files, 25MB each.
                      </div>
                    </button>

                    {Array.isArray(inspectorAttachments) &&
                    inspectorAttachments.length ? (
                      <div className="flex flex-col gap-2">
                        {inspectorAttachments.map((a) => {
                          const url = a?.dataUrl || a?.objectUrl;
                          const created = formatDateTime(a?.createdAt);
                          const typeLabel = String(a?.mimeType || "");
                          const kindLabel = String(a?.kind || "file");
                          const sourceLabel = String(a?.source || "");

                          return (
                            <div
                              key={a.id}
                              className="flex flex-col gap-2 rounded-md border bg-background p-3 sm:flex-row sm:items-center"
                            >
                              <button
                                type="button"
                                className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                onClick={() => openAttachmentPreview(a)}
                                aria-label={`Preview ${String(
                                  a?.name || "attachment"
                                )}`}
                              >
                                {a?.kind === "image" && url ? (
                                  <img
                                    src={url}
                                    alt={String(a?.name || "Image")}
                                    className="h-10 w-10 shrink-0 rounded border object-cover"
                                  />
                                ) : (
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border bg-muted/30">
                                    <Image className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium">
                                    {String(a?.name || "Attachment")}
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                                    <span>{formatBytes(a?.sizeBytes)}</span>
                                    {typeLabel ? (
                                      <>
                                        <span>•</span>
                                        <span className="truncate">
                                          {typeLabel}
                                        </span>
                                      </>
                                    ) : null}
                                    {created ? (
                                      <>
                                        <span>•</span>
                                        <span>{created}</span>
                                      </>
                                    ) : null}
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-center gap-1">
                                    <Badge
                                      variant="outline"
                                      className="text-[10px]"
                                    >
                                      {kindLabel}
                                    </Badge>
                                    {sourceLabel ? (
                                      <Badge
                                        variant="secondary"
                                        className="text-[10px]"
                                      >
                                        {sourceLabel}
                                      </Badge>
                                    ) : null}
                                  </div>
                                </div>
                              </button>
                              <div className="flex items-center gap-2 sm:ml-auto">
                                {isImageAttachment(a) ? (
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    disabled={!url}
                                    aria-label={`Copy ${String(
                                      a?.name || "attachment"
                                    )} to clipboard`}
                                    onClick={async (e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      await handleCopyAttachment(a);
                                    }}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                ) : null}
                                <Button
                                  size="icon"
                                  variant="outline"
                                  disabled={!url}
                                  aria-label={`Download ${String(
                                    a?.name || "attachment"
                                  )}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    downloadFromUrl(url, a?.name);
                                  }}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  aria-label={`Delete ${String(
                                    a?.name || "attachment"
                                  )}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDeleteAttachment(a);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No attachments yet. Pick an element to auto-capture, or
                        upload files.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>

            <Dialog
              open={fileDialogOpen}
              onOpenChange={(open) => {
                setFileDialogOpen(Boolean(open));
                if (!open) setPreviewAttachment(null);
              }}
            >
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>
                    {String(previewAttachment?.name || "Attachment")}
                  </DialogTitle>
                  <DialogDescription>
                    {previewAttachment?.sizeBytes
                      ? formatBytes(previewAttachment.sizeBytes)
                      : ""}
                    {previewAttachment?.mimeType
                      ? ` · ${String(previewAttachment.mimeType)}`
                      : ""}
                    {previewAttachment?.createdAt
                      ? ` · ${formatDateTime(previewAttachment.createdAt)}`
                      : ""}
                  </DialogDescription>
                </DialogHeader>
                {previewAttachment?.kind === "image" ? (
                  <div className="overflow-hidden rounded-md border bg-background">
                    <img
                      src={
                        previewAttachment?.dataUrl ||
                        previewAttachment?.objectUrl
                      }
                      alt={String(previewAttachment?.name || "Image")}
                      className="max-h-[70vh] w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Preview is not available for this file type.
                  </div>
                )}
                <div className="flex items-center justify-end gap-2">
                  {isImageAttachment(previewAttachment) ? (
                    <Button
                      variant="outline"
                      onClick={async () =>
                        await handleCopyAttachment(previewAttachment)
                      }
                      disabled={
                        !(
                          previewAttachment?.dataUrl ||
                          previewAttachment?.objectUrl
                        )
                      }
                      aria-label="Copy attachment to clipboard"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                  ) : null}
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (!previewAttachment) return;
                      handleDeleteAttachment(previewAttachment);
                      setFileDialogOpen(false);
                      setPreviewAttachment(null);
                    }}
                    disabled={!previewAttachment}
                    aria-label="Delete attachment"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      downloadFromUrl(
                        previewAttachment?.dataUrl ||
                          previewAttachment?.objectUrl,
                        previewAttachment?.name
                      )
                    }
                    disabled={
                      !(
                        previewAttachment?.dataUrl ||
                        previewAttachment?.objectUrl
                      )
                    }
                    aria-label="Download attachment"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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

const KubbHooksPlaygroundPanel = React.lazy(
  () => import("../components/kubb/KubbHooksPlaygroundPanel")
);

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
  const addInspectorAttachments = useBrowserTabsStore(
    (s) => s.addInspectorAttachments
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

  const captureModeByTabId = inspector?.captureModeByTabId || {};
  const captureMode = captureModeByTabId?.[resolvedActiveTabId] || "area";

  const lastInspectorTabIdRef = useRef(null);
  const lastAutoCaptureRef = useRef(null);

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
      async (payload) => {
        if (!payload?.tabId) return;
        if (payload.tabId !== resolvedActiveTabId) return;
        setInspectorSelection(payload);
        setInspectorEnabled(false);

        const rect = payload?.rect;
        const selector = payload?.selector || payload?.tagName || "selection";
        const mode = captureMode === "full" ? "full" : "area";
        const captureKey =
          mode === "full"
            ? `${String(payload.tabId)}::${String(selector)}::full`
            : `${String(payload.tabId)}::${String(
                selector
              )}::area::${Math.round(Number(rect?.x) || 0)},${Math.round(
                Number(rect?.y) || 0
              )},${Math.round(Number(rect?.width) || 0)}x${Math.round(
                Number(rect?.height) || 0
              )}`;

        if (lastAutoCaptureRef.current !== captureKey) {
          const canCaptureFull = Boolean(
            window.electronAPI?.browserView?.capturePage
          );
          const canCaptureArea = Boolean(
            rect && window.electronAPI?.browserView?.captureRegion
          );
          if (
            (mode === "full" && canCaptureFull) ||
            (mode === "area" && canCaptureArea)
          ) {
            lastAutoCaptureRef.current = captureKey;
          } else {
            lastAutoCaptureRef.current = null;
          }
        }

        if (lastAutoCaptureRef.current === captureKey) {
          try {
            const res =
              mode === "full"
                ? await window.electronAPI.browserView.capturePage(
                    payload.tabId
                  )
                : await window.electronAPI.browserView.captureRegion(
                    payload.tabId,
                    rect
                  );
            if (res?.ok && res?.dataUrl) {
              const safeBase = String(selector)
                .replaceAll(/[^a-z0-9._-]+/gi, "-")
                .slice(0, 60)
                .replaceAll(/^-+|-+$/g, "");
              const ts = new Date().toISOString().replaceAll(":", "-");
              const filename = `${safeBase || "selection"}-${mode}-${ts}.png`;
              addInspectorAttachments(payload.tabId, [
                {
                  id: createId(),
                  name: filename,
                  sizeBytes: Number(res?.byteLength) || 0,
                  mimeType: String(res?.mimeType || "image/png"),
                  kind: "image",
                  createdAt: new Date().toISOString(),
                  source: "auto-capture",
                  dataUrl: String(res.dataUrl),
                },
              ]);
            } else if (res?.ok === false && res?.error) {
              toast.error("Auto-capture failed", {
                description: String(res.error),
              });
            }
          } catch (err) {
            toast.error("Auto-capture failed", {
              description: String(err?.message || err),
            });
          }
        }

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
    captureMode,
    addInspectorAttachments,
    setInspectorEnabled,
    setInspectorHover,
    setInspectorSelection,
  ]);

  useEffect(() => {
    if (!hasElectronView) return;

    const prevTabId = lastInspectorTabIdRef.current;
    lastInspectorTabIdRef.current = resolvedActiveTabId;

    const tabChanged = Boolean(prevTabId && prevTabId !== resolvedActiveTabId);

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

      if (tabChanged || activeTab?.kind !== "browser" || !isRouteActive) {
        clearInspector();
      } else if (inspector?.hover) {
        setInspectorHover(null);
      }
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
    inspector?.hover,
    isRouteActive,
    resolvedActiveTabId,
    setInspectorEnabled,
    setInspectorHover,
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
    const url = normalizeUrl(address);
    if (!url) return;

    if (activeTab?.kind === "dashboard") {
      openInNewTab(url);
      setAddress("");
      return;
    }

    if (!activeIsBrowser) return;

    try {
      updateTabState(resolvedActiveTabId, { url });
      addHistoryEntry(url, url);

      if (hasElectronView) {
        if (window.electronAPI?.browserView?.loadURL) {
          await window.electronAPI.browserView.loadURL(
            resolvedActiveTabId,
            url
          );
        }
        return;
      }

      if (iframeRef.current) {
        iframeRef.current.src = url;
      }
    } catch (err) {
      console.error("Navigation error:", err);
      toast.error("Failed to load URL", {
        description: String(err?.message || err),
      });
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
            placeholder="Enter URL or search"
            onKeyDown={(e) => {
              if (e.key === "Enter") go().catch(() => {});
            }}
          />
          <Button variant="secondary" onClick={() => go()}>
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
            <webview ref={contentRef} className="absolute inset-0">
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
            </webview>
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
