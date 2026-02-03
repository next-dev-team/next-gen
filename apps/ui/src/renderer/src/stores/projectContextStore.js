/**
 * Project Context Store - Manages project-scoped context for LLM chat
 *
 * Provides:
 * - Active project tracking
 * - Project file indexing (AGENTS.md, Skills, PRD, etc.)
 * - Context building for LLM prompts
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Document types for context
const CONTEXT_TYPES = {
  AGENT_RULES: "agent_rules", // AGENTS.md, CLAUDE.md, etc.
  SKILLS: "skills", // Skills/*.md
  PRD: "prd", // _bmad-output/prd.md
  BMAD_AGENTS: "bmad_agents", // _bmad/bmm/agents/*.md
  IDE_RULES: "ide_rules", // .cursorrules, .windsurfrules, etc.
};

// Default project context state
const createDefaultContext = () => ({
  agentRules: null, // Content of AGENTS.md
  skills: [], // Array of { name, path, content }
  prd: null, // PRD document content
  bmadAgents: [], // Array of { id, name, content }
  ideRules: null, // IDE-specific rules
  lastIndexed: null, // Timestamp of last indexing
});

const useProjectContextStore = create(
  persist(
    (set, get) => ({
      // Active project path
      activeProject: null,

      // Project context cache (keyed by project path)
      projectContexts: {},

      // Loading state
      isIndexing: false,
      indexError: null,

      // Get context for active project
      getActiveContext: () => {
        const { activeProject, projectContexts } = get();
        if (!activeProject) return createDefaultContext();
        return projectContexts[activeProject] || createDefaultContext();
      },

      // Set active project and trigger indexing if needed
      setActiveProject: async (projectPath) => {
        // Validate projectPath is a string
        if (!projectPath || typeof projectPath !== "string") {
          console.warn("[ProjectContext] Invalid projectPath:", projectPath);
          set({ activeProject: null });
          return;
        }

        const normalizedPath = projectPath.replace(/\\/g, "/");
        set({ activeProject: normalizedPath });

        // Check if we need to index
        const { projectContexts } = get();
        const existing = projectContexts[normalizedPath];
        const needsIndexing =
          !existing ||
          !existing.lastIndexed ||
          Date.now() - existing.lastIndexed > 5 * 60 * 1000; // Re-index if older than 5 min

        if (needsIndexing) {
          await get().indexProject(normalizedPath);
        }
      },

      // Index project files
      indexProject: async (projectPath) => {
        // Validate projectPath is a string
        if (!projectPath || typeof projectPath !== "string") {
          console.warn(
            "[ProjectContext] indexProject: Invalid projectPath:",
            projectPath,
          );
          return;
        }

        if (!window.electronAPI?.fs) {
          console.warn("[ProjectContext] No file system access");
          return;
        }

        set({ isIndexing: true, indexError: null });

        try {
          const context = createDefaultContext();
          const fs = window.electronAPI.fs;

          // Index AGENTS.md
          const agentsPath = `${projectPath}/AGENTS.md`;
          try {
            const agentsContent = await fs.readFile(agentsPath, "utf-8");
            if (agentsContent) {
              context.agentRules = agentsContent;
            }
          } catch {
            // Try CLAUDE.md as fallback
            try {
              const claudeContent = await fs.readFile(
                `${projectPath}/CLAUDE.md`,
                "utf-8",
              );
              if (claudeContent) {
                context.agentRules = claudeContent;
              }
            } catch {
              // No agent rules found
            }
          }

          // Index PRD
          const prdPaths = [
            `${projectPath}/_bmad-output/prd.md`,
            `${projectPath}/_bmad-output/PRD.md`,
            `${projectPath}/docs/PRD.md`,
          ];
          for (const prdPath of prdPaths) {
            try {
              const prdContent = await fs.readFile(prdPath, "utf-8");
              if (prdContent) {
                context.prd = prdContent;
                break;
              }
            } catch {
              // Try next path
            }
          }

          // Index skills directory
          const skillsDir = `${projectPath}/skills`;
          try {
            const skillFiles = await fs.readdir(skillsDir);
            const skills = [];
            for (const file of skillFiles) {
              if (file.endsWith(".md")) {
                try {
                  const content = await fs.readFile(
                    `${skillsDir}/${file}`,
                    "utf-8",
                  );
                  skills.push({
                    name: file.replace(".md", ""),
                    path: `${skillsDir}/${file}`,
                    content: content.substring(0, 2000), // Truncate for context
                  });
                } catch {
                  // Skip unreadable file
                }
              }
            }
            context.skills = skills;
          } catch {
            // Skills directory doesn't exist
          }

          // Index BMAD agents
          const bmadAgentsDir = `${projectPath}/_bmad/bmm/agents`;
          try {
            const agentFiles = await fs.readdir(bmadAgentsDir);
            const agents = [];
            for (const file of agentFiles) {
              if (file.endsWith(".md")) {
                try {
                  const content = await fs.readFile(
                    `${bmadAgentsDir}/${file}`,
                    "utf-8",
                  );
                  agents.push({
                    id: file.replace(".md", ""),
                    name: file.replace(".md", ""),
                    content: content.substring(0, 5000), // Keep full persona (was 1500)
                  });
                } catch {
                  // Skip unreadable file
                }
              }
            }
            context.bmadAgents = agents;
          } catch {
            // BMAD agents directory doesn't exist
          }

          // Index IDE rules
          const ideRuleFiles = [
            ".cursorrules",
            ".windsurfrules",
            ".clinerules",
          ];
          for (const ruleFile of ideRuleFiles) {
            try {
              const content = await fs.readFile(
                `${projectPath}/${ruleFile}`,
                "utf-8",
              );
              if (content) {
                context.ideRules = content;
                break;
              }
            } catch {
              // Try next rule file
            }
          }

          context.lastIndexed = Date.now();

          // Update project contexts
          set((state) => ({
            projectContexts: {
              ...state.projectContexts,
              [projectPath]: context,
            },
            isIndexing: false,
          }));

          console.log(
            `[ProjectContext] Indexed project: ${projectPath}`,
            context,
          );
        } catch (error) {
          console.error("[ProjectContext] Indexing failed:", error);
          set({ isIndexing: false, indexError: error.message });
        }
      },

      // Build context prompt for LLM
      buildContextPrompt: (options = {}) => {
        const context = get().getActiveContext();
        const {
          maxTokens = 6000,
          includeSkills = true,
          includePrd = true,
          agentId = null, // Pass agent ID to include their full prompt
        } = options;

        const parts = [];
        let currentLength = 0;

        // Add BMAD agent prompt if matching agent found
        if (agentId && context.bmadAgents.length > 0) {
          const matchingAgent = context.bmadAgents.find(
            (a) =>
              a.id === agentId ||
              a.name.toLowerCase().includes(agentId.toLowerCase()),
          );
          if (matchingAgent && matchingAgent.content) {
            // Extract persona from agent content
            const content = matchingAgent.content;
            parts.push(
              `## Your Agent Role\n` +
                `You are embodying the ${matchingAgent.name} agent from the BMAD Method.\n\n` +
                `${content.substring(0, 3000)}`,
            );
            currentLength += 3000;
          }
        }

        // Add IDE rules (often contain project-specific coding guidelines)
        if (context.ideRules && currentLength < maxTokens * 4) {
          const truncated = context.ideRules.substring(0, 2000);
          parts.push("## Project Coding Guidelines\n" + truncated);
          currentLength += truncated.length;
        }

        // Add agent rules (AGENTS.md)
        if (context.agentRules && currentLength < maxTokens * 4) {
          const truncated = context.agentRules.substring(0, 2000);
          parts.push("## Project Agent Rules (from AGENTS.md)\n" + truncated);
          currentLength += truncated.length;
        }

        // Add PRD (full content if available, this is critical context)
        if (includePrd && context.prd && currentLength < maxTokens * 4) {
          const truncated = context.prd.substring(0, 4000);
          parts.push("## Product Requirements Document (PRD)\n" + truncated);
          currentLength += truncated.length;
        }

        // Add skills with more content
        if (
          includeSkills &&
          context.skills.length > 0 &&
          currentLength < maxTokens * 4
        ) {
          const skillsContent = context.skills
            .map((s) => `### Skill: ${s.name}\n${s.content.substring(0, 500)}`)
            .join("\n\n");
          parts.push("## Available Skills\n" + skillsContent);
        }

        // Add instruction for using context
        if (parts.length > 0) {
          parts.push(
            "\n## Instructions\n" +
              "- Use the above project context to provide relevant, accurate answers\n" +
              "- Reference specific parts of the PRD, skills, or guidelines when applicable\n" +
              "- If you need information not in the context, ask the user\n" +
              "- Stay in character with your agent role throughout the conversation",
          );
        }

        return parts.join("\n\n");
      },

      // Get specific agent's full prompt content
      getAgentPrompt: (agentId) => {
        const context = get().getActiveContext();
        const agent = context.bmadAgents.find(
          (a) =>
            a.id === agentId ||
            a.name.toLowerCase().includes(agentId.toLowerCase()),
        );
        return agent ? agent.content : null;
      },

      // Get context stats
      getContextStats: () => {
        const context = get().getActiveContext();
        return {
          hasAgentRules: !!context.agentRules,
          hasPrd: !!context.prd,
          skillsCount: context.skills.length,
          bmadAgentsCount: context.bmadAgents.length,
          hasIdeRules: !!context.ideRules,
          lastIndexed: context.lastIndexed
            ? new Date(context.lastIndexed).toLocaleString()
            : null,
        };
      },

      // Clear context for a project
      clearProjectContext: (projectPath) => {
        set((state) => {
          const { [projectPath]: _, ...rest } = state.projectContexts;
          return { projectContexts: rest };
        });
      },

      // Force re-index current project
      reindexCurrentProject: async () => {
        const { activeProject } = get();
        if (activeProject) {
          await get().indexProject(activeProject);
        }
      },
    }),
    {
      name: "project-context-store",
      partialize: (state) => ({
        activeProject: state.activeProject,
        // Don't persist full contexts, re-index on load
      }),
    },
  ),
);

export default useProjectContextStore;
export { CONTEXT_TYPES };
