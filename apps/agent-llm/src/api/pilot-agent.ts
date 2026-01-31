/**
 * Pilot Agent - AI-Powered Web Interaction Agent
 *
 * An intelligent agent that can interact with web pages and LLM chat interfaces
 * to complete multi-step tasks autonomously. Unlike static template scripts,
 * Pilot Agents use AI to understand, react, and adapt to web page changes.
 *
 * Features:
 * - Interact with web-based LLM chat interfaces (ChatGPT, Claude, etc.)
 * - Wait for and analyze AI responses
 * - Extract and download content (images, files)
 * - Human-like delays and interactions
 * - AI-guided decision making
 */

import type http from 'node:http';
import { json, readJson, asString } from './utils.js';
import type { ChatMessage, ProviderContext } from './types.js';
import { runProvider, hasProvider } from './providers/index.js';

// ============ Types ============

export type PilotActionType =
  | 'navigate' // Navigate to a URL
  | 'wait' // Wait for a delay
  | 'wait_for_element' // Wait for an element to appear
  | 'wait_for_text' // Wait for specific text to appear on page
  | 'wait_for_response' // Wait for LLM chat response to complete
  | 'click' // Click an element
  | 'type' // Type text into an element
  | 'type_human' // Type text with human-like delays between keystrokes
  | 'submit_prompt' // Submit a prompt to a chat interface
  | 'extract_text' // Extract text from an element
  | 'extract_image' // Extract and optionally download an image
  | 'extract_response' // Extract the latest LLM response
  | 'analyze' // Use AI to analyze content and decide next steps
  | 'screenshot' // Take a screenshot
  | 'scroll' // Scroll the page
  | 'download' // Download a file from URL
  | 'custom_js'; // Execute custom JavaScript

export interface PilotAction {
  id: string;
  type: PilotActionType;
  description?: string;
  // Common parameters
  selector?: string;
  url?: string;
  text?: string;
  delay?: number;
  timeout?: number;
  // Type-specific parameters
  humanDelay?: { min: number; max: number }; // For type_human
  variableName?: string; // Store result in variable
  attribute?: string; // For extract_image (src, data-src, etc.)
  downloadPath?: string; // For download
  code?: string; // For custom_js
  direction?: 'up' | 'down' | 'left' | 'right'; // For scroll
  amount?: number; // For scroll
  // AI analysis parameters
  analyzePrompt?: string; // System prompt for AI analysis
  analyzeQuestion?: string; // Question to ask about the content
  expectedPatterns?: string[]; // Patterns to look for in response
}

export interface PilotStep {
  name: string;
  description: string;
  actions: PilotAction[];
  onSuccess?: string; // Next step name to go to on success
  onFailure?: string; // Step to go to on failure
  retries?: number; // Number of retries before failure
}

export interface PilotAgentConfig {
  id: string;
  name: string;
  description?: string;
  version: string;
  author?: string;
  builtIn?: boolean;
  // Target chat interface configuration
  targetInterface?: {
    type: 'chatgpt' | 'claude' | 'gemini' | 'custom';
    inputSelector?: string;
    submitSelector?: string;
    responseSelector?: string;
    imageSelector?: string;
  };
  // AI configuration for analysis
  llmProvider?: string;
  llmModel?: string;
  // Configurable inputs
  inputs?: PilotInputConfig[];
  // Steps to execute
  steps: PilotStep[];
  createdAt: string;
  updatedAt: string;
}

export interface PilotInputConfig {
  key: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  type?: 'text' | 'url' | 'prompt' | 'file';
  required?: boolean;
}

export interface PilotExecutionContext {
  variables: Record<string, string | null>;
  currentStep: number;
  currentAction: number;
  logs: string[];
  screenshots: string[];
  downloads: string[];
  startedAt: string;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  error?: string;
}

export interface PilotExecutionResult {
  agentId: string;
  agentName: string;
  profileId?: string;
  profileName?: string;
  status: 'completed' | 'failed' | 'stopped';
  variables: Record<string, string | null>;
  logs: string[];
  screenshots: string[];
  downloads: string[];
  error?: string;
  startedAt: string;
  completedAt: string;
}

// ============ Built-in Interface Configurations ============

export const CHAT_INTERFACES: Record<
  string,
  {
    inputSelector: string;
    submitSelector: string;
    responseSelector: string;
    imageSelector: string;
    waitForResponsePattern?: string;
  }
