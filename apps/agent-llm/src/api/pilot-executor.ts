/**
 * Pilot Agent Executor
 *
 * Executes Pilot Agent configurations on a browser page.
 * Handles human-like interactions, AI analysis, and content extraction.
 */

import type {
  PilotAgentConfig,
  PilotAction,
  PilotStep,
  PilotExecutionContext,
  PilotExecutionResult,
} from './pilot-agent.js';
import { replacePlaceholders, randomDelay, analyzeWithLLM } from './pilot-agent.js';

// ============ Types ============

/**
 * Page interface compatible with Playwright Page object
 */
export interface PilotPage {
  goto: (
    url: string,
    options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit' },
  ) => Promise<unknown>;
  click: (selector: string) => Promise<unknown>;
  fill: (selector: string, text: string) => Promise<unknown>;
  type: (selector: string, text: string, options?: { delay?: number }) => Promise<unknown>;
  keyboard: {
    press: (key: string) => Promise<unknown>;
    type: (text: string, options?: { delay?: number }) => Promise<unknown>;
  };
  waitForTimeout: (ms: number) => Promise<unknown>;
  waitForLoadState: (state?: 'load' | 'domcontentloaded' | 'networkidle') => Promise<unknown>;
  hover: (selector: string) => Promise<unknown>;
  selectOption: (selector: string, value: string) => Promise<unknown>;
  waitForSelector: (
    selector: string,
    options?: { timeout?: number; state?: string },
  ) => Promise<unknown>;
  textContent: (selector: string) => Promise<string | null>;
  innerHTML: (selector: string) => Promise<string>;
  screenshot: (options?: { path?: string; fullPage?: boolean }) => Promise<Buffer | unknown>;
  evaluate: <T>(fn: string | (() => T)) => Promise<T>;
  evaluateHandle: (fn: string | (() => unknown)) => Promise<unknown>;
  mouse: { wheel: (x: number, y: number) => Promise<unknown> };
  getAttribute: (selector: string, name: string) => Promise<string | null>;
  setInputFiles: (selector: string, files: string | string[]) => Promise<unknown>;
  locator: (selector: string) => {
    setInputFiles: (files: string | string[]) => Promise<unknown>;
    click: () => Promise<unknown>;
    fill: (text: string) => Promise<unknown>;
    textContent: () => Promise<string | null>;
  };
  url: () => string;
  title: () => Promise<string>;
  content: () => Promise<string>;
}

/**
 * Log callback for real-time streaming
 */
export type PilotLogCallback = (log: {
  agentId: string;
  agentName: string;
  stepName: string;
  message: string;
  type: 'info' | 'action' | 'success' | 'warn' | 'error' | 'ai';
}) => void;

/**
 * Execution options
 */
export interface PilotExecutionOptions {
  profileId?: string;
  profileName?: string;
  inputs?: Record<string, string>;
  baseDelay?: number;
  onLog?: PilotLogCallback;
  llmProvider?: string;
  llmModel?: string;
  screenshotDir?: string;
  downloadDir?: string;
}

// ============ Executor ============

/**
 * Execute a single Pilot action
 */
