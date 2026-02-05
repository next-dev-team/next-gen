/**
 * Project Context Store - The "Brain" of the application
 *
 * v1.0.2: Enhanced with RAG (Retrieval Augmented Generation)
 *
 * Provides:
 * - Active project tracking
 * - Project file indexing (AGENTS.md, Skills, PRD, etc.)
 * - RAG integration for semantic search
 * - Automatic indexing of kanban changes
 * - Context building for LLM prompts with retrieved knowledge
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  RAGServiceProxy as RAGService,
  DOC_TYPES_PROXY as DOC_TYPES,
} from "../services/ragServiceWrapper";

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

      // RAG state
      ragInitialized: false,
      ragStats: null,

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

        // Initialize RAG for this project
        try {
          await RAGService.initialize(normalizedPath);
          set({ ragInitialized: true, ragStats: RAGService.getStats() });
        } catch (err) {
          console.error("[ProjectContext] RAG init failed:", err);
        }

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
              // Also index in RAG
              await RAGService.addDocument("agents-md", agentsContent, {
                type: DOC_TYPES.DOCUMENT,
                source: "AGENTS.md",
              });
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
                // Index in RAG
                await RAGService.indexPRD(prdContent, prdPath);
                break;
              }
            } catch {
              // Try next path
            }
          }

          // Index architecture
          const archPaths = [
            `${projectPath}/_bmad-output/architecture.md`,
            `${projectPath}/docs/architecture.md`,
          ];
          for (const archPath of archPaths) {
            try {
              const archContent = await fs.readFile(archPath, "utf-8");
              if (archContent) {
                await RAGService.indexArchitecture(archContent, archPath);
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
                  // Index in RAG
                  await RAGService.addDocument(`skill-${file}`, content, {
                    type: DOC_TYPES.DOCUMENT,
                    source: `skills/${file}`,
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
              if (file.endsWith(".md") || file.endsWith(".yaml")) {
                try {
                  const content = await fs.readFile(
                    `${bmadAgentsDir}/${file}`,
                    "utf-8",
                  );
                  agents.push({
                    id: file.replace(/\.(md|yaml)$/, ""),
                    name: file.replace(/\.(md|yaml)$/, ""),
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
            ragStats: RAGService.getStats(),
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

      // =====================================================
      // RAG Integration Methods (NEW in v1.0.2)
      // =====================================================

      /**
       * Index kanban state into RAG
       * Called when kanban data changes
       */
      indexKanbanState: async (kanbanState) => {
        if (!kanbanState) return;

        try {
          await RAGService.reindexKanban(kanbanState);
          set({ ragStats: RAGService.getStats() });
          console.log("[ProjectContext] Kanban indexed in RAG");
        } catch (err) {
          console.error("[ProjectContext] Failed to index kanban:", err);
        }
      },

      /**
       * Index a single ticket (for incremental updates)
       */
      indexTicket: async (ticket) => {
        try {
          await RAGService.indexTicket(ticket);
          set({ ragStats: RAGService.getStats() });
        } catch (err) {
          console.error("[ProjectContext] Failed to index ticket:", err);
        }
      },

      /**
       * Index an important chat decision
       */
      indexChatDecision: async (message, agentId) => {
        try {
          await RAGService.indexChatDecision(message, agentId);
          set({ ragStats: RAGService.getStats() });
        } catch (err) {
          console.error("[ProjectContext] Failed to index chat:", err);
        }
      },

      /**
       * Query RAG for relevant context
       * @param {string} query - User query
       * @param {Object} options - Query options
       * @returns {Promise<string>} - Context string for LLM
       */
      queryRAG: async (query, options = {}) => {
        try {
          return await RAGService.buildContextForQuery(query, options);
        } catch (err) {
          console.error("[ProjectContext] RAG query failed:", err);
          return "";
        }
      },

      /**
       * Force full re-sync of RAG index
       * Called by "Sync All" button
       */
      syncAll: async () => {
        const { activeProject, indexProject } = get();
        if (!activeProject) return;

        set({ isIndexing: true });

        try {
          // Re-index project files
          await indexProject(activeProject);

          // Get kanban state and reindex
          // Note: Caller should also pass kanbanState for full sync

          set({
            isIndexing: false,
            ragStats: RAGService.getStats(),
          });

          console.log("[ProjectContext] Full sync complete");
        } catch (err) {
          console.error("[ProjectContext] Sync failed:", err);
          set({ isIndexing: false, indexError: err.message });
        }
      },

      /**
       * Get RAG statistics
       */
      getRAGStats: () => {
        return RAGService.getStats();
      },

      // =====================================================
      // Original Methods (maintained for compatibility)
      // =====================================================

      // Build context prompt for LLM (enhanced with RAG)
      buildContextPrompt: async (options = {}) => {
        const context = get().getActiveContext();
        const {
          maxTokens = 6000,
          includeSkills = true,
          includePrd = true,
          agentId = null, // Pass agent ID to include their full prompt
          userQuery = null, // NEW: User's question for RAG lookup
        } = options;

        const parts = [];
        let currentLength = 0;

        // NEW: Add RAG-retrieved context if we have a user query
        if (userQuery) {
          try {
            const ragContext = await RAGService.buildContextForQuery(
              userQuery,
              {
                maxTokens: 2000,
              },
            );
            if (ragContext) {
              parts.push(ragContext);
              currentLength += ragContext.length;
            }
          } catch (err) {
            console.warn("[ProjectContext] RAG lookup failed:", err);
          }
        }

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
        const ragStats = RAGService.getStats();

        return {
          hasAgentRules: !!context.agentRules,
          hasPrd: !!context.prd,
          skillsCount: context.skills.length,
          bmadAgentsCount: context.bmadAgents.length,
          hasIdeRules: !!context.ideRules,
          lastIndexed: context.lastIndexed
            ? new Date(context.lastIndexed).toLocaleString()
            : null,
          // RAG stats
          ragDocuments: ragStats.documentCount || 0,
          ragReady: ragStats.isInitialized && ragStats.embeddingReady,
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