> = {
  chatgpt: {
    inputSelector: '#prompt-textarea, textarea[data-id="root"], .ProseMirror',
    submitSelector: 'button[data-testid="send-button"], button[data-testid="composer-send-button"]',
    responseSelector: '.markdown.prose, [data-message-author-role="assistant"]',
    imageSelector: 'img[src*="oaiusercontent"], img[src*="dalle"]',
    waitForResponsePattern: 'copyButton|Copy code',
  },
  claude: {
    inputSelector: '[contenteditable="true"].ProseMirror, textarea[placeholder*="Message"]',
    submitSelector: 'button[aria-label="Send Message"], button:has(svg[data-icon="send"])',
    responseSelector: '[data-test-id="human-turn-content"]',
    imageSelector: 'img[src*="claude"], img[src*="anthropic"]',
  },
  gemini: {
    inputSelector: 'textarea[aria-label*="Enter a prompt"], .ql-editor',
    submitSelector: 'button[aria-label="Send message"]',
    responseSelector: '.model-response-text, .response-content',
    imageSelector: 'img.generated-image',
  },
};

// ============ Helper Functions ============

/**
 * Generate a unique action ID
 */
export const generateActionId = (): string =>
  `pilot_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

/**
 * Random delay between min and max (for human-like behavior)
 */
export const randomDelay = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Replace {{variable}} placeholders in text
 */
export const replacePlaceholders = (
  text: string | undefined,
  variables: Record<string, string | null>,
  inputs?: Record<string, string>,
): string | undefined => {
  if (!text) return text;
  let result = text;

  // Replace with input values first
  if (inputs) {
    for (const [key, value] of Object.entries(inputs)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
  }

  // Replace with extracted variables
  for (const [key, value] of Object.entries(variables)) {
    if (value !== null) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
  }

  return result;
};

/**
 * Use LLM to analyze content and make decisions
 */
export async function analyzeWithLLM(
  content: string,
  question: string,
  provider: string = 'ollama',
  model?: string,
): Promise<string> {
  if (!hasProvider(provider)) {
    throw new Error(`LLM provider '${provider}' not available`);
  }

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are an AI assistant helping to analyze web page content and make decisions. 
Be concise and direct in your responses. Extract the key information requested.`,
    },
    {
      role: 'user',
      content: `Web page content:\n\n${content}\n\nQuestion: ${question}`,
    },
  ];

  const ctx: ProviderContext = {
    messages,
    model,
  };

  try {
    const result = await runProvider(provider, ctx);
    return result.text;
  } catch (error) {
    console.error('LLM analysis failed:', error);
    throw error;
  }
}

// ============ Pilot Agent Factory ============

/**
 * Create a new Pilot Agent configuration
 */
export function createPilotAgent(
  name: string,
  description: string,
  steps: PilotStep[],
  options?: Partial<PilotAgentConfig>,
): PilotAgentConfig {
  const now = new Date().toISOString();
  return {
    id: generateActionId(),
    name,
    description,
    version: '1.0.0',
    steps,
    createdAt: now,
    updatedAt: now,
    ...options,
  };
}

/**
 * Create a simple prompt submission step
 */
export function createPromptStep(
  name: string,
  prompt: string,
  interfaceType: keyof typeof CHAT_INTERFACES = 'chatgpt',
  options?: Partial<PilotStep>,
): PilotStep {
  const config = CHAT_INTERFACES[interfaceType];

  return {
    name,
    description: `Submit prompt: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`,
    actions: [
      {
        id: generateActionId(),
        type: 'wait',
        description: 'Initial delay (human-like)',
        delay: randomDelay(500, 1500),
      },
      {
        id: generateActionId(),
        type: 'click',
        description: 'Click input field',
        selector: config.inputSelector,
      },
      {
        id: generateActionId(),
        type: 'wait',
        description: 'Brief pause',
        delay: randomDelay(200, 500),
      },
      {
        id: generateActionId(),
        type: 'type_human',
        description: 'Type prompt with human-like delays',
        selector: config.inputSelector,
        text: prompt,
        humanDelay: { min: 30, max: 100 },
      },
      {
        id: generateActionId(),
        type: 'wait',
        description: 'Pause before submit',
        delay: randomDelay(300, 800),
      },
      {
        id: generateActionId(),
        type: 'click',
        description: 'Click submit button',
        selector: config.submitSelector,
      },
    ],
    ...options,
  };
}

