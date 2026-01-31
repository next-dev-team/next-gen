/**
 * Conversation Memory with Token Optimization
 *
 * Provides sliding window memory management for LLM conversations
 * using gpt-tokenizer for accurate token counting.
 */

import { encode } from 'gpt-tokenizer';
import type { ChatMessage } from './types.js';
import { CONTEXT_TOKEN_LIMITS, DEFAULT_MAX_CONTEXT_TOKENS } from './config.js';

/**
 * Count tokens for a message using gpt-tokenizer
 */
export function countMessageTokens(message: ChatMessage): number {
  // Each message has overhead for role and formatting (~4 tokens)
  const contentTokens = encode(message.content).length;
  return contentTokens + 4;
}

/**
 * Count total tokens for an array of messages
 */
export function countTotalTokens(messages: ChatMessage[]): number {
  return messages.reduce((total, msg) => total + countMessageTokens(msg), 0);
}

/**
 * Optimize messages to fit within token limit using sliding window.
 *
 * Always keeps:
 * - All system messages (for instructions)
 * - Most recent messages (prioritized)
 *
 * @param messages - Array of chat messages
 * @param maxTokens - Maximum tokens allowed (default from config)
 * @returns Optimized messages array that fits within token limit
 */
export function optimizeMessagesForContext(
  messages: ChatMessage[],
  maxTokens: number = DEFAULT_MAX_CONTEXT_TOKENS,
): ChatMessage[] {
  // Separate system messages (always keep) from conversation
  const systemMessages = messages.filter((m) => m.role === 'system');
  const conversationMessages = messages.filter((m) => m.role !== 'system');

  // Count system message tokens
  const systemTokens = countTotalTokens(systemMessages);

  // Available budget for conversation after system messages
  const conversationBudget = maxTokens - systemTokens - 100; // Reserve 100 for formatting

  if (conversationBudget <= 0) {
    console.warn('[Memory] Token budget exceeded by system messages alone');
    return systemMessages;
  }

  // Build conversation from newest to oldest (sliding window)
  const optimizedConversation: ChatMessage[] = [];
  let usedTokens = 0;

  // Always include the last message (current user message)
  if (conversationMessages.length > 0) {
    const lastMessage = conversationMessages[conversationMessages.length - 1];
    usedTokens += countMessageTokens(lastMessage);
    optimizedConversation.unshift(lastMessage);
  }

  // Add older messages from newest to oldest until budget exhausted
  for (let i = conversationMessages.length - 2; i >= 0; i--) {
    const msg = conversationMessages[i];
    const msgTokens = countMessageTokens(msg);

    if (usedTokens + msgTokens <= conversationBudget) {
      usedTokens += msgTokens;
      optimizedConversation.unshift(msg);
    } else {
      const droppedCount = i + 1;
      console.log(`[Memory] Dropped ${droppedCount} oldest messages to fit context window`);
      break;
    }
  }

  return [...systemMessages, ...optimizedConversation];
}

/**
 * Format messages into a prompt string for CLI-based LLMs (like Codex)
 */
export function formatMessagesAsPrompt(messages: ChatMessage[]): string {
  const parts: string[] = [];

  // Add system messages as initial context
  const systemMessages = messages.filter((m) => m.role === 'system');
  if (systemMessages.length > 0) {
    parts.push('System Instructions:');
    parts.push(systemMessages.map((m) => m.content).join('\n'));
    parts.push('');
  }

  // Add conversation history (non-system messages)
  const conversationMessages = messages.filter((m) => m.role !== 'system');
  if (conversationMessages.length > 1) {
    parts.push('Conversation History:');
    for (const msg of conversationMessages.slice(0, -1)) {
      const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
      parts.push(`${roleLabel}: ${msg.content}`);
    }
    parts.push('');
  }

  // Add the current user message
  const lastMessage = conversationMessages[conversationMessages.length - 1];
  if (lastMessage) {
    parts.push('Current Message:');
    parts.push(lastMessage.content);
    parts.push('');
    parts.push(
      'Please respond to the current message, considering the conversation history above.',
    );
  }

  return parts.join('\n');
}

/**
 * Get token limit for a specific provider
 */
export function getProviderTokenLimit(provider: string): number {
  return CONTEXT_TOKEN_LIMITS[provider] ?? DEFAULT_MAX_CONTEXT_TOKENS;
}

/**
 * Prepare messages for a provider with automatic optimization
 */
export function prepareMessages(messages: ChatMessage[], provider: string): ChatMessage[] {
  const tokenLimit = getProviderTokenLimit(provider);
  return optimizeMessagesForContext(messages, tokenLimit);
}
