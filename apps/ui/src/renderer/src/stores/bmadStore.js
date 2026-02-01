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

        try {
          if (window.electronAPI?.installBmad) {
            const result = await window.electronAPI.installBmad(options);
            if (result.success) {
              set({
                installStatus: INSTALL_STATUS.INSTALLED,
                bmadVersion: result.version,
                bmadPath: result.path,
              });
              return true;
            } else {
              throw new Error(result.error || "Installation failed");
            }
          }

          throw new Error(
            "BMAD installation not available in this environment",
          );
        } catch (err) {
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
        if (!path) return;

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
      partialize: (state) => ({
        activeProjectPath: state.activeProjectPath,
        projectSessions: state.projectSessions,
      }),
    },
  ),
);

export default useBmadStore;
export { BMAD_PHASES, INSTALL_STATUS };