/**
 * Create a wait-for-response step
 */
export function createWaitForResponseStep(
  name: string,
  interfaceType: keyof typeof CHAT_INTERFACES = 'chatgpt',
  timeout: number = 60000,
  options?: Partial<PilotStep>,
): PilotStep {
  const config = CHAT_INTERFACES[interfaceType];

  return {
    name,
    description: 'Wait for AI response to complete',
    actions: [
      {
        id: generateActionId(),
        type: 'wait_for_response',
        description: 'Wait for response to appear and complete',
        selector: config.responseSelector,
        timeout,
        expectedPatterns: config.waitForResponsePattern
          ? [config.waitForResponsePattern]
          : undefined,
      },
      {
        id: generateActionId(),
        type: 'wait',
        description: 'Additional wait for rendering',
        delay: 2000,
      },
    ],
    ...options,
  };
}

/**
 * Create an image extraction step
 */
export function createImageExtractionStep(
  name: string,
  interfaceType: keyof typeof CHAT_INTERFACES = 'chatgpt',
  downloadPath?: string,
  options?: Partial<PilotStep>,
): PilotStep {
  const config = CHAT_INTERFACES[interfaceType];

  return {
    name,
    description: 'Extract and download generated image',
    actions: [
      {
        id: generateActionId(),
        type: 'wait_for_element',
        description: 'Wait for image to appear',
        selector: config.imageSelector,
        timeout: 30000,
      },
      {
        id: generateActionId(),
        type: 'extract_image',
        description: 'Extract image URL',
        selector: config.imageSelector,
        attribute: 'src',
        variableName: 'imageUrl',
      },
      {
        id: generateActionId(),
        type: 'screenshot',
        description: 'Take screenshot of result',
      },
      ...(downloadPath
        ? [
            {
              id: generateActionId(),
              type: 'download' as PilotActionType,
              description: 'Download image',
              url: '{{imageUrl}}',
              downloadPath,
            },
          ]
        : []),
    ],
    ...options,
  };
}

// ============ Pre-built Pilot Agents ============

/**
 * ChatGPT Image Generator Pilot Agent
 * Navigates to ChatGPT, submits a prompt for image generation, and downloads the result
 */
