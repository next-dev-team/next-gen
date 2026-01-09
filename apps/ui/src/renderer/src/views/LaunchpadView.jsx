import {
  AppWindow,
  Camera,
  Folder,
  Github,
  Globe,
  LayoutGrid,
  Rocket,
  Search,
  Settings,
  Table,
  TestTube,
} from "lucide-react";
import React from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { cn } from "../lib/utils";

const DOCK_RECENT_ACTIONS_KEY = "dockRecentActions";
const LAUNCHPAD_USAGE_KEY = "launchpadActionUsage";

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function loadUsage() {
  try {
    const raw = localStorage.getItem(LAUNCHPAD_USAGE_KEY);
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveUsage(next) {
  try {
    localStorage.setItem(LAUNCHPAD_USAGE_KEY, JSON.stringify(next));
  } catch {}
}

function loadRecentDockActions() {
  try {
    const raw = localStorage.getItem(DOCK_RECENT_ACTIONS_KEY);
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
}

function pushRecentDockAction(item) {
  try {
    const list = loadRecentDockActions();
    const next = [item, ...list.filter((it) => it.key !== item.key)].slice(
      0,
      6
    );
    localStorage.setItem(DOCK_RECENT_ACTIONS_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("dock:recentActionsUpdated"));
  } catch {}
}

export default function LaunchpadView() {
  const searchRef = React.useRef(null);
  const [query, setQuery] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState("All");
  const [sortMode, setSortMode] = React.useState("recent");
  const [page, setPage] = React.useState(0);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [usage, setUsage] = React.useState(() => loadUsage());

  React.useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus?.();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  const actions = React.useMemo(
    () => [
      {
        key: "nav:generator",
        title: "Generator",
        category: "Tools",
        icon: Rocket,
        iconName: "rocket",
        actionKey: "nav:generator",
        gradient:
          "bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500",
        keywords: ["template", "scaffold", "project"],
      },
      {
        key: "nav:projects",
        title: "Projects",
        category: "Tools",
        icon: AppWindow,
        iconName: "app",
        actionKey: "nav:projects",
        gradient: "bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600",
        keywords: ["launcher", "workspace"],
      },
      {
        key: "nav:resources",
        title: "Resources",
        category: "Tools",
        icon: Folder,
        iconName: "folder",
        actionKey: "nav:resources",
        gradient: "bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500",
        keywords: ["screenshots", "assets"],
      },
      {
        key: "nav:ui",
        title: "UI Builder",
        category: "Tools",
        icon: LayoutGrid,
        iconName: "grid",
        actionKey: "nav:ui",
        gradient: "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600",
        keywords: ["components", "editor", "shadcn"],
      },
      {
        key: "nav:scrum-board",
        title: "Scrum Board",
        category: "Tools",
        icon: Table,
        iconName: "table",
        actionKey: "nav:scrum-board",
        gradient: "bg-gradient-to-br from-fuchsia-500 via-pink-500 to-rose-600",
        keywords: ["kanban", "board"],
      },
      {
        key: "nav:browser",
        title: "Browser",
        category: "Browser",
        icon: Globe,
        iconName: "globe",
        actionKey: "nav:browser",
        gradient: "bg-gradient-to-br from-blue-500 via-cyan-500 to-emerald-500",
        keywords: ["web", "tabs", "history", "bookmarks"],
      },
      {
        key: "nav:tests",
        title: "Tests",
        category: "Tools",
        icon: TestTube,
        iconName: "test",
        actionKey: "nav:tests",
        gradient:
          "bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-700",
        keywords: ["test management"],
      },
      {
        key: "nav:settings",
        title: "Settings",
        category: "Menu",
        icon: Settings,
        iconName: "settings",
        actionKey: "nav:settings",
        gradient: "bg-gradient-to-br from-zinc-500 via-slate-600 to-stone-700",
        keywords: ["preferences", "dock"],
      },
      {
        key: "capture:app:full",
        title: "Screenshot (App)",
        category: "Capture",
        icon: Camera,
        iconName: "camera",
        actionKey: "capture:app:full",
        gradient: "bg-gradient-to-br from-rose-500 via-red-500 to-orange-500",
        keywords: ["capture", "copy", "clipboard"],
        shortcut: "⌥⇧1",
      },
      {
        key: "capture:app:area",
        title: "Screenshot (App Area)",
        category: "Capture",
        icon: Camera,
        iconName: "camera",
        actionKey: "capture:app:area",
        gradient:
          "bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500",
        keywords: ["capture", "area"],
        shortcut: "⌥⇧2",
      },
      {
        key: "capture:screen:full",
        title: "Screenshot (Screen)",
        category: "Capture",
        icon: Camera,
        iconName: "camera",
        actionKey: "capture:screen:full",
        gradient:
          "bg-gradient-to-br from-purple-500 via-violet-500 to-indigo-500",
        keywords: ["external", "display"],
        shortcut: "⌥⇧3",
      },
      {
        key: "capture:screen:area",
        title: "Screenshot (Screen Area)",
        category: "Capture",
        icon: Camera,
        iconName: "camera",
        actionKey: "capture:screen:area",
        gradient: "bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-500",
        keywords: ["external", "display", "crop"],
        shortcut: "⌥⇧4",
      },
      {
        key: "openExternal:github",
        title: "Open GitHub",
        category: "Shortcuts",
        icon: Github,
        iconName: "search",
        actionKey: "openExternal:github",
        gradient:
          "bg-gradient-to-br from-neutral-700 via-zinc-700 to-slate-800",
        keywords: ["repo", "source"],
      },
      {
        key: "dock:toggleAutoHide",
        title: "Toggle Dock Auto-hide",
        category: "Menu",
        icon: Search,
        iconName: "search",
        actionKey: "dock:toggleAutoHide",
        gradient:
          "bg-gradient-to-br from-slate-500 via-zinc-500 to-neutral-600",
        keywords: ["dock", "pin"],
      },
    ],
    []
  );

  const categories = React.useMemo(() => {
    const set = new Set();
    for (const a of actions) set.add(a.category);
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [actions]);

  const filteredActions = React.useMemo(() => {
    const q = normalizeText(query);
    const cat = String(activeCategory || "All");

    const matchesCategory = (a) =>
      cat === "All" ? true : String(a.category) === cat;

    const matchesQuery = (a) => {
      if (!q) return true;
      const hay = [a.title, a.category, ...(a.keywords || [])]
        .map(normalizeText)
        .join(" ");
      return hay.includes(q);
    };

    return actions.filter((a) => matchesCategory(a) && matchesQuery(a));
  }, [actions, activeCategory, query]);

  const sortedActions = React.useMemo(() => {
    const q = normalizeText(query);
    const list = [...filteredActions];

    const recentScore = (a) => {
      const u = usage?.[a.key];
      const t = u && typeof u === "object" ? Number(u.lastUsedAt) || 0 : 0;
      return t;
    };

    const scoreQuery = (a) => {
      if (!q) return 0;
      const title = normalizeText(a.title);
      if (title === q) return 200;
      if (title.startsWith(q)) return 140;
      if (title.includes(q)) return 90;
      const keyw = (a.keywords || []).map(normalizeText);
      if (keyw.some((k) => k === q)) return 80;
      if (keyw.some((k) => k.startsWith(q))) return 60;
      if (keyw.some((k) => k.includes(q))) return 40;
      const cat = normalizeText(a.category);
      if (cat.startsWith(q)) return 30;
      if (cat.includes(q)) return 18;
      return 0;
    };

    if (q) {
      list.sort((a, b) => {
        const sb = scoreQuery(b);
        const sa = scoreQuery(a);
        if (sb !== sa) return sb - sa;
        const rb = recentScore(b);
        const ra = recentScore(a);
        if (rb !== ra) return rb - ra;
        return String(a.title).localeCompare(String(b.title));
      });
      return list;
    }

    if (sortMode === "az") {
      list.sort((a, b) => String(a.title).localeCompare(String(b.title)));
      return list;
    }

    list.sort((a, b) => {
      const rb = recentScore(b);
      const ra = recentScore(a);
      if (rb !== ra) return rb - ra;
      return String(a.title).localeCompare(String(b.title));
    });
    return list;
  }, [filteredActions, query, sortMode, usage]);

  const runAction = React.useCallback((action) => {
    if (!action) return;
    const now = Date.now();
    setUsage((prev) => {
      const next = {
        ...(prev && typeof prev === "object" ? prev : {}),
        [action.key]: {
          count: Number(prev?.[action.key]?.count || 0) + 1,
          lastUsedAt: now,
        },
      };
      saveUsage(next);
      return next;
    });

    pushRecentDockAction({
      key: action.key,
      label: action.title,
      iconName: action.iconName,
      actionKey: action.actionKey,
      gradient: action.gradient,
    });

    window.dispatchEvent(
      new CustomEvent("launchpad:run", {
        detail: { actionKey: action.actionKey, payload: action.payload },
      })
    );
  }, []);

  const pageSize = 28;
  const pages = React.useMemo(() => {
    if (normalizeText(query)) return 1;
    return Math.max(1, Math.ceil(sortedActions.length / pageSize));
  }, [query, sortedActions.length]);

  const pagedGridActions = React.useMemo(() => {
    if (normalizeText(query)) return [];
    const start = page * pageSize;
    return sortedActions.slice(start, start + pageSize);
  }, [page, query, sortedActions]);

  React.useEffect(() => {
    if (page >= pages) setPage(0);
  }, [page, pages]);

  const showResults = Boolean(normalizeText(query));
  const topResults = showResults ? sortedActions.slice(0, 10) : [];

  const pageIndices = React.useMemo(
    () => Array.from({ length: pages }, (_, i) => i + 1),
    [pages]
  );

  React.useEffect(() => {
    if (!showResults) return;
    const handler = (e) => {
      const key = e.key;
      if (key === "Escape") {
        e.preventDefault();
        setQuery("");
        searchRef.current?.blur?.();
        return;
      }
      if (key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, topResults.length - 1));
        return;
      }
      if (key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (key === "Enter") {
        const a = topResults[selectedIndex];
        if (!a) return;
        e.preventDefault();
        runAction(a);
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [runAction, selectedIndex, showResults, topResults]);

  return (
    <div className="relative h-full w-full overflow-hidden text-white">
      <div className="absolute inset-0 bg-[radial-gradient(1200px_900px_at_35%_25%,rgba(126,34,206,0.80)_0%,transparent_62%),radial-gradient(900px_800px_at_70%_75%,rgba(14,165,233,0.55)_0%,transparent_58%),radial-gradient(1100px_900px_at_88%_30%,rgba(244,63,94,0.50)_0%,transparent_55%),linear-gradient(135deg,rgba(49,46,129,0.94)_0%,rgba(88,28,135,0.92)_38%,rgba(19,78,74,0.90)_100%)]" />
      <div className="pointer-events-none absolute inset-0 backdrop-blur-[22px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.18)_0%,transparent_42%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:18px_18px]" />

      <div className="relative z-10 flex h-full w-full flex-col">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 px-6 pt-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search"
              className="h-10 w-full rounded-xl border-white/10 bg-white/10 pl-9 pr-9 text-sm text-white placeholder:text-white/60 shadow-[0_12px_30px_rgba(0,0,0,0.22)] backdrop-blur-2xl focus-visible:ring-2 focus-visible:ring-white/25"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  setSelectedIndex(0);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-1 text-xs text-white/70 hover:bg-white/10 hover:text-white"
              >
                Esc
              </button>
            ) : (
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/55">
                ⌘K
              </div>
            )}
          </div>

          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {categories.map((cat) => {
                const active = cat === activeCategory;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setActiveCategory(cat);
                      setPage(0);
                      setSelectedIndex(0);
                    }}
                    className={cn(
                      "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium transition cursor-pointer",
                      active
                        ? "border-menu-active bg-menu-active text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
                        : "border-white/10 bg-white/8 text-white/75 hover:bg-menu-active hover:text-white"
                    )}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSortMode((m) => (m === "recent" ? "az" : "recent"));
                  setPage(0);
                  setSelectedIndex(0);
                }}
                className="h-8 rounded-full bg-white/8 px-3 text-xs text-white/80 hover:bg-white/12 hover:text-white"
              >
                {sortMode === "recent" ? "Recent" : "A–Z"}
              </Button>
            </div>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden px-6 pb-28 pt-6">
          {showResults ? (
            <div className="mx-auto w-full max-w-2xl">
              <div className="rounded-2xl border border-white/12 bg-white/10 shadow-[0_26px_70px_rgba(0,0,0,0.40)] backdrop-blur-2xl">
                <div className="px-4 py-3 text-xs text-white/70">
                  {sortedActions.length} results
                </div>
                <div className="max-h-[56vh] overflow-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {topResults.length ? (
                    topResults.map((a, idx) => {
                      const Icon = a.icon;
                      const active = idx === selectedIndex;
                      return (
                        <button
                          key={a.key}
                          type="button"
                          onMouseEnter={() => setSelectedIndex(idx)}
                          onClick={() => runAction(a)}
                          className={cn(
                            "flex w-full items-center gap-3 px-4 py-2.5 text-left transition",
                            active ? "bg-white/14" : "hover:bg-white/10"
                          )}
                        >
                          <span
                            className={cn(
                              "relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl shadow-[0_18px_34px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.25)]",
                              a.gradient
                            )}
                          >
                            <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_30%_18%,rgba(255,255,255,0.40)_0%,transparent_70%)]" />
                            <Icon className="relative h-5 w-5 text-white/95" />
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-white">
                              {a.title}
                            </span>
                            <span className="block truncate text-xs text-white/65">
                              {a.category}
                            </span>
                          </span>

                          {a.shortcut ? (
                            <span className="shrink-0 rounded-md border border-white/10 bg-white/8 px-2 py-1 text-[11px] text-white/70">
                              {a.shortcut}
                            </span>
                          ) : null}
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-4 py-10 text-center text-sm text-white/70">
                      No matches
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center">
              <div className="grid w-full grid-cols-4 gap-x-4 gap-y-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8">
                {pagedGridActions.map((a) => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.key}
                      type="button"
                      onClick={() => runAction(a)}
                      className="group flex flex-col items-center gap-2 cursor-pointer"
                    >
                      <span
                        className={cn(
                          "relative flex h-[74px] w-[74px] items-center justify-center overflow-hidden rounded-[20px] border border-white/12 shadow-[0_24px_52px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.26)] transition-transform duration-150 ease-out group-hover:scale-[1.06] group-active:scale-[0.98]",
                          a.gradient
                        )}
                      >
                        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_30%_18%,rgba(255,255,255,0.42)_0%,transparent_70%)]" />
                        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_85%_at_50%_92%,rgba(0,0,0,0.42)_0%,transparent_58%)]" />
                        <Icon className="relative h-7 w-7 text-white/95 drop-shadow" />
                      </span>

                      <span className="w-full max-w-[132px] line-clamp-2 text-center text-[11px] leading-tight font-medium text-white/90">
                        {a.title}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-7 flex items-center gap-2">
                {pageIndices.map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-label={`Page ${p}`}
                    onClick={() => setPage(p - 1)}
                    className={cn(
                      "h-2 w-2 rounded-full transition",
                      p - 1 === page
                        ? "bg-white/80"
                        : "bg-white/30 hover:bg-white/45"
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
