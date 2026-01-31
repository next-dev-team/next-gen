/**
 * Story Context Storage
 *
 * Provides persistence layer for story-level agent conversations.
 * Supports both in-memory storage (for web) and file-based storage (for Electron).
 */

import type {
  StoryAgentContext,
  Conversation,
  ChatMessage,
  BmadAgentId,
} from "../types.js";

/**
 * Generate unique ID
 */
const createId = (): string =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

/**
 * In-memory storage for story contexts (fallback when electron-store not available)
 */
const memoryStore = new Map<string, StoryAgentContext>();

/**
 * Create a new story agent context
 */
export function createStoryContext(
  storyId: string,
  agent: BmadAgentId,
): StoryAgentContext {
  const now = new Date().toISOString();
  return {
    storyId,
    conversations: [],
    lastAgent: agent,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a new conversation for an agent
 */
export function createConversation(agent: BmadAgentId): Conversation {
  const now = new Date().toISOString();
  return {
    id: createId(),
    agent,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Add a message to a conversation
 */
export function addMessageToConversation(
  conversation: Conversation,
  message: ChatMessage,
): Conversation {
  return {
    ...conversation,
    messages: [...conversation.messages, message],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Get or create conversation for an agent within a story context
 */
export function getOrCreateConversation(
  context: StoryAgentContext,
  agent: BmadAgentId,
): { context: StoryAgentContext; conversation: Conversation } {
  // Find existing conversation for this agent
  let conversation = context.conversations.find((c) => c.agent === agent);

  if (conversation) {
    return { context, conversation };
  }

  // Create new conversation
  conversation = createConversation(agent);
  const updatedContext: StoryAgentContext = {
    ...context,
    conversations: [...context.conversations, conversation],
    lastAgent: agent,
    updatedAt: new Date().toISOString(),
  };

  return { context: updatedContext, conversation };
}

/**
 * Save story context to storage
 */
export async function saveStoryContext(
  context: StoryAgentContext,
): Promise<void> {
  const key = `story-context-${context.storyId}`;

  // Try to use electron-store if available (will be injected by Electron main process)
  if (typeof window !== "undefined" && (window as any).electronAPI?.storeSet) {
    await (window as any).electronAPI.storeSet(key, context);
  } else {
    // Fallback to in-memory storage
    memoryStore.set(key, context);
  }
}

/**
 * Load story context from storage
 */
export async function loadStoryContext(
  storyId: string,
): Promise<StoryAgentContext | null> {
  const key = `story-context-${storyId}`;

  // Try to use electron-store if available
  if (typeof window !== "undefined" && (window as any).electronAPI?.storeGet) {
    const data = await (window as any).electronAPI.storeGet(key);
    return data as StoryAgentContext | null;
  }

  // Fallback to in-memory storage
  return memoryStore.get(key) || null;
}

/**
 * Delete story context from storage
 */
export async function deleteStoryContext(storyId: string): Promise<void> {
  const key = `story-context-${storyId}`;

  if (
    typeof window !== "undefined" &&
    (window as any).electronAPI?.storeDelete
  ) {
    await (window as any).electronAPI.storeDelete(key);
  } else {
    memoryStore.delete(key);
  }
}

/**
 * Get conversation history for a specific agent within a story
 */
export async function getAgentHistory(
  storyId: string,
  agent: BmadAgentId,
): Promise<ChatMessage[]> {
  const context = await loadStoryContext(storyId);
  if (!context) return [];

  const conversation = context.conversations.find((c) => c.agent === agent);
  return conversation?.messages || [];
}

/**
 * Append a message to a story's agent conversation
 */
export async function appendMessage(
  storyId: string,
  agent: BmadAgentId,
  message: ChatMessage,
): Promise<StoryAgentContext> {
  let context = await loadStoryContext(storyId);

  if (!context) {
    context = createStoryContext(storyId, agent);
  }

  const { context: updatedContext, conversation } = getOrCreateConversation(
    context,
    agent,
  );
  const updatedConversation = addMessageToConversation(conversation, message);

  const finalContext: StoryAgentContext = {
    ...updatedContext,
    conversations: updatedContext.conversations.map((c) =>
      c.id === updatedConversation.id ? updatedConversation : c,
    ),
    lastAgent: agent,
    updatedAt: new Date().toISOString(),
  };

  await saveStoryContext(finalContext);
  return finalContext;
}

/**
 * Clear all messages for a specific agent in a story
 */
export async function clearAgentHistory(
  storyId: string,
  agent: BmadAgentId,
): Promise<void> {
  const context = await loadStoryContext(storyId);
  if (!context) return;

  const updatedContext: StoryAgentContext = {
    ...context,
    conversations: context.conversations.filter((c) => c.agent !== agent),
    updatedAt: new Date().toISOString(),
  };

  await saveStoryContext(updatedContext);
}

/**
 * Get all story IDs that have context stored
 */
export function getAllStoredStoryIds(): string[] {
  // This is mainly for in-memory storage; electron-store would need different approach
  const ids: string[] = [];
  for (const key of memoryStore.keys()) {
    if (key.startsWith("story-context-")) {
      ids.push(key.replace("story-context-", ""));
    }
  }
  return ids;
}