export const CHATGPT_IMAGE_GENERATOR: PilotAgentConfig = {
  id: 'pilot-chatgpt-image-gen',
  name: 'ChatGPT Image Generator',
  description:
    'Navigate to ChatGPT, submit an image generation prompt, wait for the response, and download the generated image.',
  version: '1.0.0',
  author: 'Pilot Agents',
  builtIn: true,
  targetInterface: {
    type: 'chatgpt',
    inputSelector: '#prompt-textarea, .ProseMirror',
    submitSelector: 'button[data-testid="send-button"]',
    responseSelector: '.markdown.prose',
    imageSelector: 'img[src*="oaiusercontent"], img[src*="dalle"]',
  },
  llmProvider: 'ollama',
  inputs: [
    {
      key: 'chatgptUrl',
      label: 'ChatGPT URL',
      placeholder: 'https://chatgpt.com/',
      defaultValue: 'https://chatgpt.com/',
      type: 'url',
    },
    {
      key: 'imagePrompt',
      label: 'Image Prompt',
      placeholder: 'Generate a cute cat playing with yarn',
      defaultValue: 'Generate a cute cat playing with yarn',
      type: 'prompt',
      required: true,
    },
    {
      key: 'downloadFolder',
      label: 'Download Folder',
      placeholder: '/Downloads',
      defaultValue: '',
      type: 'text',
    },
  ],
  steps: [
    {
      name: 'navigate',
      description: 'Navigate to ChatGPT',
      actions: [
        {
          id: 'nav-1',
          type: 'navigate',
          description: 'Go to ChatGPT',
          url: '{{chatgptUrl}}',
        },
        {
          id: 'nav-2',
          type: 'wait',
          description: 'Wait for page to load',
          delay: 3000,
        },
      ],
    },
    {
      name: 'submit-prompt',
      description: 'Submit the image generation prompt',
      actions: [
        {
          id: 'prompt-1',
          type: 'wait_for_element',
          description: 'Wait for input field',
          selector: '#prompt-textarea, .ProseMirror',
          timeout: 15000,
        },
        {
          id: 'prompt-2',
          type: 'scroll',
          description: 'Scroll slightly (human behavior)',
          direction: 'down',
          amount: 50,
        },
        {
          id: 'prompt-3',
          type: 'wait',
          description: 'Brief pause',
          delay: 800,
        },
        {
          id: 'prompt-4',
          type: 'click',
          description: 'Click input field',
          selector: '#prompt-textarea, .ProseMirror',
        },
        {
          id: 'prompt-5',
          type: 'wait',
          description: 'Pause before typing',
          delay: 500,
        },
        {
          id: 'prompt-6',
          type: 'type_human',
          description: 'Type prompt with human-like delays',
          selector: '#prompt-textarea, .ProseMirror',
          text: '{{imagePrompt}}',
          humanDelay: { min: 40, max: 120 },
        },
        {
          id: 'prompt-7',
          type: 'wait',
          description: 'Pause before submit',
          delay: 1000,
        },
        {
          id: 'prompt-8',
          type: 'click',
          description: 'Click submit button',
          selector: 'button[data-testid="send-button"], button[data-testid="composer-send-button"]',
        },
      ],
    },
    {
      name: 'wait-for-image',
      description: 'Wait for image generation to complete',
      actions: [
        {
          id: 'wait-1',
          type: 'wait',
          description: 'Initial wait for processing',
          delay: 5000,
        },
        {
          id: 'wait-2',
          type: 'wait_for_element',
          description: 'Wait for image element',
          selector: 'img[src*="oaiusercontent"], img[src*="dalle"], img[alt*="Generated"]',
          timeout: 120000, // 2 minutes for image generation
        },
        {
          id: 'wait-3',
          type: 'wait',
          description: 'Additional wait for full render',
          delay: 3000,
        },
      ],
    },
    {
      name: 'extract-image',
      description: 'Extract and download the generated image',
      actions: [
        {
          id: 'extract-1',
          type: 'screenshot',
          description: 'Take screenshot of result',
        },
        {
          id: 'extract-2',
          type: 'extract_image',
          description: 'Extract image URL from src attribute',
          selector: 'img[src*="oaiusercontent"], img[src*="dalle"], img[alt*="Generated"]',
          attribute: 'src',
          variableName: 'generatedImageUrl',
        },
        {
          id: 'extract-3',
          type: 'extract_text',
          description: 'Extract response text',
          selector: '.markdown.prose',
          variableName: 'responseText',
        },
      ],
    },
  ],
  createdAt: '2026-01-30T00:00:00.000Z',
  updatedAt: '2026-01-30T00:00:00.000Z',
};

/**
 * Web Chat Interaction Pilot Agent
 * A generic agent for interacting with any web-based chat interface
 */
