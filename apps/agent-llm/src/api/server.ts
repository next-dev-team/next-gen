/**
 * LLM Chat API Server
 *
 * A modular HTTP API server for LLM chat functionality.
 * Supports multiple providers: Ollama, OpenAI-compatible, GPT4Free, Codex CLI.
 */

import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs/promises';

// Import modules
import type { ChatMessage, ProviderContext } from './types.js';
import { HOST, PORT, USE_HTTPS, SSL_KEY_PATH, SSL_CERT_PATH, G4F_API_URL } from './config.js';
import { json, notFound, readJson, asString, buildOpenAiUrl, fetchStatus } from './utils.js';
import {
  getProviderNames,
  hasProvider,
  runProvider,
  startG4fServer,
  stopG4fServer,
  getG4fStatus,
  registerProvider,
  unregisterProvider,
  getProviderConfig,
  getAllProviderConfigs,
  getStaticProviderNames,
  getDynamicProviderNames,
  initProviders,
  type OpenAiProviderConfig,
} from './providers/index.js';
import {
  handleListPilotAgents,
  handleGetPilotAgent,
  handleAnalyzeContent,
  handleGetChatInterfaces,
  BUILTIN_PILOT_AGENTS,
} from './pilot-agent.js';

// ====== API Handlers ======

/**
 * Handle chat completion requests
 */
async function handleChat(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const body = await readJson(req);
  const provider = asString(body.provider);
  const rawMessages = Array.isArray(body.messages) ? body.messages : [];

  if (!provider) {
    json(res, 400, { ok: false, error: 'Missing provider' });
    return;
  }

  if (!hasProvider(provider)) {
    json(res, 400, { ok: false, error: `Unknown provider: ${provider}` });
    return;
  }

  const messages: ChatMessage[] = rawMessages
    .filter((m: any) => m && typeof m.role === 'string' && typeof m.content === 'string')
    .map((m: any) => ({
      role: m.role as ChatMessage['role'],
      content: m.content,
    }));

  if (messages.length === 0) {
    json(res, 400, { ok: false, error: 'Missing or empty messages array' });
    return;
  }

  const ctx: ProviderContext = {
    messages,
    model: asString(body.model),
    baseUrl: asString(body.base_url),
    apiKey: asString(body.api_key),
    temperature: typeof body.temperature === 'number' ? body.temperature : undefined,
    maxTokens: typeof body.max_tokens === 'number' ? body.max_tokens : undefined,
    command: asString(body.command),
  };

  try {
    const result = await runProvider(provider, ctx);
    json(res, 200, { ok: true, text: result.text, usage: result.usage });
  } catch (err: any) {
    json(res, 500, { ok: false, error: err.message });
  }
}

/**
 * Handle model listing requests
 */