async function executeAction(
  page: PilotPage,
  action: PilotAction,
  context: PilotExecutionContext,
  options: PilotExecutionOptions,
  log: (message: string, type: 'info' | 'action' | 'success' | 'warn' | 'error' | 'ai') => void,
): Promise<void> {
  const { inputs = {} } = options;

  // Replace placeholders in action parameters
  const resolveText = (text: string | undefined): string | undefined =>
    replacePlaceholders(text, context.variables, inputs);

  switch (action.type) {
    case 'navigate': {
      const url = resolveText(action.url);
      if (url) {
        log(`Navigating to: ${url.substring(0, 60)}${url.length > 60 ? '...' : ''}`, 'info');
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle').catch(() => {
          log('Network idle timeout, continuing...', 'warn');
        });
        log('Navigation complete', 'success');
      }
      break;
    }

    case 'wait': {
      const delay = action.delay || 1000;
      log(`Waiting ${delay}ms...`, 'info');
      await page.waitForTimeout(delay);
      log('Wait complete', 'success');
      break;
    }

    case 'wait_for_element': {
      const selector = resolveText(action.selector);
      if (selector) {
        const timeout = action.timeout || 30000;
        log(`Waiting for element: ${selector.substring(0, 40)}... (${timeout}ms timeout)`, 'info');
        await page.waitForSelector(selector, { timeout });
        log('Element found!', 'success');
      }
      break;
    }

    case 'wait_for_text': {
      const text = resolveText(action.text);
      if (text) {
        const timeout = action.timeout || 30000;
        log(`Waiting for text: "${text.substring(0, 30)}..."`, 'info');

        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
          const pageContent = await page.content();
          if (pageContent.includes(text)) {
            log('Text found!', 'success');
            return;
          }
          await page.waitForTimeout(500);
        }
        throw new Error(`Text "${text}" not found within ${timeout}ms`);
      }
      break;
    }

    case 'wait_for_response': {
      const selector = resolveText(action.selector);
      if (selector) {
        const timeout = action.timeout || 60000;
        log(`Waiting for response in: ${selector}`, 'info');

        // First wait for element
        await page.waitForSelector(selector, { timeout });

        // If we have expected patterns, wait for them
        if (action.expectedPatterns && action.expectedPatterns.length > 0) {
          const startTime = Date.now();
          let found = false;

          while (Date.now() - startTime < timeout && !found) {
            const content = await page.innerHTML(selector);
            for (const pattern of action.expectedPatterns) {
              if (content.includes(pattern)) {
                found = true;
                log(`Response pattern found: ${pattern}`, 'success');
                break;
              }
            }
            if (!found) {
              await page.waitForTimeout(1000);
            }
          }

          if (!found) {
            log('Response completed (no pattern matched)', 'warn');
          }
        } else {
          // Just wait for the element and a bit more for content
          await page.waitForTimeout(2000);
          log('Response element found', 'success');
        }
      }
      break;
    }

    case 'click': {
      const selector = resolveText(action.selector);
      if (selector) {
        log(`Clicking: ${selector.substring(0, 40)}...`, 'info');
        await page.waitForSelector(selector, { timeout: 10000 }).catch(() => {
          log(`Warning: element might not exist: ${selector}`, 'warn');
        });
        await page.click(selector);
        log('Click complete', 'success');
      }
      break;
    }

    case 'type': {
      const selector = resolveText(action.selector);
      const text = resolveText(action.text);
      if (selector && text) {
        log(`Typing "${text.substring(0, 25)}${text.length > 25 ? '...' : ''}"`, 'info');
        await page.waitForSelector(selector, { timeout: 10000 }).catch(() => {});
        await page.fill(selector, text);
        log('Type complete', 'success');
      }
      break;
    }

    case 'type_human': {
      const selector = resolveText(action.selector);
      const text = resolveText(action.text);
      if (selector && text) {
        const delayRange = action.humanDelay || { min: 30, max: 100 };
        log(`Typing naturally: "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}"`, 'info');

        await page.waitForSelector(selector, { timeout: 10000 }).catch(() => {});
        await page.click(selector);

        // Type character by character with random delays
        for (const char of text) {
          await page.keyboard.type(char, { delay: randomDelay(delayRange.min, delayRange.max) });
        }
        log('Human-like typing complete', 'success');
      }
      break;
    }

    case 'submit_prompt': {
      // This is a composite action - type + submit
      const selector = resolveText(action.selector);
      const text = resolveText(action.text);
      if (selector && text) {
        log(`Submitting prompt: "${text.substring(0, 30)}..."`, 'action');

        await page.waitForSelector(selector, { timeout: 10000 });
        await page.click(selector);
        await page.waitForTimeout(randomDelay(200, 500));

        // Type with human-like delays
        const delayRange = action.humanDelay || { min: 40, max: 100 };
        for (const char of text) {
          await page.keyboard.type(char, { delay: randomDelay(delayRange.min, delayRange.max) });
        }

        await page.waitForTimeout(randomDelay(300, 700));
        await page.keyboard.press('Enter');
        log('Prompt submitted', 'success');
      }
      break;
    }

    case 'extract_text': {
      const selector = resolveText(action.selector);
      if (selector) {
        log(`Extracting text from: ${selector}`, 'info');
        const text = await page.textContent(selector);
        const varName = action.variableName || 'extractedText';
        context.variables[varName] = text;
        log(
          `Extracted ${varName} = "${text?.substring(0, 50)}${text && text.length > 50 ? '...' : ''}"`,
          'success',
        );
      }
      break;
    }

    case 'extract_image': {
      const selector = resolveText(action.selector);
      if (selector) {
        const attribute = action.attribute || 'src';
        log(`Extracting image ${attribute} from: ${selector}`, 'info');

        await page.waitForSelector(selector, { timeout: 10000 }).catch(() => {
          log(`Warning: image element not found: ${selector}`, 'warn');
        });

        const url = await page.getAttribute(selector, attribute);
        const varName = action.variableName || 'imageUrl';
        context.variables[varName] = url;
        log(
          `Extracted ${varName} = "${url?.substring(0, 60)}${url && url.length > 60 ? '...' : ''}"`,
          'success',
        );
      }
      break;
    }

    case 'extract_response': {
      const selector = resolveText(action.selector);
      if (selector) {
        log('Extracting response content...', 'info');
        const html = await page.innerHTML(selector);
        // Strip HTML tags for text content
        const text = html
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        const varName = action.variableName || 'response';
        context.variables[varName] = text;
        log(`Extracted response (${text.length} chars)`, 'success');
      }
      break;
    }

    case 'analyze': {
      const selector = resolveText(action.selector);
      const question = resolveText(action.analyzeQuestion);

      if (question) {
        log(`🤖 AI Analysis: "${question.substring(0, 40)}..."`, 'ai');

        let content = '';
        if (selector) {
          content = (await page.textContent(selector)) || '';
        } else {
          // Get visible page text
          content = await page.evaluate(() => document.body.innerText);
        }

        const provider = options.llmProvider || 'ollama';
        const model = options.llmModel;

        try {
          const analysis = await analyzeWithLLM(content, question, provider, model);
          const varName = action.variableName || 'aiAnalysis';
          context.variables[varName] = analysis;
          log(
            `AI Response: "${analysis.substring(0, 100)}${analysis.length > 100 ? '...' : ''}"`,
            'ai',
          );
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          log(`AI analysis failed: ${message}`, 'error');
          throw err;
        }
      }
      break;
    }

    case 'screenshot': {
      log('Taking screenshot...', 'info');
      const screenshotPath = options.screenshotDir
        ? `${options.screenshotDir}/pilot_${Date.now()}.png`
        : undefined;

      await page.screenshot({ path: screenshotPath, fullPage: false });

      if (screenshotPath) {
        context.screenshots.push(screenshotPath);
        log(`Screenshot saved: ${screenshotPath}`, 'success');
      } else {
        log('Screenshot captured', 'success');
      }
      break;
    }

    case 'scroll': {
      if (action.direction && action.amount) {
        log(`Scrolling ${action.direction}: ${action.amount}px`, 'info');
        const x =
          action.direction === 'left'
            ? -action.amount
            : action.direction === 'right'
              ? action.amount
              : 0;
        const y =
          action.direction === 'up'
            ? -action.amount
            : action.direction === 'down'
              ? action.amount
              : 0;
        await page.mouse.wheel(x, y);
        log('Scroll complete', 'success');
      }
      break;
    }

    case 'download': {
      const url = resolveText(action.url);
      if (url) {
        log(`Downloading: ${url.substring(0, 50)}...`, 'info');
        // Download will be handled by the calling environment
        context.variables['downloadUrl'] = url;
        if (action.downloadPath) {
          context.downloads.push(url);
        }
        log('Download URL captured', 'success');
      }
      break;
    }

    case 'custom_js': {
      if (action.code) {
        log('Executing custom JavaScript...', 'info');
        const result = await page.evaluate(action.code);
        if (action.variableName && result !== undefined) {
          context.variables[action.variableName] = String(result);
        }
        log('Custom JS executed', 'success');
      }
      break;
    }

    default:
      log(`Unknown action type: ${(action as { type: string }).type}`, 'warn');
  }
}

