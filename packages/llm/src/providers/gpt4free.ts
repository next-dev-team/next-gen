/**
 * GPT4Free Provider
 *
 * Uses the gpt4free server for free model access.
 */

import * as fsSync from "node:fs";
import fs from "node:fs/promises";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { pipeline } from "node:stream/promises";

import type {
  ProviderContext,
  ProviderResult,
  ChatResponse,
} from "../types.js";
import { prepareMessages } from "../memory/conversation.js";
import { proxyPost, buildOpenAiUrl, fetchStatus } from "../utils/http.js";
import {
  ROOT_DIR,
  G4F_API_URL,
  G4F_STARTUP_TIMEOUT_MS,
  G4F_RELEASE_BASE,
  G4F_VERSION,
} from "../config.js";

// GPT4Free assets per platform
type G4fAsset = {
  name: string;
  sha256?: string;
  archive?: "zip";
};

const G4F_ASSETS: Record<string, G4fAsset> = {
  "darwin-arm64": { name: "g4f-macos-v6.9.10-arm64" },
  "darwin-x64": { name: "g4f-macos-v6.9.10-x64" },
  "linux-arm64": { name: "g4f-linux-v6.9.10-arm64" },
  "linux-x64": { name: "g4f-linux-v6.9.10-x64" },
  "win32-x64": { name: "g4f-windows-v6.9.10-x64.zip", archive: "zip" },
};

// Server state
let g4fProcess: ReturnType<typeof spawn> | null = null;
let g4fStartupPromise: Promise<void> | null = null;

function getG4fPlatformKey(): string {
  if (process.platform === "darwin") return `darwin-${process.arch}`;
  if (process.platform === "linux") return `linux-${process.arch}`;
  if (process.platform === "win32") return "win32-x64";
  return `${process.platform}-${process.arch}`;
}

