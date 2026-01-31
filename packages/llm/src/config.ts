/**
 * Configuration for LLM Chat API
 */

// Server configuration
export const ROOT_DIR = process.cwd();
export const HOST = process.env.HOST ?? "127.0.0.1";
export const PORT = Number(process.env.PORT ?? "4444");
export const USE_HTTPS = process.env.HTTPS === "1";
export const SSL_KEY_PATH = process.env.SSL_KEY ?? "";
export const SSL_CERT_PATH = process.env.SSL_CERT ?? "";

// Feature flags
export const ENABLE_COMMAND_LLM = process.env.ENABLE_COMMAND_LLM === "1";

// GPT4Free configuration
export const G4F_API_URL = process.env.G4F_API_URL ?? "http://127.0.0.1:1337";
export const G4F_STARTUP_TIMEOUT_MS = Number(
  process.env.G4F_STARTUP_TIMEOUT_MS ?? "30000",
);
export const G4F_VERSION = "v6.9.10";
export const G4F_RELEASE_BASE = `https://github.com/xtekky/gpt4free/releases/download/${G4F_VERSION}`;

// Token limits per provider (for context window optimization)
export const CONTEXT_TOKEN_LIMITS: Record<string, number> = {
  codex: 120000, // GPT-5.1 Codex has large context
  ollama: 4000, // Conservative for local models
  openai_compatible: 8000, // Standard OpenAI context
  gpt4free: 4000, // Conservative for free models
  command: 4000, // CLI tools
};

export const DEFAULT_MAX_CONTEXT_TOKENS = 8000;
