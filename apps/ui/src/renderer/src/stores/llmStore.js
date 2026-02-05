/**
 * LLM Store - State management for LLM interactions
 *
 * Manages LLM providers, agent chat, and conversation history.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// BMAD Agent IDs
const BMAD_AGENT_IDS = [
  "analyst",
  "pm",
  "ux-designer",
  "architect",
  "sm",
  "dev",
  "tech-writer",
  "tea",
  "quick-flow-solo-dev",
  "bmad-master",
];

// Default providers with their configurations
// Synced with agent-llm package providers
const DEFAULT_PROVIDERS = {
  // Claude via Anthropic API (not the Codex CLI)
  codex: {
    name: "Codex (Claude)",
    baseUrl: "https://api.anthropic.com",
    models: [
      "claude-sonnet-4-20250514",
      "claude-3-5-sonnet-20241022",
      "claude-3-opus-20240229",
    ],
    defaultModel: "claude-sonnet-4-20250514",
    requiresApiKey: true,
    serverProviderType: "anthropic", // Maps to LLM server provider type
  },
  // Local Ollama
  ollama: {
    name: "Ollama",
    baseUrl: "http://localhost:11434",
    models: ["llama3.2", "llama3.1", "qwen2.5-coder", "deepseek-r1"],
    defaultModel: "llama3.2",
    requiresApiKey: false,
    serverProviderType: "ollama",
  },
  // OpenAI Official
  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    defaultModel: "gpt-4o",
    requiresApiKey: true,
    serverProviderType: "openai_compatible",
  },
  // Groq Cloud
  groq: {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai",
    models: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
    ],
    defaultModel: "llama-3.3-70b-versatile",
    requiresApiKey: true,
    serverProviderType: "openai_compatible",
  },
  // Together AI
  together: {
    name: "Together AI",
    baseUrl: "https://api.together.xyz",
    models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo"],
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    requiresApiKey: true,
    serverProviderType: "openai_compatible",
  },
  // OpenRouter
  openrouter: {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api",
    models: [
      "anthropic/claude-3.5-sonnet",
      "openai/gpt-4o",
      "google/gemini-pro-1.5",
    ],
    defaultModel: "anthropic/claude-3.5-sonnet",
    requiresApiKey: true,
    serverProviderType: "openai_compatible",
  },
  // GPT4Free (free, requires local server)
  gpt4free: {
    name: "GPT4Free (Free)",
    baseUrl: "http://127.0.0.1:1337",
    models: ["deepseek"],
    defaultModel: "gpt-4o",
    requiresApiKey: false,
    serverProviderType: "openai_compatible",
  },
};

// BMAD Agent definitions
const BMAD_AGENTS = {
  analyst: {
    id: "analyst",
    name: "Alex",
    icon: "🔍",
    title: "Business Analyst",
    description: "Brainstorming, research, and product brief creation",
    phase: "analysis",
  },
  pm: {
    id: "pm",
    name: "John",
    icon: "📋",
    title: "Product Manager",
    description: "PRD creation, project planning, and requirement definition",
    phase: "planning",
  },
  "ux-designer": {
    id: "ux-designer",
    name: "Maya",
    icon: "🎨",
    title: "UX Designer",
    description: "User experience design, wireframes, and user flows",
    phase: "planning",
  },
  architect: {
    id: "architect",
    name: "Sam",
    icon: "🏗️",
    title: "Solution Architect",
    description: "Solution architecture, tech specs, and system design",
    phase: "solutioning",
  },
  sm: {
    id: "sm",
    name: "Sarah",
    icon: "📊",
    title: "Scrum Master",
    description: "Sprint planning, story management, and team coordination",
    phase: "implementation",
  },
  dev: {
    id: "dev",
    name: "Devon",
    icon: "💻",
    title: "Senior Developer",
    description: "Story implementation, code review, and development",
    phase: "implementation",
  },
  "tech-writer": {
    id: "tech-writer",
    name: "Taylor",
    icon: "📝",
    title: "Technical Writer",
    description: "Documentation, project context, and technical writing",
    phase: "implementation",
  },
  tea: {
    id: "tea",
    name: "Terry",
    icon: "🧪",
    title: "Test Engineer",
    description: "Test planning, QA, and acceptance criteria validation",
    phase: "implementation",
  },
  "quick-flow-solo-dev": {
    id: "quick-flow-solo-dev",
    name: "Quinn",
    icon: "⚡",
    title: "Quick Flow (Solo Dev)",
    description: "Streamlined solo developer workflow for small projects",
    phase: "all",
  },
  "bmad-master": {
    id: "bmad-master",
    name: "BMAD",
    icon: "🎯",
    title: "BMAD Master Orchestrator",
    description: "Master orchestrator for multi-agent coordination",
    phase: "all",
  },
};

/**
 * LLM Store State
 */