async function handleModels(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${HOST}:${PORT}`);
  const provider = url.searchParams.get('provider');
  const baseUrl = url.searchParams.get('base_url');

  try {
    if (provider === 'ollama' && baseUrl) {
      const base = baseUrl.replace(/\/+$/, '');
      const response = await fetch(`${base}/api/tags`);
      const data = (await response.json()) as any;
      const models = (data.models || []).map((m: any) => m.name);
      json(res, 200, { ok: true, models });
      return;
    }

    if (provider === 'openai_compatible' && baseUrl) {
      const apiKey = url.searchParams.get('api_key');
      const modelsUrl = buildOpenAiUrl(baseUrl, '/models');
      const headers: Record<string, string> = {};
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
      const response = await fetch(modelsUrl, { headers });
      const data = (await response.json()) as any;
      const models = (data.data || []).map((m: any) => m.id);
      json(res, 200, { ok: true, models });
      return;
    }

    if (provider === 'gpt4free') {
      const status = await fetchStatus(buildOpenAiUrl(G4F_API_URL, '/models'));
      if (status >= 200 && status < 400) {
        const response = await fetch(buildOpenAiUrl(G4F_API_URL, '/models'));
        const data = (await response.json()) as any;
        const models = (data.data || []).map((m: any) => m.id);
        json(res, 200, { ok: true, models });
        return;
      }
    }

    json(res, 400, { ok: false, error: 'Invalid provider or missing base_url' });
  } catch (err: any) {
    json(res, 500, { ok: false, error: err.message });
  }
}

// ====== Main Server ======

async function main(): Promise<void> {
  const requestHandler = async (req: http.IncomingMessage, res: http.ServerResponse) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'Content-Type, Authorization',
      });
      res.end();
      return;
    }

    try {
      const method = req.method ?? 'GET';
      const url = new URL(req.url ?? '/', `http://${HOST}:${PORT}`);

      // Health check
      if (method === 'GET' && url.pathname === '/api/health') {
        json(res, 200, { ok: true, version: '1.0.0' });
        return;
      }

      // Chat completions (main endpoint)
      if (method === 'POST' && url.pathname === '/api/chat') {
        await handleChat(req, res);
        return;
      }

      // OpenAI-compatible endpoint
      if (method === 'POST' && url.pathname === '/v1/chat/completions') {
        await handleChat(req, res);
        return;
      }

      // List models
      if (method === 'GET' && url.pathname === '/api/models') {
        await handleModels(req, res);
        return;
      }

      // Start gpt4free server
      if (method === 'POST' && url.pathname === '/api/gpt4free/connect') {
        try {
          // Check for force_update query param or body param
          const body =
            req.method === 'POST'
              ? await readJson(req).catch(() => ({}))
              : ({} as Record<string, unknown>);
          const forceUpdate =
            url.searchParams.get('force_update') === 'true' ||
            (body as { force_update?: boolean }).force_update === true;

          const result = await startG4fServer(forceUpdate);
          json(res, 200, {
            ok: true,
            wasAlreadyRunning: result.wasAlreadyRunning,
            wasDownloaded: result.wasDownloaded,
            message: result.wasAlreadyRunning
              ? 'GPT4Free server was already running'
              : result.wasDownloaded
                ? 'GPT4Free binary downloaded and server started'
                : 'GPT4Free server started (binary already installed)',
          });
        } catch (err: any) {
          json(res, 500, { ok: false, error: err.message });
        }
        return;
      }

      // Get GPT4Free status (check if installed without downloading)
      if (method === 'GET' && url.pathname === '/api/gpt4free/status') {
        try {
          const status = await getG4fStatus();
          json(res, 200, {
            ok: true,
            ...status,
          });
        } catch (err: any) {
          json(res, 500, { ok: false, error: err.message });
        }
        return;
      }

      // ====== Dynamic Provider Management ======

      // List all dynamic providers
      if (method === 'GET' && url.pathname === '/api/providers') {
        try {
          const configs = getAllProviderConfigs();
          json(res, 200, {
            ok: true,
            static: getStaticProviderNames(),
            dynamic: getDynamicProviderNames(),
            configs,
          });
        } catch (err: any) {
          json(res, 500, { ok: false, error: err.message });
        }
        return;
      }

      // Add a new dynamic provider
      if (method === 'POST' && url.pathname === '/api/providers') {
        try {
          const body = await readJson(req);
          const config: OpenAiProviderConfig = {
            name: asString(body.name) || '',
            baseUrl: asString(body.base_url) || asString(body.baseUrl) || '',
            defaultModel: asString(body.default_model) || asString(body.defaultModel),
            apiKey: asString(body.api_key) || asString(body.apiKey),
            models: Array.isArray(body.models)
              ? body.models.filter((m: any) => typeof m === 'string')
              : undefined,
            description: asString(body.description),
          };

          if (!config.name || !config.baseUrl) {
            json(res, 400, { ok: false, error: 'name and base_url (or baseUrl) are required' });
            return;
          }

          registerProvider(config);
          json(res, 201, { ok: true, message: `Provider '${config.name}' registered`, config });
        } catch (err: any) {
          json(res, 500, { ok: false, error: err.message });
        }
        return;
      }

      // Get a specific dynamic provider
      if (method === 'GET' && url.pathname.startsWith('/api/providers/')) {
        const name = url.pathname.replace('/api/providers/', '');
        if (name) {
          const config = getProviderConfig(name);
          if (config) {
            json(res, 200, { ok: true, config });
          } else {
            json(res, 404, { ok: false, error: `Provider '${name}' not found` });
          }
          return;
        }
      }

      // Delete a dynamic provider
      if (method === 'DELETE' && url.pathname.startsWith('/api/providers/')) {
        const name = url.pathname.replace('/api/providers/', '');
        if (name) {
          const removed = unregisterProvider(name);
          if (removed) {
            json(res, 200, { ok: true, message: `Provider '${name}' removed` });
          } else {
            json(res, 404, {
              ok: false,
              error: `Provider '${name}' not found or is a static provider`,
            });
          }
          return;
        }
      }

      // ====== Pilot Agent Endpoints ======

      // List all pilot agents
      if (method === 'GET' && url.pathname === '/api/pilot-agents') {
        await handleListPilotAgents(req, res);
        return;
      }

      // Get chat interface configurations
      if (method === 'GET' && url.pathname === '/api/pilot-agents/interfaces') {
        await handleGetChatInterfaces(req, res);
        return;
      }

      // Analyze content with AI
      if (method === 'POST' && url.pathname === '/api/pilot-agents/analyze') {
        await handleAnalyzeContent(req, res);
        return;
      }

      // Get specific pilot agent by ID
      if (method === 'GET' && url.pathname.startsWith('/api/pilot-agents/')) {
        const agentId = url.pathname.replace('/api/pilot-agents/', '');
        if (agentId && !agentId.includes('/')) {
          await handleGetPilotAgent(req, res, agentId);
          return;
        }
      }

      // API info
      if (method === 'GET' && url.pathname === '/') {
        json(res, 200, {
          name: 'LLM Chat API',
          version: '1.1.0',
          endpoints: {
            'POST /api/chat': 'Send chat messages to LLM',
            'POST /v1/chat/completions': 'OpenAI-compatible chat endpoint',
            'GET /api/models': 'List available models (requires provider & base_url params)',
            'GET /api/health': 'Health check',
            'GET /api/gpt4free/status': 'Check GPT4Free installation status',
            'POST /api/gpt4free/connect': 'Start gpt4free server (supports ?force_update=true)',
            'GET /api/providers': 'List all providers (static + dynamic)',
            'POST /api/providers': 'Add a new dynamic OpenAI-compatible provider',
            'GET /api/providers/:name': 'Get a specific dynamic provider config',
            'DELETE /api/providers/:name': 'Remove a dynamic provider',
            'GET /api/pilot-agents': 'List all Pilot Agents',
            'GET /api/pilot-agents/:id': 'Get a specific Pilot Agent',
            'GET /api/pilot-agents/interfaces': 'Get supported chat interface configurations',
            'POST /api/pilot-agents/analyze': 'Analyze web content with AI',
          },
          providers: {
            static: getStaticProviderNames(),
            dynamic: getDynamicProviderNames(),
            all: getProviderNames(),
          },
          pilotAgents: {
            count: BUILTIN_PILOT_AGENTS.length,
            agents: BUILTIN_PILOT_AGENTS.map((a) => ({ id: a.id, name: a.name })),
          },
        });
        return;
      }

      notFound(res);
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  let server: http.Server | https.Server;
  if (USE_HTTPS) {
    if (!SSL_KEY_PATH || !SSL_CERT_PATH) {
      throw new Error('HTTPS=1 requires SSL_KEY and SSL_CERT environment variables.');
    }
    const [key, cert] = await Promise.all([fs.readFile(SSL_KEY_PATH), fs.readFile(SSL_CERT_PATH)]);
    server = https.createServer({ key, cert }, requestHandler);
  } else {
    server = http.createServer(requestHandler);
  }

  const shutdown = async (): Promise<void> => {
    stopG4fServer();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  };

  process.on('SIGINT', () => void shutdown().then(() => process.exit(0)));
  process.on('SIGTERM', () => void shutdown().then(() => process.exit(0)));

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, HOST, resolve);
  });

  console.log(`LLM Chat API running: ${USE_HTTPS ? 'https' : 'http'}://${HOST}:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST /api/chat - Chat with LLM`);
  console.log(`  POST /v1/chat/completions - OpenAI-compatible`);
  console.log(`  GET  /api/models - List models`);
  console.log(`  GET  /api/health - Health check`);
  console.log(`\nProviders: ${getProviderNames().join(', ')}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
