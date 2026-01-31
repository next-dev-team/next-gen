/**
 * @nde/llm - Shared LLM Package
 *
 * Unified LLM interface for Next-Gen Tools supporting multiple providers
 * and BMAD AI agents.
 */

// Core types
export * from "./types.js";

// Provider exports
export {
  runProvider,
  hasProvider,
  getProviderNames,
  getStaticProviderNames,
  getDynamicProviderNames,
  registerProvider,
  unregisterProvider,
  getProviderConfig,
  getAllProviderConfigs,
  initProviders,
  clearDynamicProviders,
  startG4fServer,
  stopG4fServer,
  getG4fStatus,
  isG4fInstalled,
  type OpenAiProviderConfig,
} from "./providers/index.js";

// Memory & conversation exports
export {
  countMessageTokens,
  countTotalTokens,
  optimizeMessagesForContext,
  formatMessagesAsPrompt,
  getProviderTokenLimit,
  prepareMessages,
} from "./memory/index.js";

// Agent exports
export {
  BMAD_AGENTS,
  getBmadAgentPrompt,
  type BmadAgentId,
  type BmadAgent,
} from "./agents/index.js";

// HTTP utilities (for server usage)
export {
  json,
  text,
  notFound,
  readRequestBody,
  readJson,
  asString,
  asObject,
  proxyPost,
  buildOpenAiUrl,
  fetchStatus,
} from "./utils/http.js";

// Configuration
export {
  ROOT_DIR,
  HOST,
  PORT,
  USE_HTTPS,
  SSL_KEY_PATH,
  SSL_CERT_PATH,
  ENABLE_COMMAND_LLM,
  G4F_API_URL,
  G4F_STARTUP_TIMEOUT_MS,
  G4F_VERSION,
  G4F_RELEASE_BASE,
  CONTEXT_TOKEN_LIMITS,
  DEFAULT_MAX_CONTEXT_TOKENS,
} from "./config.js";
