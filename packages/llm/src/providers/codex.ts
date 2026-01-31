/**
 * Codex CLI Provider
 *
 * Uses OpenAI Codex CLI for inference with conversation memory support.
 */

import { spawn } from "node:child_process";
import type { ProviderContext, ProviderResult } from "../types.js";
import {
  prepareMessages,
  formatMessagesAsPrompt,
} from "../memory/conversation.js";
import { ROOT_DIR } from "../config.js";

/**
 * Run Codex CLI with a prompt
 */
export async function runCodex(
  prompt: string,
  model?: string,
): Promise<string> {
  const timeoutMs = 180_000; // 3 minutes for codex
  const maxOutputBytes = 2_000_000;

  // Build codex exec arguments
  // Usage: codex exec [-m MODEL] --color never -- -
  const args: string[] = ["exec"];
  if (model) {
    args.push("-m", model);
  }
  args.push("--color", "never");
  args.push("--", "-"); // read prompt from stdin

  return await new Promise((resolve, reject) => {
    const child = spawn("codex", args, {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: ROOT_DIR,
      env: process.env,
      shell: false,
    });

    let killReason = "";
    const killTimer = setTimeout(() => {
      killReason = `Timeout after ${timeoutMs}ms`;
      child.kill("SIGKILL");
    }, timeoutMs);

    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout = Buffer.concat([stdout, chunk]);
      if (stdout.length > maxOutputBytes) {
        killReason = `Output exceeded ${maxOutputBytes} bytes`;
        child.kill("SIGKILL");
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = Buffer.concat([stderr, chunk]);
    });

    child.on("error", (err) => {
      clearTimeout(killTimer);
      reject(
        new Error(
          `Codex command failed: ${err.message}. Make sure 'codex' CLI is installed.`,
        ),
      );
    });

    child.on("close", (code, signal) => {
      clearTimeout(killTimer);
      if (code !== 0) {
        const signalInfo = signal ? `, signal ${signal}` : "";
        const stderrText = stderr.toString("utf8").trim();
        reject(
          new Error(
            `Codex failed (exit ${code}${signalInfo}): ${stderrText || "no error output"}`,
          ),
        );
        return;
      }
      resolve(stdout.toString("utf8").trim());
    });

    // Write the prompt and close stdin
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

/**
 * Codex provider handler
 */
export async function handleCodex(
  ctx: ProviderContext,
): Promise<ProviderResult> {
  // Optimize messages for large context (Codex supports up to 128k tokens)
  const optimizedMessages = prepareMessages(ctx.messages, "codex");

  // Validate we have a user message
  const lastMessage = optimizedMessages
    .filter((m) => m.role !== "system")
    .pop();
  if (!lastMessage || lastMessage.role !== "user") {
    throw new Error("No user message found for codex");
  }

  // Format messages as a prompt string for CLI
  const prompt = formatMessagesAsPrompt(optimizedMessages);
  const text = await runCodex(prompt, ctx.model);

  return { text };
}
