#!/usr/bin/env node

/**
 * Scrum MCP end-to-end smoke test.
 * Starts the local server, executes full board lifecycle operations,
 * and exits non-zero on any failure.
 */

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");

const SERVER_URL = "http://127.0.0.1:3847";
const APP_ROOT = path.resolve(__dirname, "..");

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(timeoutMs = 15_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(`${SERVER_URL}/api/state`);
      if (res.ok) return true;
    } catch {
      // retry
    }
    await delay(250);
  }
  throw new Error("Timed out waiting for scrum MCP server");
}

async function post(pathname, body) {
  const res = await fetch(`${SERVER_URL}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${pathname} failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return json;
}

async function main() {
  console.log("[scrum-e2e] starting scrum MCP server...");
  const server = spawn("node", ["scripts/scrum-mcp-server.js"], {
    cwd: APP_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });

  server.stdout.on("data", (d) => process.stdout.write(`[server] ${d}`));
  server.stderr.on("data", (d) => process.stderr.write(`[server:err] ${d}`));

  try {
    await waitForServer();

    const boardName = `E2E Scrum ${Date.now()}`;
    const createdBoard = await post("/api/board/create", {
      name: boardName,
      type: "bmad",
    });

    const boardId = createdBoard.boardId;
    assert.ok(boardId, "boardId should be returned");

    const stateRes = await fetch(`${SERVER_URL}/api/state`);
    const state = await stateRes.json();
    const board = state.boards.find((b) => b.id === boardId);
    assert.ok(board, "created board should exist");

    const backlog = board.lists.find((l) => l.statusId === "backlog") || board.lists[0];
    const inProgress =
      board.lists.find((l) => l.statusId === "in-progress") || board.lists[1];
    assert.ok(backlog, "backlog list should exist");
    assert.ok(inProgress, "in-progress list should exist");

    const addedCard = await post("/api/card/add", {
      boardId,
      listId: backlog.id,
      title: "E2E story",
      description: "Validate scrum workflow",
      priority: "high",
      points: 3,
    });

    const cardId = addedCard.cardId;
    assert.ok(cardId, "cardId should be returned");

    await post("/api/card/move", {
      boardId,
      cardId,
      fromListId: backlog.id,
      toListId: inProgress.id,
      toIndex: 0,
    });

    await post("/api/card/update", {
      boardId,
      listId: inProgress.id,
      cardId,
      patch: { assignee: "pm-user", labels: ["e2e", "bmad"] },
    });

    const finalStateRes = await fetch(`${SERVER_URL}/api/state`);
    const finalState = await finalStateRes.json();
    const finalBoard = finalState.boards.find((b) => b.id === boardId);
    const finalList = finalBoard.lists.find((l) => l.id === inProgress.id);
    const finalCard = finalList.cards.find((c) => c.id === cardId);

    assert.equal(finalCard.assignee, "pm-user");
    assert.ok(Array.isArray(finalCard.labels) && finalCard.labels.includes("bmad"));

    console.log("[scrum-e2e] ✅ passed");
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(`[scrum-e2e] ❌ ${err?.message || err}`);
  process.exit(1);
});
