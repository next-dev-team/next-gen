/**
 * BMAD Setup Wizard
 *
 * A step-by-step wizard for setting up BMAD-Method in any project.
 * Features:
 * - Project folder selection
 * - BMAD module selection
 * - IDE integration configuration
 * - PRD import
 * - Initial board setup
 */

import React, { useState, useEffect } from "react";
import {
  FolderOpen,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Settings,
  FileText,
  Code,
  Terminal,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import useBmadStore from "../../stores/bmadStore";

// Wizard steps
const WIZARD_STEPS = [
  {
    id: "project",
    title: "Select Project",
    description: "Choose or create a project folder",
    icon: FolderOpen,
  },
  {
    id: "modules",
    title: "Choose Modules",
    description: "Select BMAD modules to install",
    icon: Settings,
  },
  {
    id: "ide",
    title: "IDE Integration",
    description: "Configure your development environment",
    icon: Code,
  },
  {
    id: "context",
    title: "Initial Context",
    description: "Import existing PRD or create new",
    icon: FileText,
  },
  {
    id: "complete",
    title: "Complete",
    description: "Ready to start!",
    icon: CheckCircle2,
  },
];

// Available BMAD modules
const BMAD_MODULES = [
  {
    id: "core",
    name: "BMAD Core",
    description: "Essential agents and workflows",
    required: true,
    agents: ["analyst", "pm", "architect", "sm", "dev"],
  },
  {
    id: "ux",
    name: "UX Design",
    description: "UX Designer agent and wireframe workflows",
    required: false,
    agents: ["ux-designer"],
  },
  {
    id: "testing",
    name: "Testing & QA",
    description: "Test Engineer agent and QA workflows",
    required: false,
    agents: ["tea"],
  },
  {
    id: "docs",
    name: "Documentation",
    description: "Technical Writer agent and doc generation",
    required: false,
    agents: ["tech-writer"],
  },
  {
    id: "solo",
    name: "Solo Dev Mode",
    description: "Streamlined workflow for individual developers",
    required: false,
    agents: ["quick-flow-solo-dev"],
  },
];

// Supported IDEs
const IDE_OPTIONS = [
  {
    id: "cursor",
    name: "Cursor",
    description: "AI-powered code editor",
    configFile: ".cursor/rules/bmad.mdc",
  },
  {
    id: "vscode",
    name: "VS Code",
    description: "With GitHub Copilot",
    configFile: ".vscode/settings.json",
  },
  {
    id: "claude-code",
    name: "Claude Code",
    description: "Anthropic's coding assistant",
    configFile: ".claude/config.json",
  },
  {
    id: "windsurf",
    name: "Windsurf",
    description: "Codeium's AI IDE",
    configFile: ".windsurf/rules.md",
  },
];

// Step 1: Project Selection
function ProjectStep({ data, onChange }) {
  const [isSelecting, setIsSelecting] = useState(false);

  const handleSelectFolder = async () => {
    setIsSelecting(true);
    try {
      if (window.electronAPI?.selectFolder) {
        const result = await window.electronAPI.selectFolder();
        if (result) {
          onChange({
            projectPath: result.path,
            projectName: result.name || result.path.split(/[/\\]/).pop(),
          });
        }
      } else {
        // Mock for development
        const mockPath = "C:/Projects/my-awesome-app";
        onChange({
          projectPath: mockPath,
          projectName: "my-awesome-app",
        });
      }
    } finally {
      setIsSelecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <FolderOpen className="w-16 h-16 mx-auto mb-4 text-indigo-400" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Select Your Project
        </h3>
        <p className="text-slate-400">
          Choose an existing project folder or create a new one
        </p>
      </div>

      <div
        onClick={handleSelectFolder}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          data.projectPath
            ? "border-green-500/50 bg-green-500/10"
            : "border-slate-600 hover:border-indigo-500 hover:bg-slate-800/50"
        }`}
      >
        {isSelecting ? (
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-indigo-400" />
        ) : data.projectPath ? (
          <div>
            <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-green-400" />
            <p className="text-white font-medium">{data.projectName}</p>
            <p className="text-sm text-slate-400 mt-1">{data.projectPath}</p>
            <p className="text-xs text-indigo-400 mt-3">Click to change</p>
          </div>
        ) : (
          <div>
            <FolderOpen className="w-8 h-8 mx-auto mb-3 text-slate-400" />
            <p className="text-slate-300">Click to select folder</p>
            <p className="text-sm text-slate-500 mt-1">
              Or drag and drop a folder here
            </p>
          </div>
        )}
      </div>

      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h4 className="text-sm font-medium text-white mb-2">
          What happens next?
        </h4>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>• BMAD configuration files will be created in your project</li>
          <li>• A `_bmad` folder will store agent rules and workflows</li>
          <li>• A `_bmad-output` folder will store generated artifacts</li>
        </ul>
      </div>
    </div>
  );
}

// Step 2: Module Selection
function ModulesStep({ data, onChange }) {
  const toggleModule = (moduleId) => {
    const current = data.selectedModules || ["core"];
    const module = BMAD_MODULES.find((m) => m.id === moduleId);

    if (module?.required) return; // Can't deselect required modules

    const newModules = current.includes(moduleId)
      ? current.filter((id) => id !== moduleId)
      : [...current, moduleId];

    onChange({ selectedModules: newModules });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Settings className="w-16 h-16 mx-auto mb-4 text-indigo-400" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Choose BMAD Modules
        </h3>
        <p className="text-slate-400">Select the modules you want to install</p>
      </div>

      <div className="space-y-3">
        {BMAD_MODULES.map((module) => {
          const isSelected = (data.selectedModules || ["core"]).includes(
            module.id,
          );

          return (
            <div
              key={module.id}
              onClick={() => toggleModule(module.id)}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? "bg-indigo-500/20 border-indigo-500"
                  : "bg-slate-800/50 border-slate-700 hover:border-slate-500"
              } ${module.required ? "cursor-default" : ""}`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isSelected
                      ? "bg-indigo-500 border-indigo-500"
                      : "border-slate-500"
                  }`}
                >
                  {isSelected && <Check size={14} className="text-white" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-white">{module.name}</h4>
                    {module.required && (
                      <span className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-400">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    {module.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {module.agents.map((agent) => (
                      <span
                        key={agent}
                        className="text-xs px-2 py-0.5 bg-slate-700/50 rounded text-slate-500"
                      >
                        {agent}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Step 3: IDE Integration
function IdeStep({ data, onChange }) {
  const toggleIde = (ideId) => {
    const current = data.ideIntegrations || [];
    const newIdes = current.includes(ideId)
      ? current.filter((id) => id !== ideId)
      : [...current, ideId];

    onChange({ ideIntegrations: newIdes });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Code className="w-16 h-16 mx-auto mb-4 text-indigo-400" />
        <h3 className="text-xl font-semibold text-white mb-2">
          IDE Integration
        </h3>
        <p className="text-slate-400">
          Configure BMAD rules for your development environment
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {IDE_OPTIONS.map((ide) => {
          const isSelected = (data.ideIntegrations || []).includes(ide.id);

          return (
            <div
              key={ide.id}
              onClick={() => toggleIde(ide.id)}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? "bg-indigo-500/20 border-indigo-500"
                  : "bg-slate-800/50 border-slate-700 hover:border-slate-500"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    isSelected
                      ? "bg-indigo-500 border-indigo-500"
                      : "border-slate-500"
                  }`}
                >
                  {isSelected && <Check size={12} className="text-white" />}
                </div>
                <div>
                  <h4 className="font-medium text-white">{ide.name}</h4>
                  <p className="text-xs text-slate-400">{ide.description}</p>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-500 font-mono">
                {ide.configFile}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h4 className="text-sm font-medium text-white mb-2">
          What gets configured?
        </h4>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>• Agent rules and system prompts for each BMAD agent</li>
          <li>• Context file references for PRD, architecture, etc.</li>
          <li>• Workflow commands and shortcuts</li>
        </ul>
      </div>
    </div>
  );
}

