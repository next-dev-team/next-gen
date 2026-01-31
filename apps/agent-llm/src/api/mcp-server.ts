/**
 * LLM Chat MCP Server
 *
 * MCP server that provides LLM chat functionality as tools.
 * Can be used with any MCP-compatible client (Codex, Cursor, Claude, etc.)
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import http from 'node:http';
import https from 'node:https';

// ====== Types ======

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatResult {
  ok: boolean;
  text?: string;
  error?: string;
}

// ====== Utility Functions ======

async function proxyPost(
  url: string,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): Promise<{ status: number; data: any }> {
  const urlObj = new URL(url);
  const isHttps = urlObj.protocol === 'https:';
  const requester = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = requester.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      },
      (res) => {
        let resData = '';
        res.on('data', (chunk) => {
          resData += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(resData);
            resolve({ status: res.statusCode || 200, data: parsed });
          } catch {
            resolve({
              status: res.statusCode || 200,
              data: { error: resData },
            });
          }
        });
      },
    );
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

// ====== LLM Provider Functions ======

async function runOllama(params: {
  baseUrl: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
}): Promise<ChatResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  try {
    const base = params.baseUrl.replace(/\/+$/, '');
    const url = `${base}/api/chat`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
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
      return { ok: false, error: `HTTP ${res.status}: ${text}` };
    }

    const json = JSON.parse(text) as any;
    const response = json?.message?.content;
    if (typeof response !== 'string' || !response.trim()) {
      return { ok: false, error: 'Empty response from Ollama' };
    }
    return { ok: true, text: response.trim() };
  } catch (err: any) {
    return { ok: false, error: err.message };
  } finally {
    clearTimeout(timeout);
  }
}

async function runOpenAiCompatible(params: {
  baseUrl: string;
  model: string;
  messages: ChatMessage[];
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<ChatResult> {
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
      return { ok: false, error: `HTTP ${res.status}: ${text}` };
    }

    const json = JSON.parse(text) as any;
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      return { ok: false, error: 'Empty response from API' };
    }
    return { ok: true, text: content.trim() };
  } catch (err: any) {
    return { ok: false, error: err.message };
  } finally {
    clearTimeout(timeout);
  }
}

// ====== MCP Server ======

const server = new Server(
  {
    name: 'llm-chat',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
    instructions: `
LLM Chat MCP Server - Provides tools to chat with various LLM providers.

Available providers:
- ollama: Local Ollama server
- openai_compatible: Any OpenAI-compatible API (OpenAI, Azure, local proxies, etc.)

Use the chat tool to send messages and get responses.
    `.trim(),
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'chat',
        description: 'Send a chat message to an LLM provider and get a response.',
        inputSchema: {
          type: 'object',
          properties: {
            provider: {
              type: 'string',
              enum: ['ollama', 'openai_compatible'],
              description: 'LLM provider to use',
            },
            base_url: {
              type: 'string',
              description: 'Base URL for the provider (e.g., http://localhost:11434 for Ollama)',
            },
            model: {
              type: 'string',
              description: 'Model name to use',
            },
            messages: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  role: {
                    type: 'string',
                    enum: ['system', 'user', 'assistant'],
                  },
                  content: {
                    type: 'string',
                  },
                },
                required: ['role', 'content'],
              },
              description: 'Array of chat messages',
            },
            api_key: {
              type: 'string',
              description: 'API key (for openai_compatible)',
            },
            temperature: {
              type: 'number',
              description: 'Temperature for generation (0.0 to 2.0, default 0.7)',
            },
            max_tokens: {
              type: 'number',
              description: 'Maximum tokens to generate',
            },
          },
          required: ['provider', 'base_url', 'model', 'messages'],
          additionalProperties: false,
        },
      },
      {
        name: 'quick_chat',
        description:
          'Send a simple text prompt to an LLM and get a response. Easier than full chat tool.',
        inputSchema: {
          type: 'object',
          properties: {
            provider: {
              type: 'string',
              enum: ['ollama', 'openai_compatible'],
              description: 'LLM provider to use',
            },
            base_url: {
              type: 'string',
              description: 'Base URL for the provider',
            },
            model: {
              type: 'string',
              description: 'Model name to use',
            },
            prompt: {
              type: 'string',
              description: 'The prompt to send',
            },
            system_prompt: {
              type: 'string',
              description: 'Optional system prompt to set context',
            },
            api_key: {
              type: 'string',
              description: 'API key (for openai_compatible)',
            },
          },
          required: ['provider', 'base_url', 'model', 'prompt'],
          additionalProperties: false,
        },
      },
      {
        name: 'list_ollama_models',
        description: 'List available models from an Ollama server.',
        inputSchema: {
          type: 'object',
          properties: {
            base_url: {
              type: 'string',
              description: 'Ollama server URL (default: http://localhost:11434)',
            },
          },
          additionalProperties: false,
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'chat') {
    const provider = (args?.provider as string) ?? '';
    const baseUrl = (args?.base_url as string) ?? '';
    const model = (args?.model as string) ?? '';
    const rawMessages = Array.isArray(args?.messages) ? args.messages : [];
    const apiKey = (args?.api_key as string) ?? undefined;
    const temperature = typeof args?.temperature === 'number' ? args.temperature : undefined;
    const maxTokens = typeof args?.max_tokens === 'number' ? args.max_tokens : undefined;

    const messages: ChatMessage[] = rawMessages
      .filter((m: any) => m && typeof m.role === 'string' && typeof m.content === 'string')
      .map((m: any) => ({
        role: m.role as ChatMessage['role'],
        content: m.content,
      }));

    if (!provider || !baseUrl || !model || messages.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ok: false,
              error: 'Missing required parameters: provider, base_url, model, and messages',
            }),
          },
        ],
      };
    }

    let result: ChatResult;

    if (provider === 'ollama') {
      result = await runOllama({ baseUrl, model, messages, temperature });
    } else if (provider === 'openai_compatible') {
      result = await runOpenAiCompatible({
        baseUrl,
        model,
        messages,
        apiKey,
        temperature,
        maxTokens,
      });
    } else {
      result = { ok: false, error: `Unknown provider: ${provider}` };
    }

    return {
      content: [
        {
          type: 'text',
          text: result.ok ? result.text! : JSON.stringify(result),
        },
      ],
    };
  }

  if (name === 'quick_chat') {
    const provider = (args?.provider as string) ?? '';
    const baseUrl = (args?.base_url as string) ?? '';
    const model = (args?.model as string) ?? '';
    const prompt = (args?.prompt as string) ?? '';
    const systemPrompt = (args?.system_prompt as string) ?? undefined;
    const apiKey = (args?.api_key as string) ?? undefined;

    if (!provider || !baseUrl || !model || !prompt) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ok: false,
              error: 'Missing required parameters: provider, base_url, model, and prompt',
            }),
          },
        ],
      };
    }

    const messages: ChatMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    let result: ChatResult;

    if (provider === 'ollama') {
      result = await runOllama({ baseUrl, model, messages });
    } else if (provider === 'openai_compatible') {
      result = await runOpenAiCompatible({ baseUrl, model, messages, apiKey });
    } else {
      result = { ok: false, error: `Unknown provider: ${provider}` };
    }

    return {
      content: [
        {
          type: 'text',
          text: result.ok ? result.text! : JSON.stringify(result),
        },
      ],
    };
  }

  if (name === 'list_ollama_models') {
    const baseUrl = (args?.base_url as string) || 'http://localhost:11434';
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const base = baseUrl.replace(/\/+$/, '');
      const response = await fetch(`${base}/api/tags`, { signal: controller.signal });
      clearTimeout(timeout);

      const data = (await response.json()) as any;
      const models = (data.models || []).map((m: any) => ({
        name: m.name,
        size: m.size,
        modified: m.modified_at,
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ok: true, models }, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ok: false, error: err.message }),
          },
        ],
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('MCP server error:', error);
  process.exit(1);
});