export const WEB_CHAT_INTERACTOR: PilotAgentConfig = {
  id: 'pilot-web-chat-interact',
  name: 'Web Chat Interactor',
  description:
    'Interact with any web-based chat or LLM interface. Navigate to a URL, submit prompts, and extract responses.',
  version: '1.0.0',
  author: 'Pilot Agents',
  builtIn: true,
  inputs: [
    {
      key: 'targetUrl',
      label: 'Target URL',
      placeholder: 'https://example.com/chat',
      type: 'url',
      required: true,
    },
    {
      key: 'inputSelector',
      label: 'Input Selector',
      placeholder: 'textarea, input[type="text"], .chat-input',
      defaultValue: 'textarea',
      type: 'text',
    },
    {
      key: 'submitSelector',
      label: 'Submit Button Selector',
      placeholder: 'button[type="submit"], .send-btn',
      defaultValue: 'button[type="submit"]',
      type: 'text',
    },
    {
      key: 'responseSelector',
      label: 'Response Selector',
      placeholder: '.response, .message, .chat-bubble',
      defaultValue: '.response',
      type: 'text',
    },
    {
      key: 'userPrompt',
      label: 'Your Prompt',
      placeholder: 'Enter your prompt here...',
      type: 'prompt',
      required: true,
    },
  ],
  steps: [
    {
      name: 'navigate',
      description: 'Navigate to target chat interface',
      actions: [
        {
          id: 'nav-1',
          type: 'navigate',
          description: 'Go to target URL',
          url: '{{targetUrl}}',
        },
        {
          id: 'nav-2',
          type: 'wait',
          description: 'Wait for page load',
          delay: 3000,
        },
      ],
    },
    {
      name: 'interact',
      description: 'Submit prompt and wait for response',
      actions: [
        {
          id: 'int-1',
          type: 'wait_for_element',
          description: 'Wait for input field',
          selector: '{{inputSelector}}',
          timeout: 15000,
        },
        {
          id: 'int-2',
          type: 'click',
          description: 'Focus input field',
          selector: '{{inputSelector}}',
        },
        {
          id: 'int-3',
          type: 'wait',
          description: 'Brief pause',
          delay: 500,
        },
        {
          id: 'int-4',
          type: 'type_human',
          description: 'Type prompt naturally',
          selector: '{{inputSelector}}',
          text: '{{userPrompt}}',
          humanDelay: { min: 30, max: 80 },
        },
        {
          id: 'int-5',
          type: 'wait',
          description: 'Pause before submit',
          delay: 800,
        },
        {
          id: 'int-6',
          type: 'click',
          description: 'Click submit',
          selector: '{{submitSelector}}',
        },
      ],
    },
    {
      name: 'extract',
      description: 'Wait for and extract the response',
      actions: [
        {
          id: 'ext-1',
          type: 'wait',
          description: 'Wait for response generation',
          delay: 5000,
        },
        {
          id: 'ext-2',
          type: 'wait_for_element',
          description: 'Wait for response element',
          selector: '{{responseSelector}}',
          timeout: 60000,
        },
        {
          id: 'ext-3',
          type: 'wait',
          description: 'Wait for complete response',
          delay: 3000,
        },
        {
          id: 'ext-4',
          type: 'extract_text',
          description: 'Extract response text',
          selector: '{{responseSelector}}',
          variableName: 'chatResponse',
        },
        {
          id: 'ext-5',
          type: 'screenshot',
          description: 'Capture result',
        },
      ],
    },
  ],
  createdAt: '2026-01-30T00:00:00.000Z',
  updatedAt: '2026-01-30T00:00:00.000Z',
};

// ============ Export All Built-in Agents ============

export const BUILTIN_PILOT_AGENTS: PilotAgentConfig[] = [
  CHATGPT_IMAGE_GENERATOR,
  WEB_CHAT_INTERACTOR,
];

// ============ API Handlers ============

/**
 * Handle listing all pilot agents
 */
export async function handleListPilotAgents(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  json(res, 200, {
    ok: true,
    agents: BUILTIN_PILOT_AGENTS,
    count: BUILTIN_PILOT_AGENTS.length,
  });
}

/**
 * Handle getting a specific pilot agent by ID
 */
export async function handleGetPilotAgent(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  agentId: string,
): Promise<void> {
  const agent = BUILTIN_PILOT_AGENTS.find((a) => a.id === agentId);
  if (!agent) {
    json(res, 404, { ok: false, error: `Pilot agent '${agentId}' not found` });
    return;
  }
  json(res, 200, { ok: true, agent });
}

/**
 * Handle AI content analysis request
 */
export async function handleAnalyzeContent(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  const body = await readJson(req);
  const content = asString(body.content);
  const question = asString(body.question);
  const provider = asString(body.provider) || 'ollama';
  const model = asString(body.model);

  if (!content) {
    json(res, 400, { ok: false, error: 'Missing content to analyze' });
    return;
  }

  if (!question) {
    json(res, 400, { ok: false, error: 'Missing question' });
    return;
  }

  try {
    const analysis = await analyzeWithLLM(content, question, provider, model);
    json(res, 200, { ok: true, analysis });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    json(res, 500, { ok: false, error: message });
  }
}

/**
 * Handle getting chat interface configurations
 */
export async function handleGetChatInterfaces(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  json(res, 200, {
    ok: true,
    interfaces: CHAT_INTERFACES,
    supported: Object.keys(CHAT_INTERFACES),
  });
}

export default {
  BUILTIN_PILOT_AGENTS,
  CHAT_INTERFACES,
  createPilotAgent,
  createPromptStep,
  createWaitForResponseStep,
  createImageExtractionStep,
  analyzeWithLLM,
  handleListPilotAgents,
  handleGetPilotAgent,
  handleAnalyzeContent,
  handleGetChatInterfaces,
};
