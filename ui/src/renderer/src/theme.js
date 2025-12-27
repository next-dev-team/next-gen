// Ant Design v6 Theme Configuration
export const darkTheme = {
  token: {
    colorPrimary: "#6366f1", // Indigo
    colorSuccess: "#22c55e",
    colorWarning: "#f59e0b",
    colorError: "#ef4444",
    colorInfo: "#3b82f6",
    colorBgBase: "#0f172a", // Slate 900
    colorBgContainer: "#1e293b", // Slate 800
    colorBgElevated: "#334155", // Slate 700
    colorBgLayout: "#0f172a",
    colorBorder: "#475569", // Slate 600
    colorBorderSecondary: "#334155",
    colorText: "#f1f5f9", // Slate 100
    colorTextSecondary: "#94a3b8", // Slate 400
    colorTextTertiary: "#64748b", // Slate 500
    colorTextQuaternary: "#475569",
    borderRadius: 8,
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
    controlHeight: 40,
    boxShadow:
      "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)",
    boxShadowSecondary:
      "0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3)",
  },
  components: {
    Card: {
      colorBgContainer: "#1e293b",
      borderRadiusLG: 12,
      boxShadowTertiary: "0 4px 6px -1px rgba(0, 0, 0, 0.2)",
    },
    Button: {
      primaryShadow: "0 2px 0 rgba(99, 102, 241, 0.2)",
      borderRadius: 8,
    },
    Input: {
      colorBgContainer: "#1e293b",
      activeBorderColor: "#6366f1",
      hoverBorderColor: "#818cf8",
    },
    Select: {
      colorBgContainer: "#1e293b",
      colorBgElevated: "#334155",
      optionSelectedBg: "#4f46e5",
    },
    Steps: {
      colorPrimary: "#6366f1",
      colorTextDescription: "#94a3b8",
    },
    Message: {
      contentBg: "#334155",
    },
    Layout: {
      headerBg: "#1e293b",
      siderBg: "#1e293b",
      bodyBg: "#0f172a",
    },
    Menu: {
      darkItemBg: "#1e293b",
      darkItemSelectedBg: "#4f46e5",
    },
    Table: {
      colorBgContainer: "#1e293b",
      headerBg: "#334155",
      rowHoverBg: "#334155",
    },
    Modal: {
      contentBg: "#1e293b",
      headerBg: "#1e293b",
    },
    Segmented: {
      itemSelectedBg: "#6366f1", // Indigo 500
      itemSelectedColor: "#ffffff",
      trackBg: "#1e293b", // Slate 800
      itemColor: "#94a3b8", // Slate 400
      itemHoverColor: "#f1f5f9", // Slate 100
      itemHoverBg: "rgba(255, 255, 255, 0.05)",
    },
  },
};

export const lightTheme = {
  token: {
    colorPrimary: "#4f46e5", // Indigo 600
    colorSuccess: "#16a34a",
    colorWarning: "#d97706",
    colorError: "#dc2626",
    colorInfo: "#2563eb",
    colorBgBase: "#ffffff", // White
    colorBgContainer: "#ffffff",
    colorBgElevated: "#f8fafc", // Slate 50
    colorBgLayout: "#f1f5f9", // Slate 100
    colorBorder: "#e2e8f0", // Slate 200
    colorBorderSecondary: "#cbd5e1", // Slate 300
    colorText: "#0f172a", // Slate 900
    colorTextSecondary: "#475569", // Slate 600
    colorTextTertiary: "#64748b", // Slate 500
    colorTextQuaternary: "#94a3b8",
    borderRadius: 8,
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
    controlHeight: 40,
    boxShadow:
      "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
    boxShadowSecondary:
      "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
  },
  components: {
    Card: {
      colorBgContainer: "#ffffff",
      borderRadiusLG: 12,
      boxShadowTertiary: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
    },
    Button: {
      primaryShadow: "0 2px 0 rgba(79, 70, 229, 0.1)",
      borderRadius: 8,
    },
    Input: {
      colorBgContainer: "#ffffff",
      activeBorderColor: "#4f46e5",
      hoverBorderColor: "#6366f1",
    },
    Select: {
      colorBgContainer: "#ffffff",
      colorBgElevated: "#ffffff",
      optionSelectedBg: "#e0e7ff", // Indigo 100
    },
    Steps: {
      colorPrimary: "#4f46e5",
      colorTextDescription: "#64748b",
    },
    Message: {
      contentBg: "#ffffff",
    },
    Layout: {
      headerBg: "#ffffff",
      siderBg: "#ffffff",
      bodyBg: "#f1f5f9",
    },
    Menu: {
      itemBg: "#ffffff",
      itemSelectedBg: "#e0e7ff",
    },
    Table: {
      colorBgContainer: "#ffffff",
      headerBg: "#f8fafc",
      rowHoverBg: "#f1f5f9",
    },
    Modal: {
      contentBg: "#ffffff",
      headerBg: "#ffffff",
    },
  },
};