/**
 * Execute a Pilot Agent step
 */
async function executeStep(
  page: PilotPage,
  step: PilotStep,
  context: PilotExecutionContext,
  options: PilotExecutionOptions,
  log: (message: string, type: 'info' | 'action' | 'success' | 'warn' | 'error' | 'ai') => void,
): Promise<boolean> {
  log(`━━━ Step: ${step.name} ━━━`, 'action');
  log(step.description, 'info');

  const retries = step.retries || 0;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      log(`Retry attempt ${attempt}/${retries}`, 'warn');
      await page.waitForTimeout(1000);
    }

    try {
      for (let i = 0; i < step.actions.length; i++) {
        const action = step.actions[i];
        context.currentAction = i;

        const actionDesc = action.description || action.type;
        log(`[${i + 1}/${step.actions.length}] ${actionDesc}`, 'action');

        await executeAction(page, action, context, options, log);

        // Base delay between actions
        if (options.baseDelay && i < step.actions.length - 1) {
          await page.waitForTimeout(options.baseDelay);
        }
      }

      log(`Step "${step.name}" completed successfully`, 'success');
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      log(`Step "${step.name}" failed: ${message}`, 'error');

      if (attempt >= retries) {
        return false;
      }
    }
  }

  return false;
}

/**
 * Execute a complete Pilot Agent
 */
