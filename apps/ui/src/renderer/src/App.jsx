import { ConfigProvider, theme } from "antd";
import { Loader2 } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import MainLayout from "./layouts/MainLayout";
import { shadcnTokenKeys, usePuckStore } from "./stores/puckStore";

const GeneratorView = lazy(() => import("./views/GeneratorView"));
const ProjectsView = lazy(() => import("./views/ProjectsView"));
const LaunchpadView = lazy(() => import("./views/LaunchpadView"));
const UIView = lazy(() => import("./views/UIView"));
const BrowserToolView = lazy(() => import("./views/BrowserToolView"));
const ScrumBoardView = lazy(() => import("./views/ScrumBoardView"));
const ResourcesView = lazy(() => import("./views/ResourcesView"));
// const DevToolView = lazy(() => import("./views/DevToolView"));
const SettingsView = lazy(() => import("./views/SettingsView"));
const TestManagementView = lazy(() => import("./views/TestManagementView"));

const normalizeCssTokenValue = (key, value) => {
  if (key === "radius") return String(value);

  const raw = String(value ?? "").trim();
  if (!raw) return raw;

  if (raw.startsWith("hsl(") && raw.endsWith(")"))
    return raw.slice(4, -1).trim();
  if (raw.startsWith("var(")) return raw;

  return raw;
};

function App() {
  const designMode = usePuckStore((s) => s.designSystem.mode);
  const tokens = usePuckStore((s) => s.designSystem.tokens);
  const fontFamily = usePuckStore((s) => s.designSystem.fontFamily);
  const baseFontSize = usePuckStore((s) => s.designSystem.baseFontSize);
  const setDesignMode = usePuckStore((s) => s.setDesignMode);

  const [dockSettings, setDockSettings] = useState(() => {
    try {
      const raw = localStorage.getItem("dockSettings");
      const parsed = JSON.parse(raw || "{}");
      return {
        position: parsed.position || "left",
        autoHide: parsed.autoHide ?? false,
      };
    } catch {
      return { position: "left", autoHide: false };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("dockSettings", JSON.stringify(dockSettings));
    } catch {}
  }, [dockSettings]);

  const [systemDarkMode, setSystemDarkMode] = useState(
    window.matchMedia?.("(prefers-color-scheme: dark)")?.matches || false,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setSystemDarkMode(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const isDarkMode =
    designMode === "system" ? systemDarkMode : designMode === "dark";

  const setIsDarkMode = (next) => {
    setDesignMode(next ? "dark" : "light");
  };

  useEffect(() => {
    const hasPersistedStore = Boolean(localStorage.getItem("puck-store"));
    if (hasPersistedStore) return;

    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light" || saved === "system") {
      setDesignMode(saved);
      return;
    }

    setDesignMode("system");
  }, [setDesignMode]);

  useEffect(() => {
    const mode = isDarkMode ? "dark" : "light";
    const root = window.document.documentElement;
    const active = tokens?.[mode] || tokens?.light;
    if (!active) return;

    Object.entries(active).forEach(([key, value]) => {
      if (key === "radius") {
        root.style.setProperty("--radius", String(value));
        return;
      }
      if (!shadcnTokenKeys.includes(key)) return;
      root.style.setProperty(`--${key}`, normalizeCssTokenValue(key, value));
    });

    root.style.fontFamily = fontFamily || "Inter, sans-serif";
    root.style.fontSize = baseFontSize || "16px";
  }, [baseFontSize, isDarkMode, fontFamily, tokens]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", designMode);
  }, [designMode, isDarkMode]);

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: "#4f46e5", // Indigo 600
          borderRadius: 8,
        },
      }}
    >
      <Toaster position="bottom-right" richColors />
      <HashRouter>
        <Suspense
          fallback={
            <div className="flex h-screen items-center justify-center bg-[var(--color-bg-base)]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <Routes>
            <Route
              path="/"
              element={
                <MainLayout
                  isDarkMode={isDarkMode}
                  setIsDarkMode={setIsDarkMode}
                  designMode={designMode}
                  setDesignMode={setDesignMode}
                  dockSettings={dockSettings}
                  setDockSettings={setDockSettings}
                />
              }
            >
              <Route index element={<Navigate to="/launchpad" replace />} />
              <Route path="generator" element={<GeneratorView />} />
              <Route path="projects" element={<ProjectsView />} />
              <Route path="launchpad" element={<LaunchpadView />} />
              <Route path="ui" element={<UIView />} />
              <Route path="browser" element={<BrowserToolView />} />
              <Route path="scrum-board" element={<ScrumBoardView />} />
              <Route path="resources" element={<ResourcesView />} />
              <Route path="settings" element={<SettingsView />} />
              <Route path="tests" element={<TestManagementView />} />
            </Route>
          </Routes>
        </Suspense>
      </HashRouter>

      <style>{`
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: var(--color-bg-base);
        }
        ::-webkit-scrollbar-thumb {
          background: var(--color-border);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: var(--color-text-secondary);
        }

        .template-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
        }

        .template-card.selected {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3);
        }

        .cursor-blink {
          animation: blink 1s step-end infinite;
        }

        @keyframes blink {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }

        input:focus,
        select:focus {
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
        }
      `}</style>
    </ConfigProvider>
  );
}

export default App;