// Template preview images configuration
export const templatePreviews = {
  "nextjs-15": {
    name: "Next.js 15",
    description:
      "React framework with App Router, Server Components, and optimized performance",
    features: ["App Router", "Server Components", "Streaming", "Turbopack"],
    image: "/previews/nextjs-15.png",
    category: "React",
  },
  "nextjs-16": {
    name: "Next.js 16",
    description:
      "Latest Next.js with advanced features and improved developer experience",
    features: ["React 19", "Enhanced Caching", "Improved DX", "Edge Runtime"],
    image: "/previews/nextjs-16.png",
    category: "React",
  },
  "vite-react-9": {
    name: "Vite + React 19",
    description: "Lightning fast build tool with React 19 and modern tooling",
    features: ["Hot Module Replacement", "React 19", "ESBuild", "Fast Refresh"],
    image: "/previews/vite-react.png",
    category: "React",
  },
  "tanstack-start": {
    name: "TanStack Start",
    description:
      "Full-stack React framework with powerful routing and data fetching",
    features: [
      "Type-Safe Router",
      "Server Functions",
      "SSR/SSG",
      "File-based Routing",
    ],
    image: "/previews/tanstack.png",
    category: "React",
  },
  vue3: {
    name: "Vue 3",
    description: "Progressive JavaScript framework with Composition API",
    features: ["Composition API", "Vite", "TypeScript", "Script Setup"],
    image: "/previews/vue3.png",
    category: "Vue",
  },
  nuxt4: {
    name: "Nuxt 4",
    description: "The intuitive Vue framework with hybrid rendering",
    features: [
      "Hybrid Rendering",
      "Auto Imports",
      "File-based Routing",
      "Nitro Server",
    ],
    image: "/previews/nuxt4.png",
    category: "Vue",
  },
  "rnr-expo": {
    name: "RN Reusables (Expo)",
    description: "React Native starter with reusable components and NativeWind",
    features: [
      "Expo SDK",
      "NativeWind",
      "Reusable Components",
      "Cross-platform",
    ],
    image: "/previews/expo.png",
    category: "Mobile",
  },
  "rnr-expo-uniwind": {
    name: "RN Reusables (Uniwind)",
    description: "React Native with Uniwind styling system",
    features: ["Expo SDK", "Uniwind", "Universal Styling", "Type-safe"],
    image: "/previews/expo-uniwind.png",
    category: "Mobile",
  },
  "turbo-uniwind": {
    name: "Turbo Uniwind",
    description: "Monorepo setup with Turborepo and Uniwind styling",
    features: ["Turborepo", "Uniwind", "Shared Packages", "Optimized Builds"],
    image: "/previews/turbo.png",
    category: "Monorepo",
  },
};

export const uiStackInfo = {
  shadcn: {
    name: "Shadcn UI",
    description:
      "Beautiful, accessible components built with Radix UI and Tailwind CSS",
    icon: "🎨",
  },
  tailwind: {
    name: "Tailwind CSS",
    description: "Utility-first CSS framework for rapid UI development",
    icon: "💨",
  },
  antd: {
    name: "Ant Design v6",
    description: "Enterprise-class UI design language and React components",
    icon: "🐜",
  },
  heroui: {
    name: "Hero UI",
    description: "Beautiful, fast and modern React UI library",
    icon: "🦸",
  },
};