// Step 4: Initial Context
function ContextStep({ data, onChange }) {
  const [importing, setImporting] = useState(false);

  const handleImportPrd = async () => {
    setImporting(true);
    try {
      if (window.electronAPI?.selectFile) {
        const result = await window.electronAPI.selectFile({
          filters: [{ name: "Markdown", extensions: ["md"] }],
        });
        if (result) {
          onChange({ useExistingPrd: true, prdPath: result.path });
        }
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <FileText className="w-16 h-16 mx-auto mb-4 text-indigo-400" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Initial Context
        </h3>
        <p className="text-slate-400">
          Start with an existing PRD or create one later
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div
          onClick={() => onChange({ useExistingPrd: false, prdPath: "" })}
          className={`p-6 rounded-lg border cursor-pointer transition-all ${
            !data.useExistingPrd
              ? "bg-indigo-500/20 border-indigo-500"
              : "bg-slate-800/50 border-slate-700 hover:border-slate-500"
          }`}
        >
          <Sparkles className="w-8 h-8 mb-3 text-indigo-400" />
          <h4 className="font-medium text-white mb-1">Start Fresh</h4>
          <p className="text-sm text-slate-400">
            Create a new PRD with the Product Manager agent
          </p>
        </div>

        <div
          onClick={handleImportPrd}
          className={`p-6 rounded-lg border cursor-pointer transition-all ${
            data.useExistingPrd
              ? "bg-indigo-500/20 border-indigo-500"
              : "bg-slate-800/50 border-slate-700 hover:border-slate-500"
          }`}
        >
          {importing ? (
            <Loader2 className="w-8 h-8 mb-3 animate-spin text-indigo-400" />
          ) : (
            <Download className="w-8 h-8 mb-3 text-indigo-400" />
          )}
          <h4 className="font-medium text-white mb-1">Import Existing</h4>
          <p className="text-sm text-slate-400">
            {data.prdPath
              ? data.prdPath.split(/[/\\]/).pop()
              : "Import an existing PRD file"}
          </p>
        </div>
      </div>

      {data.useExistingPrd && data.prdPath && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle2 size={16} />
            <span className="text-sm font-medium">PRD Selected</span>
          </div>
          <p className="text-sm text-slate-400 mt-1 font-mono">
            {data.prdPath}
          </p>
        </div>
      )}
    </div>
  );
}

// Step 5: Complete
function CompleteStep({
  data,
  isInstalling,
  installError,
  onRetry,
  onCreateManually,
}) {
  return (
    <div className="space-y-6 text-center">
      {isInstalling ? (
        <>
          <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-indigo-400" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Setting Up BMAD...
          </h3>
          <p className="text-slate-400">
            Installing modules and configuring your project
          </p>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 text-left">
            <div className="space-y-2 text-sm font-mono text-slate-400">
              <p>→ Downloading BMAD v6.0.0-Beta.5 from GitHub...</p>
              <p>→ Setting up agents and workflows...</p>
            </div>
          </div>
        </>
      ) : installError ? (
        <>
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-amber-400" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Installation Issue
          </h3>
          <p className="text-slate-400 text-sm mb-4">
            The automatic installation via npx failed. This usually means
            Node.js is not available.
          </p>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 text-left mb-4">
            <p className="text-red-400 text-xs font-mono break-all">
              {installError}
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onRetry}
              className="px-5 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white hover:bg-slate-600 transition-colors text-sm"
            >
              Try Again
            </button>
            <button
              onClick={onCreateManually}
              className="px-5 py-2 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500 transition-colors text-sm font-medium"
            >
              Download from GitHub
            </button>
          </div>
          <p className="text-slate-500 text-xs mt-3">
            Downloads BMAD files directly from GitHub and creates the project
            structure
          </p>
        </>
      ) : (
        <>
          <div className="w-20 h-20 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            🎉 Setup Complete!
          </h3>
          <p className="text-slate-400">
            BMAD-Method has been configured for your project
          </p>

          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700 text-left mt-8">
            <h4 className="font-medium text-white mb-4">What's Next?</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-indigo-400">1</span>
                </div>
                <div>
                  <p className="text-white text-sm">
                    Create or refine your PRD
                  </p>
                  <p className="text-slate-400 text-xs">
                    Chat with the Product Manager agent
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-indigo-400">2</span>
                </div>
                <div>
                  <p className="text-white text-sm">Generate user stories</p>
                  <p className="text-slate-400 text-xs">
                    Use AI to create stories from your PRD
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-indigo-400">3</span>
                </div>
                <div>
                  <p className="text-white text-sm">Start developing!</p>
                  <p className="text-slate-400 text-xs">
                    Work through stories with the Dev agent
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Main Wizard Component
export default function SetupWizard({
  onComplete,
  onClose,
  existingProjectPath,
}) {
  const {
    wizardStep,
    setWizardStep,
    wizardData,
    updateWizardData,
    executeWizardSetup,
    createManualBmadStructure,
    installStatus,
    installError,
    activeProjectPath,
  } = useBmadStore();

  const [isInstalling, setIsInstalling] = useState(false);

  // Auto-detect existing project and skip to step 2 (Modules)
  useEffect(() => {
    const projectPath = existingProjectPath || activeProjectPath;
    if (projectPath && wizardStep === 0 && !wizardData.projectPath) {
      // Pre-fill project data and skip to modules step
      updateWizardData({
        projectPath: projectPath,
        projectName: projectPath.split(/[/\\]/).pop(),
      });
      setWizardStep(1); // Skip to Modules step
    }
  }, [
    existingProjectPath,
    activeProjectPath,
    wizardStep,
    wizardData.projectPath,
    updateWizardData,
    setWizardStep,
  ]);

  const currentStepIndex = wizardStep;
  const currentStep = WIZARD_STEPS[currentStepIndex];

  const canGoNext = () => {
    switch (currentStepIndex) {
      case 0:
        return !!wizardData.projectPath;
      case 1:
        return wizardData.selectedModules?.length > 0;
      case 2:
        return true; // IDE selection is optional
      case 3:
        return true; // Context is optional
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (currentStepIndex === WIZARD_STEPS.length - 2) {
      // About to go to complete step - run setup
      setIsInstalling(true);
      setWizardStep(currentStepIndex + 1);
      try {
        const result = await executeWizardSetup();
        if (result.success) {
          // Stay on complete step
        }
      } finally {
        setIsInstalling(false);
      }
    } else if (currentStepIndex < WIZARD_STEPS.length - 1) {
      setWizardStep(currentStepIndex + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setWizardStep(currentStepIndex - 1);
    }
  };

  const handleComplete = () => {
    onComplete?.(wizardData);
  };

  // Retry npx installation
  const handleRetry = async () => {
    setIsInstalling(true);
    try {
      await executeWizardSetup();
    } finally {
      setIsInstalling(false);
    }
  };

  // Create BMAD structure manually (without npx)
  const handleCreateManually = async () => {
    setIsInstalling(true);
    try {
      const success = await createManualBmadStructure();
      if (success) {
        // Structure created, setup complete
      }
    } finally {
      setIsInstalling(false);
    }
  };

  const renderStep = () => {
    switch (currentStepIndex) {
      case 0:
        return <ProjectStep data={wizardData} onChange={updateWizardData} />;
      case 1:
        return <ModulesStep data={wizardData} onChange={updateWizardData} />;
      case 2:
        return <IdeStep data={wizardData} onChange={updateWizardData} />;
      case 3:
        return <ContextStep data={wizardData} onChange={updateWizardData} />;
      case 4:
        return (
          <CompleteStep
            data={wizardData}
            isInstalling={isInstalling}
            installError={installError}
            onRetry={handleRetry}
            onCreateManually={handleCreateManually}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  BMAD Setup Wizard
                </h2>
                <p className="text-sm text-slate-400">
                  Configure your project for AI-powered development
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {WIZARD_STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      index < currentStepIndex
                        ? "bg-green-500 text-white"
                        : index === currentStepIndex
                          ? "bg-indigo-500 text-white"
                          : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {index < currentStepIndex ? (
                      <Check size={14} />
                    ) : (
                      <step.icon size={14} />
                    )}
                  </div>
                  <span
                    className={`text-sm hidden sm:block ${
                      index === currentStepIndex
                        ? "text-white"
                        : "text-slate-500"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < WIZARD_STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      index < currentStepIndex ? "bg-green-500" : "bg-slate-700"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{renderStep()}</div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStepIndex === 0 || isInstalling}
            className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={18} />
            Back
          </button>

          {currentStepIndex === WIZARD_STEPS.length - 1 ? (
            <button
              onClick={handleComplete}
              disabled={isInstalling}
              className="flex items-center gap-2 px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Get Started
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canGoNext() || isInstalling}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
            >
              {currentStepIndex === WIZARD_STEPS.length - 2
                ? "Complete Setup"
                : "Next"}
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
