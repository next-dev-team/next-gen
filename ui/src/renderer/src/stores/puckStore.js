import { create } from "zustand";
import { persist } from "zustand/middleware";

const defaultShadcnTokens = {
  light: {
    background: "0 0% 100%",
    foreground: "222.2 84% 4.9%",
    card: "0 0% 100%",
    "card-foreground": "222.2 84% 4.9%",
    popover: "0 0% 100%",
    "popover-foreground": "222.2 84% 4.9%",
    primary: "221.2 83.2% 53.3%",
    "primary-foreground": "210 40% 98%",
    secondary: "210 40% 96.1%",
    "secondary-foreground": "222.2 47.4% 11.2%",
    muted: "210 40% 96.1%",
    "muted-foreground": "215.4 16.3% 46.9%",
    accent: "210 40% 96.1%",
    "accent-foreground": "222.2 47.4% 11.2%",
    destructive: "0 84.2% 60.2%",
    "destructive-foreground": "210 40% 98%",
    border: "214.3 31.8% 91.4%",
    input: "214.3 31.8% 91.4%",
    ring: "221.2 83.2% 53.3%",
    radius: "0.5rem",
  },
  dark: {
    background: "222.2 84% 4.9%",
    foreground: "210 40% 98%",
    card: "222.2 84% 4.9%",
    "card-foreground": "210 40% 98%",
    popover: "222.2 84% 4.9%",
    "popover-foreground": "210 40% 98%",
    primary: "217.2 91.2% 59.8%",
    "primary-foreground": "222.2 47.4% 11.2%",
    secondary: "217.2 32.6% 17.5%",
    "secondary-foreground": "210 40% 98%",
    muted: "217.2 32.6% 17.5%",
    "muted-foreground": "215 20.2% 65.1%",
    accent: "217.2 32.6% 17.5%",
    "accent-foreground": "210 40% 98%",
    destructive: "0 62.8% 30.6%",
    "destructive-foreground": "210 40% 98%",
    border: "217.2 32.6% 17.5%",
    input: "217.2 32.6% 17.5%",
    ring: "212.7 26.8% 83.9%",
    radius: "0.5rem",
  },
};

const normalizeKey = (key) =>
  key
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "");

export const usePuckStore = create(
  persist(
    (set, get) => ({
      puckData: {
        content: [],
        root: { props: { title: "My Page" } },
      },
      designSystem: {
        mode: "light",
        fontFamily: "Inter, sans-serif",
        baseFontSize: "16px",
        tokens: defaultShadcnTokens,
      },
      blockRegistry: {},

      setPuckData: (data) => set({ puckData: data }),

      addContentBlock: (type, props = {}) =>
        set((state) => {
          const idBase = `${type}-${Date.now()}`;
          const id =
            typeof crypto !== "undefined" && crypto.randomUUID
              ? `${type}-${crypto.randomUUID()}`
              : idBase;

          const nextItem = {
            type,
            props: {
              id,
              ...(props || {}),
            },
          };

          return {
            puckData: {
              ...(state.puckData || { root: { props: {} }, content: [] }),
              content: [...((state.puckData?.content || []) ?? []), nextItem],
            },
          };
        }),

      setDesignMode: (mode) =>
        set((state) => ({
          designSystem: { ...state.designSystem, mode },
        })),

      updateDesignTokens: (mode, patch) =>
        set((state) => ({
          designSystem: {
            ...state.designSystem,
            tokens: {
              ...state.designSystem.tokens,
              [mode]: {
                ...state.designSystem.tokens[mode],
                ...patch,
              },
            },
          },
        })),

      updateTypography: (patch) =>
        set((state) => ({
          designSystem: {
            ...state.designSystem,
            ...patch,
          },
        })),

      resetDesignSystem: () =>
        set((state) => ({
          designSystem: {
            ...state.designSystem,
            tokens: defaultShadcnTokens,
            mode: "light",
            fontFamily: "Inter, sans-serif",
            baseFontSize: "16px",
          },
        })),

      registerBlock: (name, preset) =>
        set((state) => ({
          blockRegistry: {
            ...state.blockRegistry,
            [normalizeKey(name)]: { name, preset },
          },
        })),

      unregisterBlock: (key) =>
        set((state) => {
          const next = { ...state.blockRegistry };
          delete next[key];
          return { blockRegistry: next };
        }),

      getActiveTokens: () => {
        const { mode, tokens } = get().designSystem;
        return tokens[mode] || tokens.light;
      },
    }),
    {
      name: "puck-store",
      version: 2,
      partialize: (state) => ({
        puckData: state.puckData,
        designSystem: state.designSystem,
        blockRegistry: state.blockRegistry,
      }),
      migrate: (persisted, version) => {
        if (!persisted) return persisted;
        if (version >= 2) return persisted;

        const legacy = persisted;
        const legacyDesign = legacy.designSystem || {};

        return {
          ...legacy,
          designSystem: {
            mode: "light",
            fontFamily:
              legacyDesign.typography?.fontFamily || "Inter, sans-serif",
            baseFontSize: legacyDesign.typography?.baseSize || "16px",
            tokens: defaultShadcnTokens,
          },
          blockRegistry: {},
        };
      },
    }
  )
);

export const shadcnTokenKeys = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "radius",
];
