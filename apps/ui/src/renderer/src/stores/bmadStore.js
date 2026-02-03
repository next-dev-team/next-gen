/**
 * BMAD Store - State management for BMAD Method workflow
 *
 * Manages BMAD phases, installation status, and project context.
 * Now supports per-project sessions - each project has isolated state.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// BMAD Workflow Phases
const BMAD_PHASES = [
  {
    id: "analysis",
    name: "Analysis",
    icon: "🔍",
    description: "Brainstorming, research, and product brief creation",
    agents: ["analyst"],
    artifacts: ["product-brief.md"],
  },
  {
    id: "planning",
    name: "Planning",
    icon: "📋",
    description: "PRD creation, project planning, and UX design",
    agents: ["pm", "ux-designer"],
    artifacts: ["prd.md", "ux-wireframes/"],
  },
  {
    id: "solutioning",
    name: "Solutioning",
    icon: "🏗️",
    description: "Solution architecture and technical specifications",
    agents: ["architect"],
    artifacts: ["architecture.md", "tech-spec.md"],
  },
  {
    id: "implementation",
    name: "Implementation",
    icon: "💻",
    description: "Development, testing, and documentation",
    agents: ["sm", "dev", "tea", "tech-writer"],
    artifacts: ["epics/", "stories/"],
  },
];

// BMAD Installation Status
const INSTALL_STATUS = {
  NOT_CHECKED: "not_checked",
  CHECKING: "checking",
  NOT_INSTALLED: "not_installed",
  INSTALLING: "installing",
  INSTALLED: "installed",
  ERROR: "error",
};

// Default project session state
const createDefaultProjectSession = () => ({
  projectContext: {
    prd: null,
    prdPath: null,
    architecture: null,
    architecturePath: null,
    productBrief: null,
    productBriefPath: null,
  },
  currentPhase: "analysis",
  phaseProgress: {
    analysis: { completed: false, startedAt: null, completedAt: null },
    planning: { completed: false, startedAt: null, completedAt: null },
    solutioning: { completed: false, startedAt: null, completedAt: null },
    implementation: { completed: false, startedAt: null, completedAt: null },
  },
  chatHistory: {}, // Keyed by agentId, e.g. { pm: [messages], analyst: [messages] }
  generatedStories: [],
});

// Normalize path for consistent keys (handle Windows/Unix paths)
const normalizePath = (path) =>
  String(path || "")
    .replace(/\\/g, "/")
    .toLowerCase();

/**
 * BMAD Store
 */
