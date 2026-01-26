import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  Home,
  PlayCircle,
  RefreshCcw,
  Rocket,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import {
  ConfigureOptions,
  GenerateStep,
  PreviewStep,
  TemplateSelector,
} from "../components/WizardSteps";
import { generators } from "../generators-config";
import { templatePreviews, uiStackInfo } from "../theme";

const steps = [
  {
    title: "Template",
    icon: <Rocket className="h-4 w-4" />,
    description: "Choose template",
  },
  {
    title: "Configure",
    icon: <Settings className="h-4 w-4" />,
    description: "Set options",
  },
  {
    title: "Preview",
    icon: <Eye className="h-4 w-4" />,
    description: "Review settings",
  },
  {
    title: "Generate",
    icon: <PlayCircle className="h-4 w-4" />,
    description: "Create project",
  },
];

export default function GeneratorView() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedGenerator, setSelectedGenerator] = useState(null);
  const [answers, setAnswers] = useState({});
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState(null);
  const [outputPath, setOutputPath] = useState(null);
  const logsEndRef = useRef(null);

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
      // For checkbox type, initialize with default array or empty array
      if (p.type === "checkbox") {
        initialAnswers[p.name] = Array.isArray(p.default) ? [...p.default] : [];
      } else if (p.type === "list" && p.choices && p.choices.length > 0) {
        // For list type, use default if provided, otherwise first choice
        initialAnswers[p.name] = p.default !== undefined ? p.default : p.choices[0].value;
      } else if (p.default !== undefined && typeof p.default !== "function") {
        // For other types with defaults
        initialAnswers[p.name] = p.default;
      }
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

        toast.success("Project generated successfully!");
      } else {
        throw new Error("Electron API not available");
      }
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        { type: "error", message: `Error: ${err.message}` },
      ]);
      setError(err.message);
      toast.error("Generation failed. Check the logs for details.");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 0 && !selectedGenerator) {
      toast.warning("Please select a template first");
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
    <div
      className="generator-view-container"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0, // Important for flex children
        overflow: "hidden",
      }}
    >
      {/* Steps Progress */}
      <div
        style={{
          background: "var(--color-bg-container)",
          borderRadius: 16,
          padding: "20px 28px",
          marginBottom: 16,
          border: "1px solid var(--color-border)",
          flexShrink: 0,
        }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {steps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div
                key={step.title}
                className="flex flex-1 items-center gap-3"
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium transition-colors ${
                    isCompleted
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : isActive
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                      : "border-[var(--color-border)] bg-[var(--color-bg-base)] text-[var(--color-text-secondary)]"
                  }`}
                >
                  {index + 1}
                </div>
                <div className="flex flex-col">
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: isCompleted || isActive
                        ? "var(--color-text-primary)"
                        : "var(--color-text-disabled)",
                    }}
                  >
                    {step.title}
                  </span>
                  <span
                    className="text-xs"
                    style={{
                      color: isActive
                        ? "#6366f1"
                        : isCompleted
                        ? "#22c55e"
                        : "var(--color-text-disabled)",
                    }}
                  >
                    {step.description}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden flex-1 md:block">
                    <div
                      className="h-px"
                      style={{
                        background:
                          index < currentStep
                            ? "linear-gradient(90deg,#22c55e,#22c55e)"
                            : "var(--color-border)",
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content - Scrollable */}
      <div
        style={{
          background: "var(--color-bg-container)",
          borderRadius: 16,
          padding: 24,
          border: "1px solid var(--color-border)",
          marginBottom: 16,
          flex: 1,
          minHeight: 0, // Important for flex overflow
          overflow: "auto",
        }}
      >
        {renderStepContent()}
      </div>

      {/* Footer - Fixed at bottom */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
          paddingTop: 8,
          paddingBottom: 8,
        }}
      >
        <Button
          type="button"
          variant="ghost"
          onClick={resetWizard}
          className="border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]/80"
        >
          <Home className="mr-2 h-4 w-4" />
          Start Over
        </Button>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] disabled:bg-[var(--color-bg-container)] disabled:text-[var(--color-text-disabled)]"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button
              type="button"
              onClick={nextStep}
              disabled={currentStep === 0 && !selectedGenerator}
              className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white border-0 shadow-md disabled:from-indigo-600/40 disabled:to-indigo-500/40"
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            isComplete && (
              <Button
                type="button"
                onClick={resetWizard}
                className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white border-0"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Create Another
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

