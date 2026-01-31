/**
 * Utility functions for HTTP handling and data parsing
 */

import http from 'node:http';
import https from 'node:https';
import type { JsonRecord } from './types.js';

/**
 * Send JSON response
 */
export function json(res: http.ServerResponse, statusCode: number, payload: JsonRecord): void {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization',
  });
  res.end(body);
}

/**
 * Send plain text response
 */
export function text(res: http.ServerResponse, statusCode: number, body: string): void {
  res.writeHead(statusCode, {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(body);
}

/**
 * Send 404 Not Found response
 */
export function notFound(res: http.ServerResponse): void {
  text(res, 404, 'Not found');
}

/**
 * Read request body as string
 */
export async function readRequestBody(
  req: http.IncomingMessage,
  limitBytes = 10_000_000,
): Promise<string> {
  return await new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/**
 * Read and parse JSON from request body
 */
export async function readJson(
  req: http.IncomingMessage,
  limitBytes = 10_000_000,
): Promise<JsonRecord> {
  const raw = await readRequestBody(req, limitBytes);
  if (!raw.trim()) return {};
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('JSON body must be an object');
  }
  return parsed as JsonRecord;
}

/**
 * Parse value as string
 */
export function asString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

/**
 * Parse value as object
 */
export function asObject(value: unknown): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as JsonRecord;
}

/**
 * Proxy POST request to another server
 */
export async function proxyPost(
  url: string,
  body: JsonRecord,
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

/**
 * Build OpenAI-compatible URL
 */
export function buildOpenAiUrl(baseUrl: string, endpoint: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  if (base.endsWith('/v1')) return `${base}${endpoint}`;
  return `${base}/v1${endpoint}`;
}

/**
 * Fetch HTTP status from URL
 */
export async function fetchStatus(url: string): Promise<number> {
  const urlObj = new URL(url);
  const requester = urlObj.protocol === 'https:' ? https : http;
  return await new Promise((resolve, reject) => {
    const req = requester.request(urlObj, { method: 'GET' }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode || 0));
    });
    req.on('error', reject);
    req.end();
  });
}
