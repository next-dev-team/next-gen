import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const DASHBOARD_TAB_ID = "dashboard";

const normalizeStoredUrl = (input) => {
  const raw = String(input || "").trim();
  if (!raw) return "";
  if (/^about:/i.test(raw)) return raw;
  if (/^https?:\/\//i.test(raw) || /^file:\/\//i.test(raw)) {
    try {
      return new URL(raw).toString();
    } catch {
      return raw;
    }
  }
  try {
    return new URL(`https://${raw}`).toString();
  } catch {
    return raw;
  }
};

const initialTabs = [
  {
    id: DASHBOARD_TAB_ID,
    title: "Dashboard",
    kind: "dashboard",
    closable: false,
  },
];

export const useBrowserTabsStore = create(
  devtools(
    persist(
      (set, get) => ({
        tabs: initialTabs,
        activeTabId: DASHBOARD_TAB_ID,
        tabStateById: {},

        devPanel: {
          isOpen: false,
          width: 420,
          activeTool: "react-query",
          isFullWidth: false,
        },

        kubbPlayground: {
          activeSubTab: "kubb-hooks",
          configMode: "path",
          configPath: "ui/kubb.config.ts",
          configText: "",
          openApiUrl: "",
          validationErrors: [],
          hooksSearch: "",
          selectedHookId: "",
          paramsText: "{}",
          optionsText: "{}",
          useMockClient: true,
          autoRun: false,
        },

        networkLogs: [],

        bookmarks: [],
        history: [],

        dashboardState: {
          searchQuery: "",
          activeTab: "docs",
        },

        setDashboardSearchQuery: (query) =>
          set((state) => ({
            dashboardState: { ...state.dashboardState, searchQuery: query },
          })),

        setDashboardActiveTab: (tab) =>
          set((state) => ({
            dashboardState: { ...state.dashboardState, activeTab: tab },
          })),

        openUrlTab: (url, title) => {
          const trimmed = String(url || "").trim();
          if (!trimmed) return null;

          const id = createId();
          const nextTab = {
            id,
            title: title || trimmed,
            kind: "browser",
            closable: true,
          };

          set((state) => ({
            tabs: [...state.tabs, nextTab],
            activeTabId: id,
            tabStateById: {
              ...state.tabStateById,
              [id]: {
                url: trimmed,
                canGoBack: false,
                canGoForward: false,
                isLoading: true,
              },
            },
          }));

          return id;
        },

        addHistoryEntry: (url, title) => {
          const normalized = normalizeStoredUrl(url);
          if (!normalized) return;
          const at = new Date().toISOString();

          set((state) => {
            const history = Array.isArray(state.history) ? state.history : [];
            const next = [
              { url: normalized, title: title || normalized, at },
              ...history.filter(
                (h) => normalizeStoredUrl(h?.url) !== normalized
              ),
            ].slice(0, 10);
            return { history: next };
          });
        },

        clearHistory: () => set({ history: [] }),

        toggleBookmark: (url, title) => {
          const normalized = normalizeStoredUrl(url);
          if (!normalized) return;
          const createdAt = new Date().toISOString();

          set((state) => {
            const bookmarks = Array.isArray(state.bookmarks)
              ? state.bookmarks
              : [];
            const exists = bookmarks.some(
              (b) => normalizeStoredUrl(b?.url) === normalized
            );

            if (exists) {
              return {
                bookmarks: bookmarks.filter(
                  (b) => normalizeStoredUrl(b?.url) !== normalized
                ),
              };
            }

            return {
              bookmarks: [
                { url: normalized, title: title || normalized, createdAt },
                ...bookmarks,
              ],
            };
          });
        },

        removeBookmark: (url) => {
          const normalized = normalizeStoredUrl(url);
          if (!normalized) return;
          set((state) => ({
            bookmarks: (Array.isArray(state.bookmarks)
              ? state.bookmarks
              : []
            ).filter((b) => normalizeStoredUrl(b?.url) !== normalized),
          }));
        },

        setActiveTab: (tabId) => {
          const exists = get().tabs.some((t) => t.id === tabId);
          if (!exists) return;
          set({ activeTabId: tabId });
        },

        closeTab: (tabId) => {
          if (tabId === DASHBOARD_TAB_ID) return;
          const tabs = get().tabs;
          const idx = tabs.findIndex((t) => t.id === tabId);
          if (idx < 0) return;

          const nextTabs = tabs.filter((t) => t.id !== tabId);
          const nextActive =
            get().activeTabId === tabId
              ? (nextTabs[idx - 1] || nextTabs[idx] || nextTabs[0])?.id
              : get().activeTabId;

          set((state) => {
            const { [tabId]: _removed, ...rest } = state.tabStateById;
            return {
              tabs: nextTabs,
              activeTabId: nextActive || DASHBOARD_TAB_ID,
              tabStateById: rest,
            };
          });
        },

        updateTabState: (tabId, patch) => {
          set((state) => ({
            tabStateById: {
              ...state.tabStateById,
              [tabId]: {
                ...(state.tabStateById[tabId] || {}),
                ...(patch || {}),
              },
            },
          }));
        },

        setDevPanelOpen: (isOpen) => {
          set((state) => ({
            devPanel: {
              ...state.devPanel,
              isOpen: Boolean(isOpen),
            },
          }));
        },

        setDevPanelWidth: (width) => {
          const nextWidth = Math.max(280, Math.min(900, Number(width) || 0));
          if (!nextWidth) return;
          set((state) => ({
            devPanel: {
              ...state.devPanel,
              width: nextWidth,
            },
          }));
        },

        setDevPanelTool: (tool) => {
          const next = String(tool || "").trim();
          if (!next) return;
          set((state) => ({
            devPanel: {
              ...state.devPanel,
              activeTool: next,
            },
          }));
        },

        toggleDevPanelFullWidth: () => {
          set((state) => ({
            devPanel: {
              ...state.devPanel,
              isFullWidth: !state.devPanel.isFullWidth,
            },
          }));
        },

        setKubbPlaygroundState: (patch) => {
          set((state) => ({
            kubbPlayground: {
              ...state.kubbPlayground,
              ...(patch || {}),
            },
          }));
        },

        addNetworkLog: (entry) => {
          set((state) => {
            const next = [entry, ...state.networkLogs].slice(0, 200);
            return { networkLogs: next };
          });
        },

        clearNetworkLogs: () => set({ networkLogs: [] }),

        inspector: {
          enabled: false,
          selected: null,
          hover: null,
          attachmentsByTabId: {},
          captureModeByTabId: {},
        },

        setInspectorEnabled: (enabled) =>
          set((state) => ({
            inspector: { ...state.inspector, enabled: Boolean(enabled) },
          })),

        setInspectorHover: (payload) =>
          set((state) => ({
            inspector: { ...state.inspector, hover: payload },
          })),

        setInspectorSelection: (payload) =>
          set((state) => ({
            inspector: { ...state.inspector, selected: payload },
          })),

        setInspectorCaptureMode: (tabId, mode) => {
          const key = String(tabId || "").trim();
          if (!key) return;
          const next = String(mode || "")
            .trim()
            .toLowerCase();
          const normalized = next === "full" ? "full" : "area";
          set((state) => {
            const prevById =
              state.inspector && typeof state.inspector === "object"
                ? state.inspector.captureModeByTabId
                : {};
            return {
              inspector: {
                ...state.inspector,
                captureModeByTabId: {
                  ...(prevById || {}),
                  [key]: normalized,
                },
              },
            };
          });
        },

        addInspectorAttachments: (tabId, attachments) => {
          const key = String(tabId || "").trim();
          if (!key) return;
          const items = Array.isArray(attachments) ? attachments : [];
          if (items.length === 0) return;
          set((state) => {
            const prevById =
              state.inspector && typeof state.inspector === "object"
                ? state.inspector.attachmentsByTabId
                : {};
            const prev = Array.isArray(prevById?.[key]) ? prevById[key] : [];
            return {
              inspector: {
                ...state.inspector,
                attachmentsByTabId: {
                  ...(prevById || {}),
                  [key]: [...items, ...prev],
                },
              },
            };
          });
        },

        removeInspectorAttachment: (tabId, attachmentId) => {
          const key = String(tabId || "").trim();
          const targetId = String(attachmentId || "").trim();
          if (!key || !targetId) return;
          set((state) => {
            const prevById =
              state.inspector && typeof state.inspector === "object"
                ? state.inspector.attachmentsByTabId
                : {};
            const prev = Array.isArray(prevById?.[key]) ? prevById[key] : [];
            return {
              inspector: {
                ...state.inspector,
                attachmentsByTabId: {
                  ...(prevById || {}),
                  [key]: prev.filter((a) => String(a?.id) !== targetId),
                },
              },
            };
          });
        },

        clearInspectorAttachments: (tabId) => {
          const key = String(tabId || "").trim();
          if (!key) return;
          set((state) => {
            const prevById =
              state.inspector && typeof state.inspector === "object"
                ? state.inspector.attachmentsByTabId
                : {};
            return {
              inspector: {
                ...state.inspector,
                attachmentsByTabId: {
                  ...(prevById || {}),
                  [key]: [],
                },
              },
            };
          });
        },

        removeInspectorAutoCaptures: (tabId) => {
          const key = String(tabId || "").trim();
          if (!key) return;
          set((state) => {
            const prevById =
              state.inspector && typeof state.inspector === "object"
                ? state.inspector.attachmentsByTabId
                : {};
            const prev = Array.isArray(prevById?.[key]) ? prevById[key] : [];
            return {
              inspector: {
                ...state.inspector,
                attachmentsByTabId: {
                  ...(prevById || {}),
                  [key]: prev.filter(
                    (a) => String(a?.source) !== "auto-capture"
                  ),
                },
              },
            };
          });
        },

        clearInspector: () =>
          set((state) => ({
            inspector: {
              ...state.inspector,
              selected: null,
              hover: null,
            },
          })),
      }),
      {
        name: "browser-tabs-store",
        version: 1,
        partialize: (state) => ({
          tabs: state.tabs,
          activeTabId: state.activeTabId,
          tabStateById: state.tabStateById,
          devPanel: state.devPanel,
          bookmarks: state.bookmarks,
          history: state.history,
          dashboardState: state.dashboardState,
        }),
        onRehydrateStorage: () => (state, error) => {
          if (error || !state) return;

          const tabs = Array.isArray(state.tabs) ? state.tabs : [];
          const hasDashboard = tabs.some((t) => t?.id === DASHBOARD_TAB_ID);
          const activeExists = tabs.some((t) => t?.id === state.activeTabId);

          if (!hasDashboard) {
            set((current) => ({
              tabs: [
                initialTabs[0],
                ...(Array.isArray(current.tabs) ? current.tabs : []).filter(
                  (t) => t?.id !== DASHBOARD_TAB_ID
                ),
              ],
              activeTabId: DASHBOARD_TAB_ID,
            }));
            return;
          }

          if (!activeExists) set({ activeTabId: DASHBOARD_TAB_ID });
        },
      }
    ),
    { name: "browser-tabs" }
  )
);

export const DASHBOARD_TAB = {
  id: DASHBOARD_TAB_ID,
};
