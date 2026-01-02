import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const DASHBOARD_TAB_ID = "dashboard";

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
        },

        networkLogs: [],

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
              },
            },
          }));

          return id;
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

        addNetworkLog: (entry) => {
          set((state) => {
            const next = [entry, ...state.networkLogs].slice(0, 200);
            return { networkLogs: next };
          });
        },

        clearNetworkLogs: () => set({ networkLogs: [] }),
      }),
      {
        name: "browser-tabs-store",
        version: 1,
        partialize: (state) => ({
          tabs: state.tabs,
          activeTabId: state.activeTabId,
          tabStateById: state.tabStateById,
          devPanel: state.devPanel,
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