const useBmadStore = create(
  persist(
    (set, get) => ({
      // Installation state (global)
      installStatus: INSTALL_STATUS.NOT_CHECKED,
      installError: null,
      bmadVersion: null,
      bmadPath: null,

      // Current active project path
      activeProjectPath: null,

      // Per-project sessions (keyed by normalized projectPath)
      projectSessions: {},

      // Wizard state (global)
      wizardStep: 0,
      showSetupWizard: false, // Controlled by isSetupComplete
      isSetupComplete: false, // Track if setup has been completed
      wizardData: {
        projectName: "",
        projectPath: "",
        selectedModules: ["core"],
        ideIntegrations: [],
        useExistingPrd: false,
        prdPath: "",
      },

      // Getters
      getPhases: () => BMAD_PHASES,
      getCurrentPhase: () => {
        const session = get().getActiveSession();
        return BMAD_PHASES.find((p) => p.id === session.currentPhase);
      },
      getPhaseById: (id) => BMAD_PHASES.find((p) => p.id === id),

      // Get the active project session (or create default if not exists)
      getActiveSession: () => {
        const { activeProjectPath, projectSessions } = get();
        if (!activeProjectPath) {
          return createDefaultProjectSession();
        }
        const key = normalizePath(activeProjectPath);
        return projectSessions[key] || createDefaultProjectSession();
      },

      // Get session for a specific project
      getSessionForProject: (projectPath) => {
        const key = normalizePath(projectPath);
        return get().projectSessions[key] || createDefaultProjectSession();
      },

      // Update session for active project
      updateActiveSession: (updates) => {
        const { activeProjectPath } = get();
        if (!activeProjectPath) return;

        const key = normalizePath(activeProjectPath);
        set((state) => ({
          projectSessions: {
            ...state.projectSessions,
            [key]: {
              ...(state.projectSessions[key] || createDefaultProjectSession()),
              ...updates,
            },
          },
        }));
      },

      // Set active project
      setActiveProject: (projectPath) => {
        const key = normalizePath(projectPath);
        set((state) => ({
          activeProjectPath: projectPath,
          // Initialize session if doesn't exist
          projectSessions: {
            ...state.projectSessions,
            [key]: state.projectSessions[key] || createDefaultProjectSession(),
          },
        }));
      },

      // Get project context for active session
      get projectContext() {
        return get().getActiveSession().projectContext;
      },

      // Installation actions
      checkInstallation: async () => {
        set({ installStatus: INSTALL_STATUS.CHECKING });

        try {
          // Check if BMAD is installed via electronAPI
          if (window.electronAPI?.checkBmadInstall) {
            const result = await window.electronAPI.checkBmadInstall();
            set({
              installStatus: result.installed
                ? INSTALL_STATUS.INSTALLED
                : INSTALL_STATUS.NOT_INSTALLED,
              bmadVersion: result.version || null,
              bmadPath: result.path || null,
            });
            return result.installed;
          }

          // Fallback: Check for _bmad directory in project
          set({ installStatus: INSTALL_STATUS.NOT_INSTALLED });
          return false;
        } catch (err) {
          set({
            installStatus: INSTALL_STATUS.ERROR,
            installError: err.message,
          });
          return false;
        }
      },

      installBmad: async (options = {}) => {
        set({ installStatus: INSTALL_STATUS.INSTALLING, installError: null });
        const projectPath = options.path;

        console.log("[BMAD] Starting installation for:", projectPath);

        // Use the GitHub download method directly (most reliable, no npx needed)
        // This downloads files from GitHub and creates the project structure
        const success = await get().createManualBmadStructure(projectPath);
        return success;
      },

      // Manual BMAD structure creation with GitHub download
      createManualBmadStructure: async (projectPath) => {
        const path =
          projectPath ||
          get().wizardData?.projectPath ||
          get().activeProjectPath;
        if (!path) {
          set({ installError: "No project path specified" });
          return false;
        }

        console.log("[BMAD] Creating BMAD structure for:", path);
        set({ installStatus: INSTALL_STATUS.INSTALLING, installError: null });

        const GITHUB_RAW_BASE =
          "https://raw.githubusercontent.com/bmad-code-org/BMAD-METHOD/main";

        // Essential files to download from GitHub (correct paths based on v6 structure)
        const filesToDownload = [
          // Core agents (YAML format)
          {
            url: `${GITHUB_RAW_BASE}/src/bmm/agents/pm.agent.yaml`,
            dest: "_bmad/bmm/agents/pm.agent.yaml",
          },
          {
            url: `${GITHUB_RAW_BASE}/src/bmm/agents/architect.agent.yaml`,
            dest: "_bmad/bmm/agents/architect.agent.yaml",
          },
          {
            url: `${GITHUB_RAW_BASE}/src/bmm/agents/dev.agent.yaml`,
            dest: "_bmad/bmm/agents/dev.agent.yaml",
          },
          {
            url: `${GITHUB_RAW_BASE}/src/bmm/agents/analyst.agent.yaml`,
            dest: "_bmad/bmm/agents/analyst.agent.yaml",
          },
          {
            url: `${GITHUB_RAW_BASE}/src/bmm/agents/ux-designer.agent.yaml`,
            dest: "_bmad/bmm/agents/ux-designer.agent.yaml",
          },
          {
            url: `${GITHUB_RAW_BASE}/src/bmm/agents/sm.agent.yaml`,
            dest: "_bmad/bmm/agents/sm.agent.yaml",
          },
          // Module config
          {
            url: `${GITHUB_RAW_BASE}/src/bmm/module.yaml`,
            dest: "_bmad/bmm/module.yaml",
          },
        ];

        try {
          if (!window.electronAPI?.writeProjectFile) {
            throw new Error("File write API not available");
          }

          const projectName = path.split(/[/\\]/).pop();

          // Create _bmad-output directory
          await window.electronAPI.writeProjectFile({
            projectRoot: path,
            relativePath: "_bmad-output/.gitkeep",
            content: "# BMAD Output Directory\n",
            overwrite: true,
          });

          // Create basic config
          const configContent = `# BMM Module Configuration
# Generated by BMAD Setup Wizard
# Version: 6.0.0-Beta.5

project_name: ${projectName}
user_skill_level: intermediate
planning_artifacts: "{project-root}/_bmad-output/planning-artifacts"
implementation_artifacts: "{project-root}/_bmad-output/implementation-artifacts"
project_knowledge: "{project-root}/docs"

# Core Configuration Values
communication_language: English
document_output_language: English
output_folder: "{project-root}/_bmad-output"
`;
          await window.electronAPI.writeProjectFile({
            projectRoot: path,
            relativePath: "_bmad/bmm/config.yaml",
            content: configContent,
            overwrite: true,
          });

          // Download files from GitHub
          console.log("[BMAD] Downloading files from GitHub...");
          let downloadedCount = 0;

          for (const file of filesToDownload) {
            try {
              console.log(`[BMAD] Downloading: ${file.dest}`);
              const response = await fetch(file.url);
              if (response.ok) {
                const content = await response.text();
                await window.electronAPI.writeProjectFile({
                  projectRoot: path,
                  relativePath: file.dest,
                  content: content,
                  overwrite: true,
                });
                downloadedCount++;
              } else {
                console.warn(
                  `[BMAD] Failed to download ${file.url}: ${response.status}`,
                );
              }
            } catch (fetchErr) {
              console.warn(
                `[BMAD] Error downloading ${file.dest}:`,
                fetchErr.message,
              );
            }
          }

          console.log(
            `[BMAD] Downloaded ${downloadedCount}/${filesToDownload.length} files`,
          );

          // Create basic PRD template
          try {
            await window.electronAPI.writeProjectFile({
              projectRoot: path,
              relativePath: "_bmad-output/prd.md",
              content: `# Product Requirements Document

## Project: ${projectName}

## Overview
[Describe your product/project here]

## Goals
- [Goal 1]
- [Goal 2]

## Features
- [Feature 1]
- [Feature 2]

## Technical Requirements
[List technical requirements]

---
*Generated by BMAD Setup Wizard*
`,
              overwrite: false,
            });
          } catch {
            // PRD already exists
          }

          console.log("[BMAD] BMAD structure created successfully");
          set({
            installStatus: INSTALL_STATUS.INSTALLED,
            installError: null,
            bmadVersion: "v6.0.0-Beta.5 (local)",
            bmadPath: path,
          });
          return true;
        } catch (err) {
          console.error("[BMAD] Creation failed:", err);
          set({
            installStatus: INSTALL_STATUS.ERROR,
            installError: err.message,
          });
          return false;
        }
      },

      // Project context actions
      loadProjectContext: async (projectPath) => {
        const path = projectPath || get().activeProjectPath;
        // Validate path is a string
        if (!path || typeof path !== "string") {
          console.warn("[BMAD] loadProjectContext: Invalid path:", path);
          return;
        }

        try {
          // Load context files via electronAPI
          if (window.electronAPI?.readFile) {
            const bmadOutput = `${path}/_bmad-output`;
            const updates = {};

            // Try to load PRD
            try {
              const prd = await window.electronAPI.readFile(
                `${bmadOutput}/prd.md`,
              );
              updates.prd = prd;
              updates.prdPath = `${bmadOutput}/prd.md`;
            } catch {
              // PRD doesn't exist yet
            }

            // Try to load Architecture
            try {
              const arch = await window.electronAPI.readFile(
                `${bmadOutput}/architecture.md`,
              );
              updates.architecture = arch;
              updates.architecturePath = `${bmadOutput}/architecture.md`;
            } catch {
              // Architecture doesn't exist yet
            }

            // Try to load Product Brief
            try {
              const brief = await window.electronAPI.readFile(
                `${bmadOutput}/product-brief.md`,
              );
              updates.productBrief = brief;
              updates.productBriefPath = `${bmadOutput}/product-brief.md`;
            } catch {
              // Brief doesn't exist yet
            }

            // Update project session
            const key = normalizePath(path);
            set((state) => {
              const currentSession =
                state.projectSessions[key] || createDefaultProjectSession();
              return {
                projectSessions: {
                  ...state.projectSessions,
                  [key]: {
                    ...currentSession,
                    projectContext: {
                      ...currentSession.projectContext,
                      ...updates,
                    },
                  },
                },
              };
            });
          }
        } catch (err) {
          console.error("Failed to load project context:", err);
        }
      },

      saveProjectContext: async (type, content, projectPath) => {
        const path = projectPath || get().activeProjectPath;
        if (!path) return false;

        const bmadOutput = `${path}/_bmad-output`;
        const filePaths = {
          prd: `${bmadOutput}/prd.md`,
          architecture: `${bmadOutput}/architecture.md`,
          productBrief: `${bmadOutput}/product-brief.md`,
        };

        const filePath = filePaths[type];
        if (!filePath) return false;

        try {
          if (window.electronAPI?.writeFile) {
            await window.electronAPI.writeFile(filePath, content);

            const key = normalizePath(path);
            set((state) => {
              const currentSession =
                state.projectSessions[key] || createDefaultProjectSession();
              return {
                projectSessions: {
                  ...state.projectSessions,
                  [key]: {
                    ...currentSession,
                    projectContext: {
                      ...currentSession.projectContext,
                      [type]: content,
                      [`${type}Path`]: filePath,
                    },
                  },
                },
              };
            });
            return true;
          }
          return false;
        } catch (err) {
          console.error(`Failed to save ${type}:`, err);
          return false;
        }
      },

      // Chat history actions (per project, per agent)
      getChatHistory: (agentId, projectPath) => {
        const path = projectPath || get().activeProjectPath;
        if (!path) return [];
        const session = get().getSessionForProject(path);
        return session.chatHistory[agentId] || [];
      },

      saveChatHistory: (agentId, messages, projectPath) => {
        const path = projectPath || get().activeProjectPath;
        if (!path) return;

        const key = normalizePath(path);
        set((state) => {
          const currentSession =
            state.projectSessions[key] || createDefaultProjectSession();
          return {
            projectSessions: {
              ...state.projectSessions,
              [key]: {
                ...currentSession,
                chatHistory: {
                  ...currentSession.chatHistory,
                  [agentId]: messages,
                },
              },
            },
          };
        });
      },

      clearChatHistory: (agentId, projectPath) => {
        const path = projectPath || get().activeProjectPath;
        if (!path) return;

        const key = normalizePath(path);
        set((state) => {
          const currentSession =
            state.projectSessions[key] || createDefaultProjectSession();
          const newChatHistory = { ...currentSession.chatHistory };
          delete newChatHistory[agentId];
          return {
            projectSessions: {
              ...state.projectSessions,
              [key]: {
                ...currentSession,
                chatHistory: newChatHistory,
              },
            },
          };
        });
      },

      // Generated stories actions (per project)
      getGeneratedStories: (projectPath) => {
        const path = projectPath || get().activeProjectPath;
        if (!path) return [];
        const session = get().getSessionForProject(path);
        return session.generatedStories || [];
      },

      saveGeneratedStories: (stories, projectPath) => {
        const path = projectPath || get().activeProjectPath;
        if (!path) return;

        const key = normalizePath(path);
        set((state) => {
          const currentSession =
            state.projectSessions[key] || createDefaultProjectSession();
          return {
            projectSessions: {
              ...state.projectSessions,
              [key]: {
                ...currentSession,
                generatedStories: stories,
              },
            },
          };
        });
      },

      // Phase actions
      setCurrentPhase: (phaseId, projectPath) => {
        const phase = BMAD_PHASES.find((p) => p.id === phaseId);
        if (!phase) return;

        const path = projectPath || get().activeProjectPath;
        if (!path) return;

        const key = normalizePath(path);
        set((state) => {
          const currentSession =
            state.projectSessions[key] || createDefaultProjectSession();
          const progress = currentSession.phaseProgress[phaseId];

          return {
            projectSessions: {
              ...state.projectSessions,
              [key]: {
                ...currentSession,
                currentPhase: phaseId,
                phaseProgress: {
                  ...currentSession.phaseProgress,
                  [phaseId]: {
                    ...progress,
                    startedAt: progress.startedAt || new Date().toISOString(),
                  },
                },
              },
            },
          };
        });
      },

      completePhase: (phaseId, projectPath) => {
        const path = projectPath || get().activeProjectPath;
        if (!path) return;

        const key = normalizePath(path);
        set((state) => {
          const currentSession =
            state.projectSessions[key] || createDefaultProjectSession();
          return {
            projectSessions: {
              ...state.projectSessions,
              [key]: {
                ...currentSession,
                phaseProgress: {
                  ...currentSession.phaseProgress,
                  [phaseId]: {
                    ...currentSession.phaseProgress[phaseId],
                    completed: true,
                    completedAt: new Date().toISOString(),
                  },
                },
              },
            },
          };
        });

        // Auto-advance to next phase
        const currentIndex = BMAD_PHASES.findIndex((p) => p.id === phaseId);
        if (currentIndex < BMAD_PHASES.length - 1) {
          get().setCurrentPhase(BMAD_PHASES[currentIndex + 1].id, path);
        }
      },

      resetPhaseProgress: (projectPath) => {
        const path = projectPath || get().activeProjectPath;
        if (!path) return;

        const key = normalizePath(path);
        set((state) => {
          const currentSession =
            state.projectSessions[key] || createDefaultProjectSession();
          return {
            projectSessions: {
              ...state.projectSessions,
              [key]: {
                ...currentSession,
                currentPhase: "analysis",
                phaseProgress: {
                  analysis: {
                    completed: false,
                    startedAt: null,
                    completedAt: null,
                  },
                  planning: {
                    completed: false,
                    startedAt: null,
                    completedAt: null,
                  },
                  solutioning: {
                    completed: false,
                    startedAt: null,
                    completedAt: null,
                  },
                  implementation: {
                    completed: false,
                    startedAt: null,
                    completedAt: null,
                  },
                },
              },
            },
          };
        });
      },

      // Wizard actions
      setWizardStep: (step) => set({ wizardStep: step }),

      // Show/hide setup wizard
      setShowSetupWizard: (show) => set({ showSetupWizard: show }),

      // Mark setup as complete
      completeSetup: () =>
        set({
          showSetupWizard: false,
          isSetupComplete: true,
        }),

      // Skip setup (user can still use but wizard won't show again)
      skipSetup: () =>
        set({
          showSetupWizard: false,
          isSetupComplete: "skipped",
        }),

      updateWizardData: (data) =>
        set((state) => ({
          wizardData: { ...state.wizardData, ...data },
        })),

      resetWizard: () =>
        set({
          wizardStep: 0,
          wizardData: {
            projectName: "",
            projectPath: "",
            selectedModules: ["core"],
            ideIntegrations: [],
            useExistingPrd: false,
            prdPath: "",
          },
        }),

      // Execute wizard setup
      executeWizardSetup: async () => {
        const {
          wizardData,
          installBmad,
          setActiveProject,
          loadProjectContext,
        } = get();

        // Clear any previous errors
        set({ installError: null });

        try {
          // Step 1: Install BMAD
          const installed = await installBmad({
            path: wizardData.projectPath,
            modules: wizardData.selectedModules,
          });

          if (!installed) {
            return { success: false, error: "BMAD installation failed" };
          }

          // Step 2: Configure IDE integrations
          if (window.electronAPI?.configureBmadIde) {
            for (const ide of wizardData.ideIntegrations) {
              await window.electronAPI.configureBmadIde(
                ide,
                wizardData.projectPath,
              );
            }
          }

          // Step 3: Import existing PRD if specified
          if (wizardData.useExistingPrd && wizardData.prdPath) {
            if (window.electronAPI?.copyFile) {
              const destPath = `${wizardData.projectPath}/_bmad-output/prd.md`;
              await window.electronAPI.copyFile(wizardData.prdPath, destPath);
            }
          }

          // Step 4: Set up project
          setActiveProject(wizardData.projectPath);
          await loadProjectContext(wizardData.projectPath);

          return { success: true };
        } catch (err) {
          return { success: false, error: err.message };
        }
      },
    }),
    {
      name: "bmad-store",
      version: 2, // Bump version to trigger migration
      partialize: (state) => ({
        activeProjectPath: state.activeProjectPath,
        projectSessions: state.projectSessions,
        isSetupComplete: state.isSetupComplete,
        showSetupWizard: state.showSetupWizard,
      }),
      migrate: (persistedState, version) => {
        // Migration from v1: ensure showSetupWizard is false if setup is complete
        if (version < 2) {
          return {
            ...persistedState,
            showSetupWizard: persistedState.isSetupComplete
              ? false
              : persistedState.showSetupWizard,
          };
        }
        return persistedState;
      },
    },
  ),
);

export default useBmadStore;
export { BMAD_PHASES, INSTALL_STATUS };
