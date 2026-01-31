/**
 * LLM Server
 *
 * HTTP server wrapper for @nde/llm package.
 * Provides /api/chat endpoint for LLM inference.
 *
 * Port: 4444 (configurable via PORT env)
 */

const http = require("http");
const { spawn } = require("child_process");

const PORT = process.env.LLM_PORT || 4444;
const HOST = "127.0.0.1";

let server = null;
let logCallback = null;

function log(type, message) {
  console.log(`[LLM Server] ${message}`);
  if (logCallback) logCallback(type, message);
}

/**
 * Parse request body as JSON
 */
async function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (err) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

/**
 * Send JSON response
 */
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

/**
 * Run Ollama API call
 */
async function runOllama(model, messages, baseUrl = "http://localhost:11434") {
  const url = `${baseUrl}/api/chat`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.message?.content || "";
}

/**
 * Run OpenAI-compatible API call (works for OpenAI, Groq, Together, OpenRouter)
 */
async function runOpenAiCompatible(model, messages, baseUrl, apiKey) {
  const url = `${baseUrl}/v1/chat/completions`;

  const headers = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

/**
 * Run Anthropic Claude API call
 */
async function runClaude(model, messages, apiKey) {
  const url = "https://api.anthropic.com/v1/messages";

  // Separate system message from other messages
  const systemMessage = messages.find((m) => m.role === "system");
  const otherMessages = messages.filter((m) => m.role !== "system");

  const body = {
    model,
    max_tokens: 4096,
    messages: otherMessages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
  };

  if (systemMessage) {
    body.system = systemMessage.content;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // Extract text from content blocks
  const content = data.content || [];
  const textBlocks = content.filter((block) => block.type === "text");
  return textBlocks.map((block) => block.text).join("\n");
}

/**
 * Run Codex CLI
 */
async function runCodex(messages, model) {
  // Format messages as prompt
  const prompt =
    messages
      .map((m) => {
        if (m.role === "system") return `System: ${m.content}`;
        if (m.role === "user") return `User: ${m.content}`;
        if (m.role === "assistant") return `Assistant: ${m.content}`;
        return m.content;
      })
      .join("\n\n") + "\n\nAssistant:";

  return new Promise((resolve, reject) => {
    const args = ["exec"];
    if (model) args.push("-m", model);
    args.push("--color", "never", "--", "-");

    const child = spawn("codex", args, {
      stdio: ["pipe", "pipe", "pipe"],
      shell: process.platform === "win32",
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => (stdout += data.toString()));
    child.stderr.on("data", (data) => (stderr += data.toString()));

    child.on("error", (err) => {
      reject(
        new Error(
          `Codex not found: ${err.message}. Make sure 'codex' CLI is installed.`,
        ),
      );
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Codex failed (exit ${code}): ${stderr}`));
      } else {
        resolve(stdout.trim());
      }
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

/**
 * Handle /api/chat endpoint
 */
async function handleChat(req, res) {
  try {
    const body = await readBody(req);
    const { provider, messages, model, base_url, api_key, temperature } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return sendJson(res, 400, {
        ok: false,
        error: "Messages array is required",
      });
    }

    let text;

    switch (provider) {
      case "ollama":
        text = await runOllama(
          model || "llama3.2",
          messages,
          base_url || "http://localhost:11434",
        );
        break;

      case "codex":
        text = await runCodex(messages, model);
        break;

      case "anthropic":
      case "claude":
        if (!api_key) {
          return sendJson(res, 400, {
            ok: false,
            error: "API key required for Claude",
          });
        }
        text = await runClaude(
          model || "claude-sonnet-4-20250514",
          messages,
          api_key,
        );
        break;

      case "openai_compatible":
      default:
        // Default to OpenAI-compatible endpoint
        text = await runOpenAiCompatible(
          model || "gpt-4o",
          messages,
          base_url || "https://api.openai.com",
          api_key,
        );
        break;
    }

    sendJson(res, 200, { ok: true, text });
  } catch (err) {
    log("error", `Chat error: ${err.message}`);
    sendJson(res, 500, { ok: false, error: err.message });
  }
}

/**
 * Handle HTTP requests
 */
async function handleRequest(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${HOST}:${PORT}`);

  // Health check
  if (url.pathname === "/" || url.pathname === "/health") {
    return sendJson(res, 200, {
      ok: true,
      service: "LLM Server",
      version: "1.0.0",
      providers: ["ollama", "codex", "openai_compatible", "anthropic"],
    });
  }

  // Chat endpoint
  if (url.pathname === "/api/chat" && req.method === "POST") {
    return handleChat(req, res);
  }

  // 404 for everything else
  sendJson(res, 404, { ok: false, error: "Not found" });
}

/**
 * Check if port is in use
 */
async function isPortInUse(port) {
  return new Promise((resolve) => {
    const testServer = http.createServer();
    testServer.once("error", () => resolve(true));
    testServer.once("listening", () => {
      testServer.close();
      resolve(false);
    });
    testServer.listen(port, HOST);
  });
}

/**
 * Start the LLM server
 */
async function start(port = PORT, logger = null) {
  logCallback = logger;

  // Check if already running
  const inUse = await isPortInUse(port);
  if (inUse) {
    log("info", `Already running at http://${HOST}:${port}`);
    return;
  }

  return new Promise((resolve, reject) => {
    server = http.createServer(handleRequest);

    server.on("error", (err) => {
      log("error", `Server error: ${err.message}`);
      reject(err);
    });

    server.listen(port, HOST, () => {
      log("info", `LLM Server running on http://${HOST}:${port}`);
      log("info", `Endpoints: /health, /api/chat`);
      resolve();
    });
  });
}

/**
 * Stop the LLM server
 */
function stop() {
  if (server) {
    server.close();
    server = null;
    log("info", "LLM Server stopped");
  }
}

/**
 * Check if server is running
 */
function isRunning() {
  return server !== null;
}

module.exports = { start, stop, isRunning };

// Run directly if called from command line
if (require.main === module) {
  start().catch((err) => {
    console.error("Failed to start LLM server:", err);
    process.exit(1);
  });
}
