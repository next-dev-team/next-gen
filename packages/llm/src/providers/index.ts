/**
 * Provider Registry
 *
 * Central registry for all LLM providers with unified interface.
 * Supports dynamic OpenAI-compatible providers via registerProvider.
 */

import type {
  LlmProvider,
  ProviderHandler,
  ProviderContext,
  ProviderResult,
} from "../types.js";
import { handleOllama } from "./ollama.js";
import {
  handleOpenAiCompatible,
  handleDynamicOpenAiProvider,
  addOpenAiProvider,
  removeOpenAiProvider,
  getOpenAiProvider,
  getOpenAiProviders,
  getOpenAiProviderNames,
  hasOpenAiProvider,
  clearOpenAiProviders,
  initDefaultOpenAiProviders,
  type OpenAiProviderConfig,
} from "./openai.js";
import { handleCodex } from "./codex.js";
import {
  handleGpt4free,
  startG4fServer,
  stopG4fServer,
  getG4fStatus,
  isG4fInstalled,
} from "./gpt4free.js";
import { handleCommand } from "./command.js";

/**
 * Static provider registry - maps provider names to handlers
 */
const staticProviders: Record<LlmProvider, ProviderHandler> = {
  ollama: handleOllama,
  openai_compatible: handleOpenAiCompatible,
  codex: handleCodex,
  gpt4free: handleGpt4free,
  command: handleCommand,
};

/**
 * Get all registered provider names (static + dynamic)
 */
export function getProviderNames(): string[] {
  const staticNames = Object.keys(staticProviders) as LlmProvider[];
  const dynamicNames = getOpenAiProviderNames();
  return [...staticNames, ...dynamicNames];
}

/**
 * Get only static provider names
 */
export function getStaticProviderNames(): LlmProvider[] {
  return Object.keys(staticProviders) as LlmProvider[];
}

/**
 * Get only dynamic provider names
 */
export function getDynamicProviderNames(): string[] {
  return getOpenAiProviderNames();
}

/**
 * Check if a provider is registered (static or dynamic)
 */
export function hasProvider(name: string): boolean {
  return name in staticProviders || hasOpenAiProvider(name);
}

/**
 * Check if a provider is a static provider
 */
export function isStaticProvider(name: string): name is LlmProvider {
  return name in staticProviders;
}

/**
 * Check if a provider is a dynamic provider
 */
export function isDynamicProvider(name: string): boolean {
  return hasOpenAiProvider(name);
}

/**
 * Run inference with a provider (supports both static and dynamic providers)
 */
export async function runProvider(
  provider: string,
  ctx: ProviderContext,
): Promise<ProviderResult> {
  // First check if it's a dynamic provider
  if (hasOpenAiProvider(provider)) {
    return await handleDynamicOpenAiProvider(provider, ctx);
  }

  // Then check static providers
  const handler = staticProviders[provider as LlmProvider];
  if (!handler) {
    throw new Error(
      `Unknown provider: ${provider}. Available: ${getProviderNames().join(", ")}`,
    );
  }
  return await handler(ctx);
}

/**
 * Register a new dynamic OpenAI-compatible provider
 */
export function registerProvider(config: OpenAiProviderConfig): void {
  addOpenAiProvider(config);
}

/**
 * Unregister a dynamic provider
 */
export function unregisterProvider(name: string): boolean {
  return removeOpenAiProvider(name);
}

/**
 * Get a dynamic provider's configuration
 */
export function getProviderConfig(
  name: string,
): OpenAiProviderConfig | undefined {
  return getOpenAiProvider(name);
}

/**
 * Get all dynamic provider configurations
 */
export function getAllProviderConfigs(): Record<string, OpenAiProviderConfig> {
  return getOpenAiProviders();
}

/**
 * Initialize default dynamic providers
 */
export function initProviders(): void {
  initDefaultOpenAiProviders();
}

/**
 * Clear all dynamic providers
 */
export function clearDynamicProviders(): void {
  clearOpenAiProviders();
}

// Re-export GPT4Free server management for cleanup
export { startG4fServer, stopG4fServer, getG4fStatus, isG4fInstalled };

// Re-export dynamic provider management
export {
  addOpenAiProvider,
  removeOpenAiProvider,
  getOpenAiProvider,
  getOpenAiProviders,
  hasOpenAiProvider,
  type OpenAiProviderConfig,
};

// Re-export individual handlers for direct usage
export { handleOllama } from "./ollama.js";
export {
  handleOpenAiCompatible,
  handleDynamicOpenAiProvider,
} from "./openai.js";
export { handleCodex } from "./codex.js";
export { handleGpt4free } from "./gpt4free.js";
export { handleCommand } from "./command.js";
