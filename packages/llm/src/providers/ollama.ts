/**
 * Ollama Provider
 *
 * Connects to local Ollama server for LLM inference.
 */

import type { ChatMessage, ProviderContext, ProviderResult } from "../types.js";
import { prepareMessages } from "../memory/conversation.js";

interface OllamaParams {
  baseUrl: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
}

/**
 * Run inference on Ollama
 */
export async function runOllama(params: OllamaParams): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const base = params.baseUrl.replace(/\/+$/, "");
    const url = `${base}/api/chat`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        stream: false,
        options: {
          temperature: params.temperature ?? 0.7,
        },
      }),
      signal: controller.signal,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${url}\n${text}`);
    }

    const json = JSON.parse(text) as any;
    const response = json?.message?.content;
    if (typeof response !== "string" || !response.trim()) {
      throw new Error("Ollama response missing message content");
    }
    return response.trim();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Ollama provider handler
 */
export async function handleOllama(
  ctx: ProviderContext,
): Promise<ProviderResult> {
  if (!ctx.baseUrl) {
    throw new Error("Missing base_url for ollama");
  }
  if (!ctx.model) {
    throw new Error("Missing model for ollama");
  }

  // Optimize messages for context window
  const optimizedMessages = prepareMessages(ctx.messages, "ollama");

  const text = await runOllama({
    baseUrl: ctx.baseUrl,
    model: ctx.model,
    messages: optimizedMessages,
    temperature: ctx.temperature,
  });

  return { text };
}
