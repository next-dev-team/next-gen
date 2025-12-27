import React, { lazy, Suspense, useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider, Spin, theme } from "antd";
import { darkTheme, lightTheme } from "./theme";
import MainLayout from "./layouts/MainLayout";
import { usePuckStore, shadcnTokenKeys } from "./stores/puckStore";

const GeneratorView = lazy(() => import("./views/GeneratorView"));
const ProjectsView = lazy(() => import("./views/ProjectsView"));
const UIView = lazy(() => import("./views/UIView"));
const ScrumBoardView = lazy(() => import("./views/ScrumBoardView"));

function App() {
  const designMode = usePuckStore((s) => s.designSystem.mode);
  const tokens = usePuckStore((s) => s.designSystem.tokens);
  const fontFamily = usePuckStore((s) => s.designSystem.fontFamily);
  const baseFontSize = usePuckStore((s) => s.designSystem.baseFontSize);
  const setDesignMode = usePuckStore((s) => s.setDesignMode);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const desired = designMode === "dark";
    if (desired !== isDarkMode) setIsDarkMode(desired);
  }, [designMode, isDarkMode]);

  useEffect(() => {
    const desired = isDarkMode ? "dark" : "light";
    if (designMode !== desired) setDesignMode(desired);
  }, [designMode, isDarkMode, setDesignMode]);

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
      root.style.setProperty(`--${key}`, String(value));
    });

    root.style.fontFamily = fontFamily || "Inter, sans-serif";
    root.style.fontSize = baseFontSize || "16px";
  }, [baseFontSize, fontFamily, isDarkMode, tokens]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  return (
    <ConfigProvider
      theme={{
        ...(isDarkMode ? darkTheme : lightTheme),
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      <HashRouter>
        <Suspense
          fallback={
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
                background: "var(--color-bg-base)",
              }}
            >
              <Spin size="large" />
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
                />
              }
            >
              <Route index element={<Navigate to="/generator" replace />} />
              <Route path="generator" element={<GeneratorView />} />
              <Route path="projects" element={<ProjectsView />} />
              <Route path="ui" element={<UIView />} />
              <Route path="scrum-board" element={<ScrumBoardView />} />
            </Route>
          </Routes>
        </Suspense>
      </HashRouter>

      {/* Global Styles */}
      <style>{`
        /* Custom scrollbar */
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

        /* Card hover effects */
        .template-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
        }

        .template-card.selected {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3);
        }

        /* Cursor blink animation */
        .cursor-blink {
          animation: blink 1s step-end infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        /* Smooth transitions */
        .ant-steps-item-icon {
          transition: all 0.3s ease;
        }

        .ant-btn {
          transition: all 0.2s ease;
        }

        .ant-btn:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        /* Steps custom styling */
        .ant-steps-item-finish .ant-steps-item-icon {
          background: #22c55e !important;
          border-color: #22c55e !important;
        }

        .ant-steps-item-process .ant-steps-item-icon {
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%) !important;
          border-color: #6366f1 !important;
        }

        .ant-steps-item-wait .ant-steps-item-icon {
          background: var(--color-bg-elevated) !important;
          border-color: var(--color-border) !important;
        }

        /* Input focus states */
        input:focus, select:focus {
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
        }

        /* Message customization */
        .ant-message-notice-content {
          background: var(--color-bg-elevated) !important;
          color: var(--color-text-primary) !important;
        }
      `}</style>
    </ConfigProvider>
  );
}

export default App;
