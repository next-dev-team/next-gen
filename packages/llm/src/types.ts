/**
 * Shared type definitions for LLM Chat API
 */

export type JsonRecord = Record<string, unknown>;

/**
 * Chat message format (OpenAI-compatible)
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Supported LLM providers
 */
export type LlmProvider =
  | "ollama"
  | "openai_compatible"
  | "gpt4free"
  | "codex"
  | "command";

/**
 * Chat request body
 */
export interface ChatRequest {
  provider: LlmProvider;
  messages: ChatMessage[];
  model?: string;
  base_url?: string;
  api_key?: string;
  command?: string;
  temperature?: number;
  max_tokens?: number;
}

/**
 * Chat response format
 */
export interface ChatResponse {
  ok: boolean;
  text?: string;
  error?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

/**
 * Provider handler function signature
 */
export interface ProviderContext {
  messages: ChatMessage[];
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  command?: string;
}

export interface ProviderResult {
  text: string;
  usage?: ChatResponse["usage"];
}

export type ProviderHandler = (ctx: ProviderContext) => Promise<ProviderResult>;

/**
 * Story-level conversation context for BMAD workflow
 */
export interface StoryAgentContext {
  storyId: string;
  projectId?: string;
  conversations: Conversation[];
  lastAgent: BmadAgentId;
  contextSnapshot?: {
    prdHash?: string;
    architectureHash?: string;
    generatedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  agent: BmadAgentId;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

/**
 * BMAD Agent identifiers
 */
export type BmadAgentId =
  | "analyst"
  | "pm"
  | "ux-designer"
  | "architect"
  | "sm"
  | "dev"
  | "tech-writer"
  | "tea"
  | "quick-flow-solo-dev"
  | "bmad-master";

/**
 * Project context for AI-powered operations
 */
export interface ProjectContext {
  prd?: string;
  prdSummary?: string;
  architecture?: string;
  existingEpics?: EpicSummary[];
  existingStories?: StorySummary[];
  customContext?: string;
}

export interface EpicSummary {
  id: string;
  name: string;
  status: string;
  storyCount: number;
}

export interface StorySummary {
  id: string;
  title: string;
  status: string;
  epicId?: string;
  points?: number;
}
