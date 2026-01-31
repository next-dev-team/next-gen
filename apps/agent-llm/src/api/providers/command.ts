/**
 * Command LLM Provider
 *
 * Runs arbitrary CLI commands as LLM providers.
 */

import { spawn } from 'node:child_process';
import type { ProviderContext, ProviderResult, ChatMessage } from '../types.js';
import { prepareMessages } from '../memory.js';
import { ROOT_DIR, ENABLE_COMMAND_LLM } from '../config.js';

function shouldUseShell(command: string): boolean {
  if (process.platform !== 'win32') return false;
  return /\.(cmd|bat)$/i.test(command);
}

/**
 * Run a command-line LLM tool
 */
export async function runCommandLlm(params: {
  command: string;
  args: string[];
  input: string;
  timeoutMs?: number;
}): Promise<string> {
  const timeoutMs = params.timeoutMs ?? 120_000;
  const maxOutputBytes = 2_000_000;

  return await new Promise((resolve, reject) => {
    const useShell = shouldUseShell(params.command);
    const child = spawn(params.command, params.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: ROOT_DIR,
      env: process.env,
      shell: useShell,
    });

    let killReason = '';
    const killTimer = setTimeout(() => {
      killReason = `Timeout after ${timeoutMs}ms`;
      child.kill('SIGKILL');
    }, timeoutMs);

    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);

    child.stdout.on('data', (chunk: Buffer) => {
      stdout = Buffer.concat([stdout, chunk]);
      if (stdout.length > maxOutputBytes) {
        killReason = `Output exceeded ${maxOutputBytes} bytes`;
        child.kill('SIGKILL');
      }
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = Buffer.concat([stderr, chunk]);
    });

    child.on('error', (err) => {
      clearTimeout(killTimer);
      reject(err);
    });

    child.on('close', (code, signal) => {
      clearTimeout(killTimer);
      if (code !== 0) {
        const signalInfo = signal ? `, signal ${signal}` : '';
        reject(
          new Error(
            `Command failed (exit ${code}${signalInfo}): ${stderr.toString('utf8').trim() || 'no stderr'}`,
          ),
        );
        return;
      }
      resolve(stdout.toString('utf8').trim());
    });

    child.stdin.end(params.input);
  });
}

/**
 * Command provider handler
 */
export async function handleCommand(ctx: ProviderContext): Promise<ProviderResult> {
  if (!ENABLE_COMMAND_LLM) {
    throw new Error('Command LLM is disabled. Start with ENABLE_COMMAND_LLM=1');
  }
  if (!ctx.command) {
    throw new Error('Missing command for command provider');
  }

  // Optimize messages for context window
  const optimizedMessages = prepareMessages(ctx.messages, 'command');

  // Build prompt from messages
  const prompt = optimizedMessages.map((m) => `${m.role}: ${m.content}`).join('\n\n');
  const text = await runCommandLlm({ command: ctx.command, args: [], input: prompt });

  return { text };
}
