/**
 * BMAD Store - State management for BMAD Method workflow
 *
 * Manages BMAD phases, installation status, and project context.
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

/**
 * BMAD Store
 */
const useBmadStore = create(
  persist(
    (set, get) => ({
      // Installation state
      installStatus: INSTALL_STATUS.NOT_CHECKED,
      installError: null,
      bmadVersion: null,
      bmadPath: null,

      // Project state
      currentProject: null,
      projectPath: null,
      projectContext: {
        prd: null,
        prdPath: null,
        architecture: null,
        architecturePath: null,
        productBrief: null,
        productBriefPath: null,
      },

      // Workflow state
      currentPhase: "analysis",
      phaseProgress: {
        analysis: { completed: false, startedAt: null, completedAt: null },
        planning: { completed: false, startedAt: null, completedAt: null },
        solutioning: { completed: false, startedAt: null, completedAt: null },
        implementation: {
          completed: false,
          startedAt: null,
          completedAt: null,
        },
      },

      // Setup wizard state
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
      getCurrentPhase: () =>
        BMAD_PHASES.find((p) => p.id === get().currentPhase),
      getPhaseById: (id) => BMAD_PHASES.find((p) => p.id === id),

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

      // Project actions
      setProject: (projectPath, projectName) => {
        set({
          currentProject: projectName,
          projectPath,
        });
      },

      loadProjectContext: async () => {
        const { projectPath } = get();
        if (!projectPath) return;

        try {
          // Load context files via electronAPI
          if (window.electronAPI?.readFile) {
            const bmadOutput = `${projectPath}/_bmad-output`;

            // Try to load PRD
            try {
              const prd = await window.electronAPI.readFile(
                `${bmadOutput}/prd.md`,
              );
              set((state) => ({
                projectContext: {
                  ...state.projectContext,
                  prd,
                  prdPath: `${bmadOutput}/prd.md`,
                },
              }));
            } catch {
              // PRD doesn't exist yet
            }

            // Try to load Architecture
            try {
              const arch = await window.electronAPI.readFile(
                `${bmadOutput}/architecture.md`,
              );
              set((state) => ({
                projectContext: {
                  ...state.projectContext,
                  architecture: arch,
                  architecturePath: `${bmadOutput}/architecture.md`,
                },
              }));
            } catch {
              // Architecture doesn't exist yet
            }

            // Try to load Product Brief
            try {
              const brief = await window.electronAPI.readFile(
                `${bmadOutput}/product-brief.md`,
              );
              set((state) => ({
                projectContext: {
                  ...state.projectContext,
                  productBrief: brief,
                  productBriefPath: `${bmadOutput}/product-brief.md`,
                },
              }));
            } catch {
              // Brief doesn't exist yet
            }
          }
        } catch (err) {
          console.error("Failed to load project context:", err);
        }
      },

      saveProjectContext: async (type, content) => {
        const { projectPath } = get();
        if (!projectPath) return false;

        const bmadOutput = `${projectPath}/_bmad-output`;
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
            set((state) => ({
              projectContext: {
                ...state.projectContext,
                [type]: content,
                [`${type}Path`]: filePath,
              },
            }));
            return true;
          }
          return false;
        } catch (err) {
          console.error(`Failed to save ${type}:`, err);
          return false;
        }
      },

      // Phase actions
      setCurrentPhase: (phaseId) => {
        const phase = BMAD_PHASES.find((p) => p.id === phaseId);
        if (phase) {
          set({ currentPhase: phaseId });

          // Mark phase as started if not already
          const progress = get().phaseProgress[phaseId];
          if (!progress.startedAt) {
            set((state) => ({
              phaseProgress: {
                ...state.phaseProgress,
                [phaseId]: {
                  ...progress,
                  startedAt: new Date().toISOString(),
                },
              },
            }));
          }
        }
      },

      completePhase: (phaseId) => {
        set((state) => ({
          phaseProgress: {
            ...state.phaseProgress,
            [phaseId]: {
              ...state.phaseProgress[phaseId],
              completed: true,
              completedAt: new Date().toISOString(),
            },
          },
        }));

        // Auto-advance to next phase
        const currentIndex = BMAD_PHASES.findIndex((p) => p.id === phaseId);
        if (currentIndex < BMAD_PHASES.length - 1) {
          get().setCurrentPhase(BMAD_PHASES[currentIndex + 1].id);
        }
      },

      resetPhaseProgress: () => {
        set({
          currentPhase: "analysis",
          phaseProgress: {
            analysis: { completed: false, startedAt: null, completedAt: null },
            planning: { completed: false, startedAt: null, completedAt: null },
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
        const { wizardData, installBmad } = get();

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
          get().setProject(wizardData.projectPath, wizardData.projectName);
          await get().loadProjectContext();

          return { success: true };
        } catch (err) {
          return { success: false, error: err.message };
        }
      },
    }),
    {
      name: "bmad-store",
      partialize: (state) => ({
        currentProject: state.currentProject,
        projectPath: state.projectPath,
        currentPhase: state.currentPhase,
        phaseProgress: state.phaseProgress,
      }),
    },
  ),
);

export default useBmadStore;
export { BMAD_PHASES, INSTALL_STATUS };
