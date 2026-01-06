import React from "react";
import {
  AppWindow,
  CheckCircle2,
  Code,
  Eye,
  Folder,
  FolderOpen,
  LayoutGrid,
  PencilLine,
  PlayCircle,
  Rocket,
  Settings as SettingsIcon,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";

const Title = ({ level = 3, style, children }) => {
  const Tag = `h${level}`;
  return (
    <Tag
      style={{
        margin: 0,
        fontWeight: 600,
        ...(style || {}),
      }}
    >
      {children}
    </Tag>
  );
};

const Text = ({ type, style, children }) => {
  const color =
    type === "secondary"
      ? "var(--color-text-secondary)"
      : "var(--color-text-primary)";
  return (
    <span
      style={{
        color,
        fontSize: 13,
        ...(style || {}),
      }}
    >
      {children}
    </span>
  );
};

const Paragraph = ({ style, children }) => {
  return (
    <p
      style={{
        margin: 0,
        color: "var(--color-text-secondary)",
        fontSize: 13,
        lineHeight: 1.6,
        ...(style || {}),
      }}
    >
      {children}
    </p>
  );
};

const Tag = ({ color, style, children, ...props }) => {
  let background = "var(--color-bg-elevated)";
  let border = "1px solid var(--color-border)";
  let text = "var(--color-text-secondary)";

  if (color === "white") {
    background = "#ffffff";
    border = "1px solid rgba(148,163,184,0.4)";
    text = "#4f46e5";
  } else if (color === "blue") {
    background = "rgba(59,130,246,0.12)";
    border = "1px solid rgba(59,130,246,0.4)";
    text = "#3b82f6";
  } else if (color === "orange") {
    background = "rgba(249,115,22,0.12)";
    border = "1px solid rgba(249,115,22,0.4)";
    text = "#f97316";
  } else if (color === "purple") {
    background = "rgba(168,85,247,0.12)";
    border = "1px solid rgba(168,85,247,0.4)";
    text = "#a855f7";
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 8px",
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 500,
        background,
        border,
        color: text,
        ...(style || {}),
      }}
      {...props}
    >
      {children}
    </span>
  );
};

// Helper function to check if a field is a path field
const isPathField = (name) => {
  const pathFieldNames = [
    "destination",
    "dest",
    "destBase",
    "path",
    "dir",
    "directory",
    "output",
    "target",
  ];
  return pathFieldNames.some((p) => name.toLowerCase().includes(p));
};

