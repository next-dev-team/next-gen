/**
 * OpenAI-Compatible Provider
 *
 * Supports OpenAI, Azure, Claude, and other compatible APIs.
 * Features dynamic provider registry for adding multiple endpoints.
 */

import type { ChatMessage, ProviderContext, ProviderResult, ChatResponse } from '../types.js';
import { prepareMessages } from '../memory.js';

interface OpenAiParams {
  baseUrl: string;
  model: string;
  messages: ChatMessage[];
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Dynamic OpenAI-compatible provider configuration
 */
export interface OpenAiProviderConfig {
  name: string;
  baseUrl: string;
  defaultModel?: string;
  apiKey?: string;
  models?: string[];
  description?: string;
}

/**
 * Dynamic provider registry - stores all registered OpenAI-compatible providers
 */
const dynamicProviders: Record<string, OpenAiProviderConfig> = {};

/**
 * Add a new OpenAI-compatible provider dynamically
 */
export function addOpenAiProvider(config: OpenAiProviderConfig): void {
  if (!config.name || !config.baseUrl) {
    throw new Error('Provider name and baseUrl are required');
  }
  dynamicProviders[config.name] = { ...config };
}

/**
 * Remove a dynamic provider by name
 */
export function removeOpenAiProvider(name: string): boolean {
  if (name in dynamicProviders) {
    delete dynamicProviders[name];
    return true;
  }
  return false;
}

/**
 * Get a specific dynamic provider by name
 */
export function getOpenAiProvider(name: string): OpenAiProviderConfig | undefined {
  return dynamicProviders[name];
}

/**
 * Get all registered dynamic providers
 */
export function getOpenAiProviders(): Record<string, OpenAiProviderConfig> {
  return { ...dynamicProviders };
}

/**
 * Get list of all dynamic provider names
 */
export function getOpenAiProviderNames(): string[] {
  return Object.keys(dynamicProviders);
}

/**
 * Check if a dynamic provider exists
 */
export function hasOpenAiProvider(name: string): boolean {
  return name in dynamicProviders;
}

/**
 * Clear all dynamic providers
 */
export function clearOpenAiProviders(): void {
  for (const key of Object.keys(dynamicProviders)) {
    delete dynamicProviders[key];
  }
}

/**
 * Initialize with default providers
 */
export function initDefaultOpenAiProviders(): void {
  // OpenAI official
  addOpenAiProvider({
    name: 'openai',
    baseUrl: 'https://api.openai.com',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    description: 'OpenAI Official API',
  });

  // Groq
  addOpenAiProvider({
    name: 'groq',
    baseUrl: 'https://api.groq.com/openai',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    description: 'Groq Cloud - Ultra-fast inference',
  });

  // Together AI
  addOpenAiProvider({
    name: 'together',
    baseUrl: 'https://api.together.xyz',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
    description: 'Together AI - Open source models',
  });

  // OpenRouter
  addOpenAiProvider({
    name: 'openrouter',
    baseUrl: 'https://openrouter.ai/api',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    models: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'google/gemini-pro-1.5'],
    description: 'OpenRouter - Multi-provider gateway',
  });
}

/**
 * Run inference on OpenAI-compatible API
 */
export async function runOpenAiCompatible(
  params: OpenAiParams,
): Promise<{ text: string; usage?: ChatResponse['usage'] }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const base = params.baseUrl.replace(/\/+$/, '');
    const url = base.endsWith('/v1') ? `${base}/chat/completions` : `${base}/v1/chat/completions`;

    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (params.apiKey) {
      headers.authorization = `Bearer ${params.apiKey}`;
    }

    const body: any = {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
    };
    if (params.maxTokens) {
      body.max_tokens = params.maxTokens;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${url}\n${text}`);
    }

    const json = JSON.parse(text) as any;
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('OpenAI-compatible response missing choices[0].message.content');
    }
    return { text: content.trim(), usage: json?.usage };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * OpenAI-compatible provider handler
 */
export async function handleOpenAiCompatible(ctx: ProviderContext): Promise<ProviderResult> {
  if (!ctx.baseUrl) {
    throw new Error('Missing base_url for openai_compatible');
  }
  if (!ctx.model) {
    throw new Error('Missing model for openai_compatible');
  }

  // Optimize messages for context window
  const optimizedMessages = prepareMessages(ctx.messages, 'openai_compatible');

  const result = await runOpenAiCompatible({
    baseUrl: ctx.baseUrl,
    model: ctx.model,
    messages: optimizedMessages,
    apiKey: ctx.apiKey,
    temperature: ctx.temperature,
    maxTokens: ctx.maxTokens,
  });

  return { text: result.text, usage: result.usage };
}

/**
 * Extended context for dynamic providers (includes provider name)
 */
export interface DynamicProviderContext extends ProviderContext {
  providerName?: string;
}

/**
 * Handler for dynamic OpenAI-compatible providers
 * Uses the provider registry to look up configuration
 */
export async function handleDynamicOpenAiProvider(
  providerName: string,
  ctx: ProviderContext,
): Promise<ProviderResult> {
  const config = dynamicProviders[providerName];
  if (!config) {
    throw new Error(`Unknown dynamic provider: ${providerName}`);
  }

  // Use provider config as fallback for missing context values
  const baseUrl = ctx.baseUrl || config.baseUrl;
  const model = ctx.model || config.defaultModel;
  const apiKey = ctx.apiKey || config.apiKey;

  if (!baseUrl) {
    throw new Error(`Missing base_url for provider: ${providerName}`);
  }
  if (!model) {
    throw new Error(`Missing model for provider: ${providerName}`);
  }

  // Optimize messages for context window
  const optimizedMessages = prepareMessages(ctx.messages, 'openai_compatible');

  const result = await runOpenAiCompatible({
    baseUrl,
    model,
    messages: optimizedMessages,
    apiKey,
    temperature: ctx.temperature,
    maxTokens: ctx.maxTokens,
  });

  return { text: result.text, usage: result.usage };
}

/**
 * Create a handler function for a specific dynamic provider
 * Useful for registering in the provider registry
 */
export function createDynamicProviderHandler(
  providerName: string,
): (ctx: ProviderContext) => Promise<ProviderResult> {
  return (ctx: ProviderContext) => handleDynamicOpenAiProvider(providerName, ctx);
}