const useLlmStore = create(
  persist(
    (set, get) => ({
      // Provider settings
      activeProvider: "codex",
      activeModel: "claude-sonnet-4-20250514",
      apiKeys: {}, // { providerId: apiKey }
      customProviders: {}, // User-added providers

      // Agent settings
      activeAgent: "pm",

      // Conversation state
      conversations: {}, // { storyId-agentId: messages[] }
      currentStoryId: null,

      // Loading states
      isLoading: false,
      error: null,

      // Provider management
      setActiveProvider: (providerId) => {
        const provider =
          DEFAULT_PROVIDERS[providerId] || get().customProviders[providerId];
        set({
          activeProvider: providerId,
          activeModel: provider?.defaultModel || null,
        });
      },

      setActiveModel: (model) => set({ activeModel: model }),

      setApiKey: (providerId, apiKey) =>
        set((state) => ({
          apiKeys: { ...state.apiKeys, [providerId]: apiKey },
        })),

      addCustomProvider: (config) =>
        set((state) => ({
          customProviders: { ...state.customProviders, [config.id]: config },
        })),

      removeCustomProvider: (providerId) =>
        set((state) => {
          const { [providerId]: removed, ...rest } = state.customProviders;
          return { customProviders: rest };
        }),

      // Agent management
      setActiveAgent: (agentId) => set({ activeAgent: agentId }),

      // Conversation management
      setCurrentStory: (storyId) => set({ currentStoryId: storyId }),

      getConversationKey: (storyId, agentId) => `${storyId}-${agentId}`,

      getConversation: (storyId, agentId) => {
        const key = get().getConversationKey(storyId, agentId);
        return get().conversations[key] || [];
      },

      addMessage: (storyId, agentId, message) =>
        set((state) => {
          const key = state.getConversationKey(storyId, agentId);
          const existing = state.conversations[key] || [];
          return {
            conversations: {
              ...state.conversations,
              [key]: [
                ...existing,
                { ...message, timestamp: new Date().toISOString() },
              ],
            },
          };
        }),

      clearConversation: (storyId, agentId) =>
        set((state) => {
          const key = state.getConversationKey(storyId, agentId);
          const { [key]: removed, ...rest } = state.conversations;
          return { conversations: rest };
        }),

      // LLM API calls
      sendMessage: async (storyId, agentId, userMessage, context = {}) => {
        const state = get();
        set({ isLoading: true, error: null });

        try {
          // Get current conversation
          const messages = state.getConversation(storyId, agentId);

          // Add user message to store
          state.addMessage(storyId, agentId, {
            role: "user",
            content: userMessage,
          });

          // Get provider config
          const provider =
            DEFAULT_PROVIDERS[state.activeProvider] ||
            state.customProviders[state.activeProvider];
          if (!provider) {
            throw new Error(`Unknown provider: ${state.activeProvider}`);
          }

          // Get API key if required
          const apiKey = provider.requiresApiKey
            ? state.apiKeys[state.activeProvider]
            : null;
          if (provider.requiresApiKey && !apiKey) {
            throw new Error(`API key required for ${provider.name}`);
          }

          // Build system prompt from agent
          const agent = BMAD_AGENTS[agentId];
          const systemMessage = {
            role: "system",
            content: `You are ${agent.name}, the ${agent.title}. ${agent.description}. 
${context.prd ? `\n## Project PRD:\n${context.prd}` : ""}
${context.architecture ? `\n## Architecture:\n${context.architecture}` : ""}
${context.storyContext ? `\n## Story Context:\n${context.storyContext}` : ""}`,
          };

          // Build request body - use serverProviderType from provider config
          const requestBody = {
            provider: provider.serverProviderType || "openai_compatible",
            messages: [
              systemMessage,
              ...messages,
              { role: "user", content: userMessage },
            ],
            model: state.activeModel,
            base_url: provider.baseUrl,
            ...(apiKey && { api_key: apiKey }),
            temperature: 0.7,
          };

          // Make API call (to our LLM server)
          const response = await fetch("http://127.0.0.1:3333/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          });

          const result = await response.json();

          if (!result.ok) {
            throw new Error(result.error || "LLM request failed");
          }

          // Add assistant response to store
          state.addMessage(storyId, agentId, {
            role: "assistant",
            content: result.text,
          });

          set({ isLoading: false });
          return result.text;
        } catch (err) {
          set({ isLoading: false, error: err.message });
          throw err;
        }
      },

      // Generate stories from PRD
      generateStories: async (prdContent, architectureContent = null) => {
        const state = get();
        set({ isLoading: true, error: null });

        try {
          const prompt = `Based on the following PRD, generate a set of user stories in JSON format.

## PRD:
${prdContent}

${architectureContent ? `## Architecture:\n${architectureContent}` : ""}

Generate user stories as a JSON array with this structure:
[
  {
    "title": "Clear, action-oriented title",
    "description": "As a [user], I want [feature] so that [benefit]",
    "acceptanceCriteria": ["Testable criterion 1", "Testable criterion 2"],
    "storyPoints": 3,
    "priority": "high",
    "epic": "Epic name",
    "technicalNotes": "Optional technical considerations"
  }
]

Focus on MVP features first. Each story should be completable in 1-3 days.
Return ONLY the JSON array, no other text.`;

          const provider =
            DEFAULT_PROVIDERS[state.activeProvider] ||
            state.customProviders[state.activeProvider];
          const apiKey = provider.requiresApiKey
            ? state.apiKeys[state.activeProvider]
            : null;

          const response = await fetch("http://127.0.0.1:3333/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: provider.serverProviderType || "openai_compatible",
              messages: [
                {
                  role: "system",
                  content:
                    "You are Sarah, the Scrum Master. Generate well-structured user stories.",
                },
                { role: "user", content: prompt },
              ],
              model: state.activeModel,
              base_url: provider.baseUrl,
              ...(apiKey && { api_key: apiKey }),
              temperature: 0.5,
            }),
          });

          const result = await response.json();

          if (!result.ok) {
            throw new Error(result.error || "Story generation failed");
          }

          // Parse JSON from response
          const jsonMatch = result.text.match(/\[[\s\S]*\]/);
          if (!jsonMatch) {
            throw new Error("Failed to parse stories from response");
          }

          const stories = JSON.parse(jsonMatch[0]);
          set({ isLoading: false });
          return stories;
        } catch (err) {
          set({ isLoading: false, error: err.message });
          throw err;
        }
      },

      // Getters
      getAvailableProviders: () => ({
        ...DEFAULT_PROVIDERS,
        ...get().customProviders,
      }),

      getAvailableAgents: () => BMAD_AGENTS,

      getAgentsByPhase: (phase) =>
        Object.values(BMAD_AGENTS).filter(
          (agent) => agent.phase === phase || agent.phase === "all",
        ),

      getCurrentProvider: () => {
        const state = get();
        return (
          DEFAULT_PROVIDERS[state.activeProvider] ||
          state.customProviders[state.activeProvider]
        );
      },

      getCurrentAgent: () => {
        return BMAD_AGENTS[get().activeAgent];
      },
    }),
    {
      name: "llm-store",
      partialize: (state) => ({
        activeProvider: state.activeProvider,
        activeModel: state.activeModel,
        apiKeys: state.apiKeys,
        customProviders: state.customProviders,
        activeAgent: state.activeAgent,
        conversations: state.conversations,
      }),
    },
  ),
);

export default useLlmStore;