function getG4fBinaryPath(platformKey: string): string {
  const binaryName = process.platform === "win32" ? "g4f.exe" : "g4f";
  return path.join(ROOT_DIR, "bin", "gpt4free", platformKey, binaryName);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if GPT4Free binary is installed for the current platform
 */
export async function isG4fInstalled(): Promise<boolean> {
  const platformKey = getG4fPlatformKey();
  const targetPath = getG4fBinaryPath(platformKey);
  return fileExists(targetPath);
}

/**
 * Get GPT4Free installation status with details
 */
export async function getG4fStatus(): Promise<{
  installed: boolean;
  running: boolean;
  version: string;
  binaryPath: string | null;
}> {
  const platformKey = getG4fPlatformKey();
  const asset = G4F_ASSETS[platformKey];
  const binaryPath = getG4fBinaryPath(platformKey);
  const installed = await fileExists(binaryPath);
  const running = await isG4fServerHealthy();

  return {
    installed,
    running,
    version: asset ? G4F_VERSION : "unknown",
    binaryPath: installed ? binaryPath : null,
  };
}

async function downloadToFile(
  url: string,
  dest: string,
  redirectsLeft = 5,
): Promise<void> {
  console.log(`[G4F] Downloading from: ${url}`);
  await new Promise<void>((resolve, reject) => {
    const request = https.get(url, (res) => {
      const status = res.statusCode ?? 0;
      console.log(`[G4F] Response status: ${status}`);
      if (status >= 300 && status < 400 && res.headers.location) {
        if (redirectsLeft <= 0) {
          reject(new Error("Too many redirects"));
          res.resume();
          return;
        }
        res.resume();
        console.log(`[G4F] Redirecting to: ${res.headers.location}`);
        downloadToFile(
          new URL(res.headers.location, url).toString(),
          dest,
          redirectsLeft - 1,
        )
          .then(resolve)
          .catch(reject);
        return;
      }
      if (status !== 200) {
        reject(new Error(`Download failed with status ${status} from ${url}`));
        res.resume();
        return;
      }
      const fileStream = fsSync.createWriteStream(dest);
      pipeline(res, fileStream).then(resolve).catch(reject);
    });
    request.on("error", reject);
  });
}

/**
 * Download GPT4Free binary
 * @param forceUpdate - If true, re-download even if already installed
 */
async function downloadG4fBinary(
  forceUpdate = false,
): Promise<{ path: string; wasDownloaded: boolean }> {
  const platformKey = getG4fPlatformKey();
  const asset = G4F_ASSETS[platformKey];
  if (!asset) {
    throw new Error(`Unsupported platform for gpt4free: ${platformKey}`);
  }
  const targetDir = path.join(ROOT_DIR, "bin", "gpt4free", platformKey);
  const targetPath = getG4fBinaryPath(platformKey);

  // Skip download if already exists and not forcing update
  if (!forceUpdate && (await fileExists(targetPath))) {
    console.log("[G4F] Binary already installed, skipping download");
    return { path: targetPath, wasDownloaded: false };
  }

  // If forcing update, remove existing binary first
  if (forceUpdate && (await fileExists(targetPath))) {
    console.log("[G4F] Force update: removing existing binary");
    await fs.rm(targetPath, { force: true });
  }

  console.log("[G4F] Downloading GPT4Free binary...");
  await fs.mkdir(targetDir, { recursive: true });
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "g4f-download-"));
  try {
    const downloadPath = path.join(tmpDir, asset.name);
    await downloadToFile(`${G4F_RELEASE_BASE}/${asset.name}`, downloadPath);
    if (asset.archive === "zip") {
      throw new Error(
        "Windows zip extraction not implemented - please extract manually",
      );
    } else {
      await fs.rename(downloadPath, targetPath);
      await fs.chmod(targetPath, 0o755);
    }
    console.log("[G4F] Download complete");
    return { path: targetPath, wasDownloaded: true };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

async function resolveG4fPath(
  forceUpdate = false,
): Promise<{ path: string; wasDownloaded: boolean }> {
  const override = process.env.G4F_PATH;
  if (override) return { path: override, wasDownloaded: false };
  return await downloadG4fBinary(forceUpdate);
}

export async function isG4fServerHealthy(): Promise<boolean> {
  try {
    const status = await fetchStatus(buildOpenAiUrl(G4F_API_URL, "/models"));
    return status >= 200 && status < 500;
  } catch {
    return false;
  }
}

/**
 * Start GPT4Free server
 * @param forceUpdate - If true, force re-download of the binary before starting
 * @returns Status info including whether binary was downloaded and if server was already running
 */
export async function startG4fServer(forceUpdate = false): Promise<{
  wasAlreadyRunning: boolean;
  wasDownloaded: boolean;
}> {
  // If already healthy and not forcing update, return immediately
  if (await isG4fServerHealthy()) {
    if (!forceUpdate) {
      return { wasAlreadyRunning: true, wasDownloaded: false };
    }
    // If force update requested, stop existing server first
    stopG4fServer();
  }

  let wasDownloaded = false;

  if (!g4fStartupPromise) {
    g4fStartupPromise = (async () => {
      const resolved = await resolveG4fPath(forceUpdate);
      wasDownloaded = resolved.wasDownloaded;

      await new Promise<void>((resolve, reject) => {
        const child = spawn(resolved.path, [], {
          stdio: ["ignore", "ignore", "pipe"],
          cwd: ROOT_DIR,
          env: process.env,
        });
        g4fProcess = child;
        child.on("error", (err: Error) => {
          g4fProcess = null;
          g4fStartupPromise = null;
          reject(err);
        });
        child.on("exit", () => {
          g4fProcess = null;
          g4fStartupPromise = null;
        });
        resolve();
      });

      const deadline =
        G4F_STARTUP_TIMEOUT_MS > 0 ? Date.now() + G4F_STARTUP_TIMEOUT_MS : null;
      while (!deadline || Date.now() < deadline) {
        if (await isG4fServerHealthy()) return;
        if (!g4fProcess) {
          throw new Error("gpt4free process exited before it became ready.");
        }
        await new Promise((r) => setTimeout(r, 250));
      }
      throw new Error("Timed out waiting for gpt4free to start.");
    })();
  }
  try {
    await g4fStartupPromise;
    return { wasAlreadyRunning: false, wasDownloaded };
  } catch (err) {
    g4fStartupPromise = null;
    throw err;
  }
}

async function ensureG4fServerReady(): Promise<void> {
  if (await isG4fServerHealthy()) return;
  throw new Error(
    "gpt4free server is not running. POST to /api/gpt4free/connect to start it.",
  );
}

/**
 * Stop GPT4Free server (for cleanup)
 */
export function stopG4fServer(): void {
  if (g4fProcess) {
    g4fProcess.kill("SIGTERM");
    g4fProcess = null;
  }
}

/**
 * GPT4Free provider handler
 */
export async function handleGpt4free(
  ctx: ProviderContext,
): Promise<ProviderResult> {
  await ensureG4fServerReady();

  // Optimize messages for context window
  const optimizedMessages = prepareMessages(ctx.messages, "gpt4free");

  console.log(
    "[G4F] Sending request to gpt4free with model:",
    ctx.model || "gpt-4o",
  );
  const response = await proxyPost(
    buildOpenAiUrl(G4F_API_URL, "/chat/completions"),
    {
      model: ctx.model || "gpt-4o",
      messages: optimizedMessages,
      temperature: ctx.temperature ?? 0.7,
    },
  );

  console.log("[G4F] Response status:", response.status);
  console.log(
    "[G4F] Response data:",
    JSON.stringify(response.data).slice(0, 500),
  );

  const text = response.data?.choices?.[0]?.message?.content ?? "";
  return { text, usage: response.data?.usage };
}