export async function executePilotAgent(
  page: PilotPage,
  agent: PilotAgentConfig,
  options: PilotExecutionOptions = {},
): Promise<PilotExecutionResult> {
  const now = new Date().toISOString();
  const context: PilotExecutionContext = {
    variables: {},
    currentStep: 0,
    currentAction: 0,
    logs: [],
    screenshots: [],
    downloads: [],
    startedAt: now,
    status: 'running',
  };

  // Logging function
  const log = (
    message: string,
    type: 'info' | 'action' | 'success' | 'warn' | 'error' | 'ai' = 'info',
  ) => {
    const icons = {
      info: 'ℹ️',
      action: '▶️',
      success: '✅',
      warn: '⚠️',
      error: '❌',
      ai: '🤖',
    };
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
    const fullMessage = `[${timestamp}] ${icons[type]} ${message}`;
    console.log(fullMessage);
    context.logs.push(fullMessage);

    if (options.onLog) {
      options.onLog({
        agentId: agent.id,
        agentName: agent.name,
        stepName: agent.steps[context.currentStep]?.name || 'init',
        message,
        type,
      });
    }
  };

  log('═══════════════════════════════════════════', 'info');
  log(`🚀 Starting Pilot Agent: ${agent.name}`, 'action');
  log(`Total steps: ${agent.steps.length}`, 'info');
  if (options.inputs && Object.keys(options.inputs).length > 0) {
    log(`Inputs: ${JSON.stringify(options.inputs)}`, 'info');
  }
  log('═══════════════════════════════════════════', 'info');

  try {
    let currentStepIndex = 0;

    while (currentStepIndex < agent.steps.length && context.status === 'running') {
      const step = agent.steps[currentStepIndex];
      context.currentStep = currentStepIndex;

      const success = await executeStep(page, step, context, options, log);

      if (success) {
        // Move to next step (or specified onSuccess step)
        if (step.onSuccess) {
          const nextIndex = agent.steps.findIndex((s) => s.name === step.onSuccess);
          if (nextIndex >= 0) {
            currentStepIndex = nextIndex;
          } else {
            currentStepIndex++;
          }
        } else {
          currentStepIndex++;
        }
      } else {
        // Handle failure
        if (step.onFailure) {
          const failIndex = agent.steps.findIndex((s) => s.name === step.onFailure);
          if (failIndex >= 0) {
            currentStepIndex = failIndex;
            continue;
          }
        }
        // No recovery, fail the agent
        context.status = 'failed';
        context.error = `Step "${step.name}" failed`;
      }
    }

    if (context.status === 'running') {
      context.status = 'completed';
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    context.status = 'failed';
    context.error = message;
    log(`Agent execution failed: ${message}`, 'error');
  }

  const completedAt = new Date().toISOString();

  log('═══════════════════════════════════════════', 'info');
  log(
    `🏁 Agent "${agent.name}" ${context.status}`,
    context.status === 'completed' ? 'success' : 'error',
  );
  log(`Extracted ${Object.keys(context.variables).length} variables`, 'info');
  log(`Captured ${context.screenshots.length} screenshots`, 'info');
  log('═══════════════════════════════════════════', 'info');

  return {
    agentId: agent.id,
    agentName: agent.name,
    profileId: options.profileId,
    profileName: options.profileName,
    status: context.status as 'completed' | 'failed' | 'stopped',
    variables: context.variables,
    logs: context.logs,
    screenshots: context.screenshots,
    downloads: context.downloads,
    error: context.error,
    startedAt: now,
    completedAt,
  };
}

export default {
  executePilotAgent,
  executeStep,
  executeAction,
};
