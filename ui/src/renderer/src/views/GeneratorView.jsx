import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  EyeOutlined,
  PlayCircleOutlined,
  RocketOutlined,
  SettingOutlined,
  HomeOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Button, message, Steps, Space } from "antd";
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
  );
}
