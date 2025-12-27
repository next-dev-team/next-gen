/** biome-ignore-all lint/a11y/noLabelWithoutControl: <explanation> */

import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  EyeOutlined,
  GithubOutlined,
  HomeOutlined,
  LayoutOutlined,
  MoonOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  RocketOutlined,
  SettingOutlined,
  SunOutlined,
  TableOutlined,
} from "@ant-design/icons";
import {
  Button,
  ConfigProvider,
  Layout,
  message,
  Segmented,
  Space,
  Steps,
  Switch,
  Tooltip,
  Typography,
} from "antd";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ProjectLauncher } from "./components/ProjectLauncher";
import {
  ConfigureOptions,
  GenerateStep,
  PreviewStep,
  TemplateSelector,
} from "./components/WizardSteps";
import { generators } from "./generators-config";
import { darkTheme, lightTheme, templatePreviews, uiStackInfo } from "./theme";

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

const steps = [
  {
    title: "Template",
    icon: <RocketOutlined />,
    description: "Choose template",
  },
  {
    title: "Configure",
    icon: <SettingOutlined />,
    description: "Set options",
  },
  {
    title: "Preview",
    icon: <EyeOutlined />,
    description: "Review settings",
  },
  {
    title: "Generate",
    icon: <PlayCircleOutlined />,
    description: "Create project",
  },
];

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

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

  const [activeTab, setActiveTab] = useState("generator"); // "generator" or "projects"
  const [currentStep, setCurrentStep] = useState(0);
  const [startOnBoot, setStartOnBoot] = useState(false);
  const [selectedGenerator, setSelectedGenerator] = useState(null);
  const [answers, setAnswers] = useState({});
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState(null);
  const [outputPath, setOutputPath] = useState(null);
  const logsEndRef = useRef(null);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getStartOnBoot().then(setStartOnBoot);
    }
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logs.length === 0) return;
    if (logsEndRef.current)
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Listen for streaming logs
  useEffect(() => {
    if (window.electronAPI?.onGeneratorLog) {
      const removeListener = window.electronAPI.onGeneratorLog((log) => {
        setLogs((prev) => [...prev, log]);
      });
      return () => removeListener?.();
    }
  }, []);

  const handleStartOnBootChange = (checked) => {
    setStartOnBoot(checked);
    if (window.electronAPI) {
      window.electronAPI.setStartOnBoot(checked);
    }
  };

  const handleGeneratorSelect = useCallback((gen) => {
    setSelectedGenerator(gen);
    setAnswers({});
    setLogs([]);
    setIsComplete(false);
    setError(null);
    setOutputPath(null);

    // Initialize default values
    const initialAnswers = {};
    gen.prompts.forEach((p) => {
      if (p.default !== undefined && typeof p.default !== "function")
        initialAnswers[p.name] = p.default;
      if (p.type === "checkbox") initialAnswers[p.name] = [];
      if (p.type === "list" && p.choices && p.choices.length > 0)
        initialAnswers[p.name] = p.choices[0].value;
    });
    setAnswers(initialAnswers);
  }, []);

  const handleInputChange = useCallback((name, value) => {
    setAnswers((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleCheckboxChange = useCallback((name, value, checked) => {
    setAnswers((prev) => {
      const current = prev[name] || [];
      if (checked) {
        return { ...prev, [name]: [...current, value] };
      } else {
        return { ...prev, [name]: current.filter((v) => v !== value) };
      }
    });
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setLogs([{ type: "info", message: "Starting generator..." }]);
    setIsComplete(false);
    setError(null);
    setOutputPath(null);

    // Compute output path from answers
    const computeOutputPath = () => {
      // Check common path field names
      const destField =
        answers.dest ||
        answers.destination ||
        answers.destBase ||
        answers.directory ||
        answers.path;
      const nameField = answers.name || answers.pluginSlug || answers.appName;

      if (destField && nameField) {
        // If it's already an absolute path, use it directly
        if (destField.includes(":") || destField.startsWith("/")) {
          return `${destField}/${nameField}`;
        }
        return `${destField}/${nameField}`;
      }
      return destField || null;
    };

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.runGenerator(
          selectedGenerator.name,
          answers
        );
        setLogs((prev) => [
          ...prev,
          { type: "success", message: "─".repeat(50) },
          {
            type: "success",
            message: result.output || "Generator finished successfully!",
          },
        ]);
        setIsComplete(true);

        const generatedPath = computeOutputPath();
        setOutputPath(generatedPath);

        // Save project to launcher
        if (generatedPath && window.electronAPI?.saveProject) {
          const projectName =
            answers.name ||
            answers.pluginSlug ||
            answers.appName ||
            selectedGenerator.name;
          await window.electronAPI.saveProject({
            name: projectName,
            path: generatedPath,
            generator: selectedGenerator.name,
            framework: answers.frontend || selectedGenerator.name,
            packageManager: answers.packageManager,
            uiStack: answers.ui,
          });
        }

        message.success("Project generated successfully!");
      } else {
        throw new Error("Electron API not available");
      }
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        { type: "error", message: `Error: ${err.message}` },
      ]);
      setError(err.message);
      message.error("Generation failed. Check the logs for details.");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 0 && !selectedGenerator) {
      message.warning("Please select a template first");
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const resetWizard = () => {
    setCurrentStep(0);
    setSelectedGenerator(null);
    setAnswers({});
    setLogs([]);
    setIsComplete(false);
    setError(null);
    setOutputPath(null);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <TemplateSelector
            generators={generators}
            selectedGenerator={selectedGenerator}
            onSelect={handleGeneratorSelect}
          />
        );
      case 1:
        return (
          <ConfigureOptions
            selectedGenerator={selectedGenerator}
            answers={answers}
            onInputChange={handleInputChange}
            onCheckboxChange={handleCheckboxChange}
          />
        );
      case 2:
        return (
          <PreviewStep
            selectedGenerator={selectedGenerator}
            answers={answers}
            templatePreviews={templatePreviews}
            uiStackInfo={uiStackInfo}
          />
        );
      case 3:
        return (
          <GenerateStep
            loading={loading}
            logs={logs}
            onGenerate={handleGenerate}
            isComplete={isComplete}
            error={error}
            outputPath={outputPath}
          />
        );
      default:
        return null;
    }
  };

  return (
    <ConfigProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <Layout
        style={{
          height: "100vh",
          background: "var(--color-bg-base)",
          transition: "background 0.3s ease",
        }}
      >
        {/* Header */}
        <Header
          style={{
            background: "var(--color-bg-container)",
            borderBottom: "1px solid var(--color-border)",
            padding: "0 24px",
            paddingRight: 150, // Space for window control buttons
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 64,
            WebkitAppRegion: "drag", // Make header draggable
            transition: "background 0.3s ease, border-color 0.3s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              WebkitAppRegion: "no-drag",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <RocketOutlined style={{ color: "#fff", fontSize: 18 }} />
            </div>
            <Title
              level={4}
              style={{ color: "var(--color-text-primary)", margin: 0 }}
            >
              Next Gen
            </Title>
            <Text
              style={{
                color: "var(--color-text-secondary)",
                fontSize: 12,
                padding: "2px 8px",
                background: "var(--color-bg-elevated)",
                borderRadius: 4,
              }}
            >
              v1.0
            </Text>

            {/* Divider */}
            <div
              style={{
                width: 1,
                height: 24,
                background: "var(--color-border)",
                margin: "0 8px",
              }}
            />

            {/* Start on boot - moved to left side for visibility */}
            <Tooltip title="Launch app when system starts">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 12px",
                  background: startOnBoot
                    ? "rgba(99, 102, 241, 0.2)"
                    : "var(--color-bg-elevated)",
                  borderRadius: 8,
                  border: startOnBoot
                    ? "1px solid #6366f1"
                    : "1px solid var(--color-border)",
                  transition: "all 0.2s",
                }}
              >
                <button
                  type="button"
                  onClick={() => handleStartOnBootChange(!startOnBoot)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    font: "inherit",
                  }}
                >
                  <SettingOutlined
                    style={{
                      color: startOnBoot
                        ? "#6366f1"
                        : "var(--color-text-secondary)",
                      fontSize: 14,
                    }}
                  />
                  <Text
                    style={{
                      color: startOnBoot
                        ? "var(--color-text-primary)"
                        : "var(--color-text-secondary)",
                      fontSize: 13,
                    }}
                  >
                    Auto-start
                  </Text>
                </button>
                <Switch
                  size="small"
                  checked={startOnBoot}
                  onChange={handleStartOnBootChange}
                />
              </div>
            </Tooltip>

            {/* Divider */}
            <div
              style={{
                width: 1,
                height: 24,
                background: "var(--color-border)",
                margin: "0 8px",
              }}
            />

            {/* Theme Toggle */}
            <Tooltip
              title={
                isDarkMode ? "Switch to light mode" : "Switch to dark mode"
              }
            >
              <Button
                type="text"
                icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
                onClick={() => setIsDarkMode(!isDarkMode)}
                style={{ color: "var(--color-text-secondary)", fontSize: 18 }}
              />
            </Tooltip>

            {/* GitHub button - also on left */}
            <Tooltip title="View on GitHub">
              <Button
                type="text"
                icon={<GithubOutlined />}
                style={{ color: "var(--color-text-secondary)" }}
                onClick={() => {
                  if (window.electronAPI?.openExternal) {
                    window.electronAPI.openExternal(
                      "https://github.com/next-dev-team/next-gen"
                    );
                  }
                }}
              />
            </Tooltip>
          </div>
        </Header>

        {/* Main Content */}
        <Content style={{ padding: "24px 48px", overflowY: "auto" }}>
          {/* Tab Navigation */}
          <div
            style={{
              marginBottom: 24,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Segmented
              value={activeTab}
              onChange={setActiveTab}
              size="large"
              options={[
                {
                  label: (
                    <div
                      style={{
                        padding: "4px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <RocketOutlined />
                      <span>Generator</span>
                    </div>
                  ),
                  value: "generator",
                },
                {
                  label: (
                    <div
                      style={{
                        padding: "4px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <AppstoreOutlined />
                      <span>Projects</span>
                    </div>
                  ),
                  value: "projects",
                },
                {
                  label: (
                    <div
                      style={{
                        padding: "4px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <LayoutOutlined />
                      <span>UI</span>
                    </div>
                  ),
                  value: "ui",
                },
                {
                  label: (
                    <div
                      style={{
                        padding: "4px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <TableOutlined />
                      <span>Scrum Board</span>
                    </div>
                  ),
                  value: "scrum-board",
                },
              ]}
              style={{
                background: "var(--color-bg-elevated)",
                padding: 4,
                borderRadius: 12,
              }}
            />
          </div>

          {/* Generator View */}
          {activeTab === "generator" && (
            <>
              {/* Steps Progress */}
              <div
                style={{
                  background: "var(--color-bg-container)",
                  borderRadius: 16,
                  padding: "24px 32px",
                  marginBottom: 24,
                  border: "1px solid var(--color-border)",
                }}
              >
                <Steps
                  current={currentStep}
                  items={steps.map((step, index) => ({
                    title: (
                      <span
                        style={{
                          color:
                            index <= currentStep
                              ? "var(--color-text-primary)"
                              : "var(--color-text-disabled)",
                        }}
                      >
                        {step.title}
                      </span>
                    ),
                    description: (
                      <span
                        style={{
                          color:
                            index <= currentStep
                              ? "var(--color-text-secondary)"
                              : "var(--color-text-disabled)",
                        }}
                      >
                        {step.description}
                      </span>
                    ),
                    icon: (
                      <span
                        style={{
                          color:
                            index < currentStep
                              ? "#22c55e"
                              : index === currentStep
                              ? "#6366f1"
                              : "var(--color-text-disabled)",
                        }}
                      >
                        {step.icon}
                      </span>
                    ),
                  }))}
                  style={{ maxWidth: 800, margin: "0 auto" }}
                />
              </div>

              {/* Step Content */}
              <div
                style={{
                  background: "var(--color-bg-container)",
                  borderRadius: 16,
                  padding: 32,
                  minHeight: 400,
                  border: "1px solid var(--color-border)",
                  marginBottom: 24,
                }}
              >
                {renderStepContent()}
              </div>

              {/* Navigation Buttons */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Button
                  icon={<HomeOutlined />}
                  onClick={resetWizard}
                  style={{
                    background: "var(--color-bg-elevated)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  Start Over
                </Button>

                <Space size={12}>
                  <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    style={{
                      background:
                        currentStep === 0
                          ? "var(--color-bg-container)"
                          : "var(--color-bg-elevated)",
                      borderColor: "var(--color-border)",
                      color:
                        currentStep === 0
                          ? "var(--color-text-disabled)"
                          : "var(--color-text-primary)",
                    }}
                  >
                    Previous
                  </Button>

                  {currentStep < steps.length - 1 ? (
                    <Button
                      type="primary"
                      onClick={nextStep}
                      disabled={currentStep === 0 && !selectedGenerator}
                      style={{
                        background:
                          "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
                        border: "none",
                        boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)",
                      }}
                    >
                      Next
                      <ArrowRightOutlined />
                    </Button>
                  ) : (
                    isComplete && (
                      <Button
                        type="primary"
                        icon={<ReloadOutlined />}
                        onClick={resetWizard}
                        style={{
                          background:
                            "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                          border: "none",
                        }}
                      >
                        Create Another
                      </Button>
                    )
                  )}
                </Space>
              </div>
            </>
          )}

          {/* Projects View */}
          {activeTab === "projects" && (
            <ProjectLauncher
              onNavigateToGenerator={() => setActiveTab("generator")}
            />
          )}

          {activeTab === "ui" && (
            <div
              style={{
                background: "var(--color-bg-container)",
                borderRadius: 16,
                padding: 32,
                minHeight: 400,
                border: "1px solid var(--color-border)",
              }}
            >
              <Title
                level={3}
                style={{
                  color: "var(--color-text-primary)",
                  marginTop: 0,
                  marginBottom: 8,
                }}
              >
                UI Library
              </Title>
              <Text style={{ color: "var(--color-text-secondary)" }}>
                Browse and preview UI components. Coming soon.
              </Text>
            </div>
          )}

          {activeTab === "scrum-board" && (
            <div
              style={{
                background: "var(--color-bg-container)",
                borderRadius: 16,
                padding: 32,
                minHeight: 400,
                border: "1px solid var(--color-border)",
              }}
            >
              <Title
                level={3}
                style={{
                  color: "var(--color-text-primary)",
                  marginTop: 0,
                  marginBottom: 8,
                }}
              >
                Scrum Board
              </Title>
              <Text style={{ color: "var(--color-text-secondary)" }}>
                Coming soon.
              </Text>
            </div>
          )}
        </Content>

        {/* Footer */}
        <Footer
          style={{
            background: "transparent",
            borderTop: "1px solid var(--color-border)",
            textAlign: "center",
            padding: "16px 24px",
          }}
        >
          <Text style={{ color: "var(--color-text-secondary)" }}>
            Next Gen Generator © {new Date().getFullYear()}
          </Text>
        </Footer>
      </Layout>

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