// Step 1: Select Template
export const TemplateSelector = ({
  generators,
  selectedGenerator,
  onSelect,
}) => {
  const getCategoryIcon = (name) => {
    if (name.includes("electron")) return "⚡";
    if (name.includes("tron")) return "🔌";
    if (name.includes("agent")) return "🤖";
    if (name.includes("scaffold") || name.includes("app")) return "📦";
    return "🚀";
  };

  const getCategoryColor = (name) => {
    if (name.includes("electron")) return "#f59e0b";
    if (name.includes("tron")) return "#10b981";
    if (name.includes("agent")) return "#8b5cf6";
    if (name.includes("scaffold") || name.includes("app")) return "#3b82f6";
    return "#6366f1";
  };

  return (
    <div className="template-selector">
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <Title
          level={3}
          style={{ color: "var(--color-text-primary)", marginBottom: 8 }}
        >
          <Rocket style={{ marginRight: 12, color: "#6366f1" }} />
          Choose Your Template
        </Title>
        <Text type="secondary">
          Select a generator template to scaffold your project
        </Text>
      </div>

      <div className="grid gap-4 md:grid-cols-2" style={{ WebkitAppRegion: "no-drag" }}>
        {generators.map((gen) => {
          const selected = selectedGenerator?.name === gen.name;
          return (
            <button
              key={gen.name}
              type="button"
              aria-pressed={selected}
              className={`template-card w-full text-left rounded-lg border transition-all ${
                selected
                  ? "border-indigo-400 bg-gradient-to-br from-indigo-600 to-indigo-500 shadow-lg"
                  : "border-[var(--color-border)] bg-[var(--color-bg-container)] hover:border-indigo-400"
              }`}
              onClick={() => onSelect(gen)}
              style={{ padding: 20 }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: selected
                      ? "rgba(255,255,255,0.2)"
                      : getCategoryColor(gen.name),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    flexShrink: 0,
                  }}
                >
                  {getCategoryIcon(gen.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      color: selected ? "#fff" : "var(--color-text-primary)",
                      display: "block",
                      marginBottom: 4,
                      fontWeight: 600,
                    }}
                  >
                    {gen.name}
                  </Text>
                  <Text
                    style={{
                      color: selected
                        ? "rgba(255,255,255,0.8)"
                        : "var(--color-text-secondary)",
                      fontSize: 13,
                    }}
                  >
                    {gen.description}
                  </Text>
                  <div style={{ marginTop: 8 }}>
                    <Tag
                      color={selected ? "white" : "blue"}
                      style={{
                        borderRadius: 4,
                        color: selected ? "#4f46e5" : undefined,
                      }}
                    >
                      {gen.prompts.length} options
                    </Tag>
                  </div>
                </div>
                {selected && (
                  <CheckCircle2
                    style={{
                      fontSize: 24,
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Step 2: Configure Options with Folder Picker
export const ConfigureOptions = ({
  selectedGenerator,
  answers,
  onInputChange,
  onCheckboxChange,
  onSelectFolder,
}) => {
  if (!selectedGenerator) return null;

  const handleBrowseFolder = async (promptName, currentValue) => {
    if (window.electronAPI?.selectFolder) {
      const selectedPath = await window.electronAPI.selectFolder({
        title: `Select ${promptName}`,
        defaultPath: currentValue || undefined,
      });
      if (selectedPath) {
        onInputChange(promptName, selectedPath);
      }
    }
  };

  return (
    <div className="configure-options">
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <Title
          level={3}
          style={{ color: "var(--color-text-primary)", marginBottom: 8 }}
        >
          <SettingsIcon style={{ marginRight: 12, color: "#6366f1" }} />
          Configure {selectedGenerator.name}
        </Title>
        <Text type="secondary">Customize your project settings</Text>
      </div>

      <Card
        style={{
          background: "var(--color-bg-container)",
          borderColor: "var(--color-border)",
          padding: 24,
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {selectedGenerator.prompts.map((prompt) => {
                const isPath = isPathField(prompt.name);

                return (
                  <div
                    key={prompt.name}
                    className={
                      prompt.type === "checkbox" ? "md:col-span-2" : ""
                    }
                  >
                    <div className="form-field">
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 8,
                          color: "var(--color-text-primary)",
                          fontWeight: 500,
                        }}
                      >
                        {prompt.type === "input" && (
                          <Folder
                            style={{ color: isPath ? "#f59e0b" : "#6366f1" }}
                          />
                        )}
                        {prompt.type === "list" && (
                          <LayoutGrid style={{ color: "#10b981" }} />
                        )}
                        {prompt.type === "checkbox" && (
                          <CheckCircle2 style={{ color: "#f59e0b" }} />
                        )}
                        {prompt.message}
                        {isPath && (
                          <Tag
                            color="orange"
                            style={{ marginLeft: 4, fontSize: 10 }}
                          >
                            PATH
                          </Tag>
                        )}
                      </label>

                      {prompt.type === "input" && (
                        <div style={{ display: "flex", gap: 8 }}>
                          <Input
                            value={answers[prompt.name] || ""}
                            onChange={(e) =>
                              onInputChange(prompt.name, e.target.value)
                            }
                            placeholder={
                              prompt.default || `Enter ${prompt.name}`
                            }
                          />
                          {isPath && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() =>
                                    handleBrowseFolder(
                                      prompt.name,
                                      answers[prompt.name]
                                    )
                                  }
                                >
                                  <FolderOpen className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Browse folder</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      )}

                      {prompt.type === "list" && (
                        <select
                          value={answers[prompt.name] || ""}
                          onChange={(e) =>
                            onInputChange(prompt.name, e.target.value)
                          }
                          style={{
                            width: "100%",
                            padding: "10px 14px",
                            background: "var(--color-bg-base)",
                            border: "1px solid var(--color-border)",
                            borderRadius: 8,
                            color: "var(--color-text-primary)",
                            fontSize: 14,
                            outline: "none",
                            cursor: "pointer",
                          }}
                        >
                          {prompt.choices.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      )}

                      {prompt.type === "checkbox" && (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                            marginTop: 4,
                          }}
                        >
                          {prompt.choices.map((c) => {
                            const isChecked = (
                              answers[prompt.name] || []
                            ).includes(c.value);
                            return (
                              <Tag
                                key={c.value}
                                onClick={() =>
                                  onCheckboxChange(
                                    prompt.name,
                                    c.value,
                                    !isChecked
                                  )
                                }
                                style={{
                                  cursor: "pointer",
                                  padding: "6px 12px",
                                  borderRadius: 6,
                                  background: isChecked
                                    ? "#4f46e5"
                                    : "var(--color-bg-elevated)",
                                  borderColor: isChecked
                                    ? "#6366f1"
                                    : "var(--color-border)",
                                  color: isChecked
                                    ? "#fff"
                                    : "var(--color-text-secondary)",
                                  transition: "all 0.2s",
                                }}
                              >
                                {isChecked && (
                                  <CheckCircle2
                                    style={{ marginRight: 4 }}
                                  />
                                )}
                                {c.name}
                              </Tag>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
        </div>
      </Card>
    </div>
  );
};

// Step 3: Preview
export const PreviewStep = ({
  selectedGenerator,
  answers,
  templatePreviews,
  uiStackInfo,
}) => {
  const frontendKey = answers.frontend;
  const preview = frontendKey ? templatePreviews[frontendKey] : null;
  const selectedUIs = answers.ui || [];

  return (
    <div className="preview-step">
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <Title
          level={3}
          style={{ color: "var(--color-text-primary)", marginBottom: 8 }}
        >
          <Eye style={{ marginRight: 12, color: "#6366f1" }} />
          Preview Your Project
        </Title>
        <Text type="secondary">
          Review your configuration before generating
        </Text>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          style={{
            background: "var(--color-bg-container)",
            borderColor: "var(--color-border)",
            height: "100%",
            padding: 0,
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--color-border)",
              background: "var(--color-bg-container)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Code style={{ marginRight: 4 }} />
            <span style={{ color: "var(--color-text-primary)" }}>
              Template Preview
            </span>
          </div>
            {preview ? (
              <div>
                <div
                  style={{
                    height: 200,
                    background:
                      "linear-gradient(135deg, var(--color-bg-container) 0%, var(--color-bg-elevated) 50%, var(--color-bg-container) 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "radial-gradient(circle at 30% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "radial-gradient(circle at 70% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)",
                    }}
                  />
                  <div style={{ textAlign: "center", zIndex: 1 }}>
                    <div style={{ fontSize: 48, marginBottom: 8 }}>
                      {preview.category === "React" && "⚛️"}
                      {preview.category === "Vue" && "💚"}
                      {preview.category === "Mobile" && "📱"}
                      {preview.category === "Monorepo" && "📦"}
                    </div>
                    <Text
                      style={{
                        color: "var(--color-text-secondary)",
                        fontSize: 12,
                      }}
                    >
                      {preview.category} Template
                    </Text>
                  </div>
                </div>
                <div style={{ padding: 20 }}>
                  <Title
                    level={4}
                    style={{
                      color: "var(--color-text-primary)",
                      marginBottom: 8,
                    }}
                  >
                    {preview.name}
                  </Title>
                    <Paragraph
                    style={{ marginBottom: 16 }}
                  >
                    {preview.description}
                  </Paragraph>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {preview.features.map((feature) => (
                      <Tag
                        key={feature}
                        color="blue"
                        style={{ borderRadius: 4 }}
                      >
                        {feature}
                      </Tag>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  height: 300,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#64748b",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <AppWindow
                    style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}
                  />
                  <div>Select a frontend framework to see preview</div>
                </div>
              </div>
            )}
        </Card>

        <Card
          style={{
            background: "var(--color-bg-container)",
            borderColor: "var(--color-border)",
            height: "100%",
            padding: 0,
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--color-border)",
              background: "var(--color-bg-container)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <SettingsIcon style={{ marginRight: 4 }} />
            <span style={{ color: "var(--color-text-primary)" }}>
              Configuration Summary
            </span>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {Object.entries(answers).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    padding: 12,
                    background: "var(--color-bg-elevated)",
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <Text
                      style={{
                        color: "var(--color-text-secondary)",
                        fontSize: 12,
                        textTransform: "uppercase",
                      }}
                    >
                      {key}
                    </Text>
                    {isPathField(key) && (
                      <Tag color="orange" style={{ fontSize: 10 }}>
                        PATH
                      </Tag>
                    )}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    {Array.isArray(value) ? (
                      <div
                        style={{ display: "flex", flexWrap: "wrap", gap: 4 }}
                      >
                        {value.length > 0 ? (
                          value.map((v) => (
                            <Tag
                              key={v}
                              color="purple"
                              style={{ borderRadius: 4 }}
                            >
                              {uiStackInfo[v]?.name || v}
                            </Tag>
                          ))
                        ) : (
                          <Text
                            style={{
                              color: "var(--color-text-secondary)",
                              fontStyle: "italic",
                            }}
                          >
                            None selected
                          </Text>
                        )}
                      </div>
                    ) : (
                      <Text
                        style={{
                          color: "var(--color-text-primary)",
                          fontWeight: 500,
                        }}
                      >
                        {templatePreviews[value]?.name || value || "-"}
                      </Text>
                    )}
                  </div>
                </div>
              ))}

              {Object.keys(answers).length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    color: "var(--color-text-secondary)",
                    padding: 40,
                  }}
                >
                  No configuration options set
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

// Step 4: Generate with Logs
export const GenerateStep = ({
  loading,
  logs,
  onGenerate,
  isComplete,
  error,
  outputPath,
  onOpenOutput,
}) => {
  const handleOpenFolder = async () => {
    if (outputPath && window.electronAPI?.openFolder) {
      await window.electronAPI.openFolder(outputPath);
    } else if (onOpenOutput) {
      onOpenOutput();
    }
  };

  return (
    <div className="generate-step">
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <Title
          level={3}
          style={{ color: "var(--color-text-primary)", marginBottom: 8 }}
        >
          <PlayCircle style={{ marginRight: 12, color: "#6366f1" }} />
          Generate Project
        </Title>
        <Text type="secondary">
          {loading
            ? "Generating your project..."
            : isComplete
            ? "Generation complete!"
            : "Ready to generate your project"}
        </Text>
      </div>

      <Card
        style={{
          background: "var(--color-bg-container)",
          borderColor: "var(--color-border)",
          marginBottom: 24,
          padding: 0,
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            background: "var(--color-bg-elevated)",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "#ef4444",
              }}
            />
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "#f59e0b",
              }}
            />
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "#22c55e",
              }}
            />
          </div>
          <Text
            style={{
              color: "var(--color-text-secondary)",
              marginLeft: 8,
              fontSize: 13,
            }}
          >
            Terminal Output
          </Text>
          {loading && (
            <Badge className="ml-auto bg-emerald-500/10 text-emerald-400 border-emerald-500/40">
              Running
            </Badge>
          )}
          {isComplete && !error && (
            <Badge className="ml-auto bg-emerald-500/10 text-emerald-400 border-emerald-500/40">
              Complete
            </Badge>
          )}
          {error && (
            <Badge className="ml-auto bg-red-500/10 text-red-400 border-red-500/40">
              Error
            </Badge>
          )}
        </div>

        {/* Terminal Content */}
        <div
          style={{
            padding: 16,
            height: 300,
            overflowY: "auto",
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          {logs.length === 0 ? (
            <div
              style={{
                color: "var(--color-text-secondary)",
                textAlign: "center",
                paddingTop: 100,
              }}
            >
              <Code style={{ width: 32, height: 32, marginBottom: 16, opacity: 0.5 }} />
              <div>Click "Generate" to start the process</div>
            </div>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                style={{
                  color:
                    log.type === "error"
                      ? "#ef4444"
                      : log.type === "success"
                      ? "#22c55e"
                      : log.type === "info"
                      ? "#3b82f6"
                      : "var(--color-text-secondary)",
                  marginBottom: 4,
                }}
              >
                <span style={{ color: "#6366f1", marginRight: 8 }}>{">"}</span>
                {log.message}
              </div>
            ))
          )}
          {loading && (
            <div style={{ color: "#6366f1" }}>
              <span className="cursor-blink">▋</span>
            </div>
          )}
        </div>
      </Card>

      {!loading && !isComplete && (
        <div style={{ textAlign: "center" }}>
          <Button
            type="button"
            size="lg"
            onClick={onGenerate}
            className="h-12 px-12 text-base font-medium text-white shadow-lg border-0 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400"
          >
            <Rocket className="mr-2 h-4 w-4" />
            Generate Project
          </Button>
        </div>
      )}

      {isComplete && !error && (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              padding: 24,
              background: "rgba(34, 197, 94, 0.1)",
              borderRadius: 12,
              border: "1px solid rgba(34, 197, 94, 0.3)",
            }}
          >
            <CheckCircle2
              style={{ fontSize: 48, color: "#22c55e", marginBottom: 16 }}
            />
            <Title level={4} style={{ color: "#22c55e", marginBottom: 16 }}>
              Project Generated Successfully!
            </Title>

            {outputPath && (
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: "#94a3b8", fontSize: 13 }}>
                  Output:{" "}
                  <code
                    style={{
                      color: "var(--color-text-primary)",
                      background: "var(--color-bg-elevated)",
                      padding: "2px 8px",
                      borderRadius: 4,
                    }}
                  >
                    {outputPath}
                  </code>
                </Text>
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <Button
                type="button"
                onClick={handleOpenFolder}
                className="bg-emerald-500 hover:bg-emerald-600 border-emerald-500 text-white"
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                Open Output Folder
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
