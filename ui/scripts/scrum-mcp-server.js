const Conf = require("conf");
const nodeCrypto = require("crypto");
const http = require("http");
const url = require("url");

const store = new Conf({ projectName: "next-gen-scrum" });

// ============ IDs & Utils ============
const createId = () =>
  typeof nodeCrypto?.randomUUID === "function"
    ? nodeCrypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const nowIso = () => new Date().toISOString();

// ============ BMAD-Method Status Definitions ============
// Story Status Flow: backlog → ready-for-dev → in-progress → review → done
const STORY_STATUSES = [
  { id: "backlog", name: "Backlog", color: "#6b7280" },
  { id: "ready-for-dev", name: "Ready for Dev", color: "#3b82f6" },
  { id: "in-progress", name: "In Progress", color: "#f59e0b" },
  { id: "review", name: "Review", color: "#8b5cf6" },
  { id: "done", name: "Done", color: "#22c55e" },
];

// Epic Status Flow: backlog → in-progress → done
const EPIC_STATUSES = [
  { id: "backlog", name: "Backlog" },
  { id: "in-progress", name: "In Progress" },
  { id: "done", name: "Done" },
];

// ============ State Management ============
const defaultState = () => {
  const boardId = createId();
  return {
    version: 2,
    stateVersion: 1, // For optimistic locking / conflict prevention
    activeBoardId: boardId,
    boards: [
      {
        id: boardId,
        name: "Sprint Board",
        type: "bmad", // bmad-method board
        createdAt: nowIso(),
        updatedAt: nowIso(),
        lists: STORY_STATUSES.map((status) => ({
          id: createId(),
          statusId: status.id,
          name: status.name,
          color: status.color,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          cards: [],
        })),
      },
    ],
    epics: [], // Track epics separately for bmad-method
    locks: {}, // Card locks for conflict prevention: { cardId: { userId, lockedAt, expiresAt } }
  };
};

const getState = () => {
  const current = store.get("scrumState");
  if (current?.boards?.length) {
    // Ensure new fields exist
    if (!current.locks) current.locks = {};
    if (typeof current.stateVersion !== "number") current.stateVersion = 1;
    return current;
  }
  const seed = defaultState();
  store.set("scrumState", seed);
  return seed;
};

const setState = (next) => {
  // Increment state version for optimistic locking
  next.stateVersion = (next.stateVersion || 0) + 1;
  store.set("scrumState", next);
  broadcastStateUpdate();
  return getState();
};

// ============ SSE Connections ============
const sseClients = new Set();

const broadcastStateUpdate = () => {
  const state = getState();
  const event = {
    type: "state_update",
    data: state,
    timestamp: nowIso(),
  };
  const message = `event: state_update\ndata: ${JSON.stringify(event)}\n\n`;

  for (const client of sseClients) {
    try {
      client.res.write(message);
    } catch (err) {
      sseClients.delete(client);
    }
  }
};

const broadcastEvent = (eventType, payload) => {
  const event = {
    type: eventType,
    data: payload,
    timestamp: nowIso(),
  };
  const message = `event: ${eventType}\ndata: ${JSON.stringify(event)}\n\n`;

  for (const client of sseClients) {
    try {
      client.res.write(message);
    } catch (err) {
      sseClients.delete(client);
    }
  }
};

// ============ Lock System for Conflict Prevention ============
const LOCK_DURATION_MS = 30000; // 30 seconds lock

const acquireLock = (cardId, userId = "anonymous") => {
  const state = getState();
  const now = Date.now();
  const existingLock = state.locks[cardId];

  // Check if there's an existing valid lock by another user
  if (existingLock && existingLock.userId !== userId) {
    const expiresAt = new Date(existingLock.expiresAt).getTime();
    if (now < expiresAt) {
      return {
        success: false,
        lockedBy: existingLock.userId,
        expiresAt: existingLock.expiresAt,
      };
    }
  }

  // Acquire or refresh lock
  state.locks[cardId] = {
    userId,
    lockedAt: nowIso(),
    expiresAt: new Date(now + LOCK_DURATION_MS).toISOString(),
  };
  setState(state);

  broadcastEvent("card_locked", {
    cardId,
    userId,
    expiresAt: state.locks[cardId].expiresAt,
  });

  return { success: true };
};

const releaseLock = (cardId, userId = "anonymous") => {
  const state = getState();
  const existingLock = state.locks[cardId];

  if (existingLock && (existingLock.userId === userId || !userId)) {
    delete state.locks[cardId];
    setState(state);
    broadcastEvent("card_unlocked", { cardId });
    return { success: true };
  }

  return { success: false, reason: "Not lock owner" };
};

const cleanExpiredLocks = () => {
  const state = getState();
  const now = Date.now();
  let hasChanges = false;

  for (const [cardId, lock] of Object.entries(state.locks)) {
    const expiresAt = new Date(lock.expiresAt).getTime();
    if (now >= expiresAt) {
      delete state.locks[cardId];
      hasChanges = true;
    }
  }

  if (hasChanges) {
    setState(state);
  }
};

// Clean expired locks every 10 seconds
setInterval(cleanExpiredLocks, 10000);

// ============ Board Operations ============
const findBoard = (state, boardId) =>
  state.boards.find((b) => b.id === boardId) || null;

const updateBoardInState = (state, boardId, updater) => {
  const boards = state.boards.map((b) => {
    if (b.id !== boardId) return b;
    const next = updater(b);
    return { ...next, updatedAt: nowIso() };
  });
  return { ...state, boards };
};

const moveCardInBoard = ({ board, cardId, fromListId, toListId, toIndex }) => {
  let movingCard = null;
  const listsAfterRemove = board.lists.map((list) => {
    if (list.id !== fromListId) return list;
    const nextCards = list.cards.filter((c) => {
      if (c.id !== cardId) return true;
      movingCard = c;
      return false;
    });
    return { ...list, cards: nextCards, updatedAt: nowIso() };
  });

  if (!movingCard) return board;

  // Update card status based on target list
  const targetList = board.lists.find((l) => l.id === toListId);
  if (targetList?.statusId) {
    movingCard.status = targetList.statusId;
  }

  const normalizedToIndex = Math.max(0, Number.isFinite(toIndex) ? toIndex : 0);
  const listsAfterInsert = listsAfterRemove.map((list) => {
    if (list.id !== toListId) return list;
    const nextCards = [...list.cards];
    const safeIndex = Math.min(normalizedToIndex, nextCards.length);
    nextCards.splice(safeIndex, 0, { ...movingCard, updatedAt: nowIso() });
    return { ...list, cards: nextCards, updatedAt: nowIso() };
  });

  return { ...board, lists: listsAfterInsert, updatedAt: nowIso() };
};

const withStructured = (output) => ({
  content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
  structuredContent: output,
});

// ============ HTTP SSE Server ============
const SSE_PORT = process.env.SCRUM_MCP_PORT || 3847;

const httpServer = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-User-Id, X-State-Version"
  );

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // SSE endpoint for real-time updates
  if (pathname === "/sse" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const clientId = parsedUrl.query.userId || createId();
    const client = { id: clientId, res };
    sseClients.add(client);

    // Send initial state
    const initialState = getState();
    res.write(
      `event: connected\ndata: ${JSON.stringify({
        clientId,
        state: initialState,
      })}\n\n`
    );

    // Heartbeat
    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat\n\n`);
      } catch {
        clearInterval(heartbeat);
        sseClients.delete(client);
      }
    }, 15000);

    req.on("close", () => {
      clearInterval(heartbeat);
      sseClients.delete(client);
    });

    return;
  }

  // REST API endpoints
  if (pathname === "/api/state" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(getState()));
    return;
  }

  // Handle POST requests with body parsing
  if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const data = body ? JSON.parse(body) : {};
        const userId = req.headers["x-user-id"] || data.userId || "anonymous";
        const clientStateVersion =
          parseInt(req.headers["x-state-version"]) || data.stateVersion;

        let result;

        switch (pathname) {
          case "/api/state":
            if (data.state) {
              result = { state: setState(data.state) };
            }
            break;

          case "/api/board/create":
            result = await handleCreateBoard(data);
            break;

          case "/api/board/delete":
            result = await handleDeleteBoard(data);
            break;

          case "/api/list/add":
            result = await handleAddList(data);
            break;

          case "/api/list/rename":
            result = await handleRenameList(data);
            break;

          case "/api/list/delete":
            result = await handleDeleteList(data);
            break;

          case "/api/card/add":
            result = await handleAddCard(data);
            break;

          case "/api/card/update":
            result = await handleUpdateCard(data, userId, clientStateVersion);
            break;

          case "/api/card/delete":
            result = await handleDeleteCard(data);
            break;

          case "/api/card/move":
            result = await handleMoveCard(data, userId, clientStateVersion);
            break;

          case "/api/lock/acquire":
            result = acquireLock(data.cardId, userId);
            break;

          case "/api/lock/release":
            result = releaseLock(data.cardId, userId);
            break;

          case "/api/epic/create":
            result = await handleCreateEpic(data);
            break;

          case "/api/epic/update":
            result = await handleUpdateEpic(data);
            break;

          default:
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Not found" }));
            return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });

    return;
  }

  // Info endpoint
  if (pathname === "/" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        name: "next-gen-scrum-mcp",
        version: "2.0.0",
        description: "BMAD-Method Kanban MCP Server with SSE",
        endpoints: {
          sse: "/sse - Server-Sent Events for real-time updates",
          state: "/api/state - GET/POST full state",
          board: {
            create: "/api/board/create",
            delete: "/api/board/delete",
          },
          list: {
            add: "/api/list/add",
            rename: "/api/list/rename",
            delete: "/api/list/delete",
          },
          card: {
            add: "/api/card/add",
            update: "/api/card/update",
            delete: "/api/card/delete",
            move: "/api/card/move",
          },
          lock: {
            acquire: "/api/lock/acquire",
            release: "/api/lock/release",
          },
          epic: {
            create: "/api/epic/create",
            update: "/api/epic/update",
          },
        },
        features: [
          "BMAD-Method workflow (backlog → ready-for-dev → in-progress → review → done)",
          "Real-time SSE updates",
          "Optimistic locking for conflict prevention",
          "Epic and Story management",
        ],
      })
    );
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

// ============ API Handlers ============
async function handleCreateBoard(data) {
  const boardName = String(data.name || "").trim();
  if (!boardName) throw new Error("name is required");

  const state = getState();
  const isDuplicate = state.boards.some(
    (b) => b.name.toLowerCase() === boardName.toLowerCase()
  );
  if (isDuplicate) {
    throw new Error(`A board with name "${boardName}" already exists`);
  }

  const boardId = createId();
  const isBmad = data.type === "bmad";

  const board = {
    id: boardId,
    name: boardName,
    type: isBmad ? "bmad" : "custom",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    lists: isBmad
      ? STORY_STATUSES.map((status) => ({
          id: createId(),
          statusId: status.id,
          name: status.name,
          color: status.color,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          cards: [],
        }))
      : (data.lists || ["Backlog", "Todo", "In Progress", "Done"]).map(
          (name) => ({
            id: createId(),
            name,
            createdAt: nowIso(),
            updatedAt: nowIso(),
            cards: [],
          })
        ),
  };

  const next = setState({
    ...state,
    activeBoardId: boardId,
    boards: [...state.boards, board],
  });

  return { state: next, boardId };
}

async function handleDeleteBoard(data) {
  const { boardId } = data;
  const state = getState();
  const remaining = state.boards.filter((b) => b.id !== boardId);
  const nextActive =
    state.activeBoardId === boardId
      ? remaining[0]?.id || null
      : state.activeBoardId;
  const next = remaining.length
    ? setState({ ...state, boards: remaining, activeBoardId: nextActive })
    : setState(defaultState());

  return { state: next };
}

async function handleAddList(data) {
  const { boardId, name, statusId, color } = data;
  const listName = String(name || "").trim();
  if (!listName) throw new Error("name is required");

  const state = getState();
  const next = setState(
    updateBoardInState(state, boardId, (board) => ({
      ...board,
      lists: [
        ...board.lists,
        {
          id: createId(),
          statusId: statusId || null,
          name: listName,
          color: color || null,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          cards: [],
        },
      ],
    }))
  );
  return { state: next };
}

async function handleRenameList(data) {
  const { boardId, listId, name } = data;
  const listName = String(name || "").trim();
  if (!listName) throw new Error("name is required");

  const state = getState();
  const next = setState(
    updateBoardInState(state, boardId, (board) => ({
      ...board,
      lists: board.lists.map((l) =>
        l.id === listId ? { ...l, name: listName, updatedAt: nowIso() } : l
      ),
    }))
  );
  return { state: next };
}

async function handleDeleteList(data) {
  const { boardId, listId } = data;
  const state = getState();
  const next = setState(
    updateBoardInState(state, boardId, (board) => ({
      ...board,
      lists: board.lists.filter((l) => l.id !== listId),
    }))
  );
  return { state: next };
}

async function handleAddCard(data) {
  const {
    boardId,
    listId,
    title,
    description,
    assignee,
    points,
    labels,
    epicId,
    priority,
  } = data;
  const trimmed = String(title || "").trim();
  if (!trimmed) throw new Error("title is required");

  const state = getState();
  const board = findBoard(state, boardId);
  const list = board?.lists.find((l) => l.id === listId);

  const card = {
    id: createId(),
    title: trimmed,
    description: String(description || "").trim(),
    assignee: String(assignee || "").trim(),
    points: typeof points === "number" ? points : null,
    labels: Array.isArray(labels) ? labels.map((l) => String(l)) : [],
    epicId: epicId || null,
    priority: priority || "medium",
    status: list?.statusId || "backlog",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  const next = setState(
    updateBoardInState(state, boardId, (board) => ({
      ...board,
      lists: board.lists.map((l) =>
        l.id === listId
          ? { ...l, cards: [card, ...l.cards], updatedAt: nowIso() }
          : l
      ),
    }))
  );

  broadcastEvent("card_created", { card, boardId, listId });
  return { state: next, cardId: card.id };
}

async function handleUpdateCard(data, userId, clientStateVersion) {
  const { boardId, listId, cardId, patch } = data;
  if (!patch || typeof patch !== "object")
    throw new Error("patch must be an object");

  const state = getState();

  // Check for conflicts using state version
  if (clientStateVersion && clientStateVersion < state.stateVersion) {
    // Check if card is locked by another user
    const lock = state.locks[cardId];
    if (lock && lock.userId !== userId) {
      const now = Date.now();
      const expiresAt = new Date(lock.expiresAt).getTime();
      if (now < expiresAt) {
        throw new Error(
          `Card is being edited by ${lock.userId}. Please try again.`
        );
      }
    }
  }

  const next = setState(
    updateBoardInState(state, boardId, (board) => ({
      ...board,
      lists: board.lists.map((l) => {
        if (l.id !== listId) return l;
        return {
          ...l,
          cards: l.cards.map((c) =>
            c.id === cardId ? { ...c, ...patch, updatedAt: nowIso() } : c
          ),
          updatedAt: nowIso(),
        };
      }),
    }))
  );

  broadcastEvent("card_updated", { cardId, patch, boardId, listId });
  return { state: next };
}

async function handleDeleteCard(data) {
  const { boardId, listId, cardId } = data;
  const state = getState();

  // Remove any locks for this card
  delete state.locks[cardId];

  const next = setState(
    updateBoardInState(state, boardId, (board) => ({
      ...board,
      lists: board.lists.map((l) =>
        l.id === listId
          ? {
              ...l,
              cards: l.cards.filter((c) => c.id !== cardId),
              updatedAt: nowIso(),
            }
          : l
      ),
    }))
  );

  broadcastEvent("card_deleted", { cardId, boardId, listId });
  return { state: next };
}

async function handleMoveCard(data, userId, clientStateVersion) {
  const { boardId, cardId, fromListId, toListId, toIndex } = data;
  const state = getState();

  // Check for lock conflicts
  const lock = state.locks[cardId];
  if (lock && lock.userId !== userId) {
    const now = Date.now();
    const expiresAt = new Date(lock.expiresAt).getTime();
    if (now < expiresAt) {
      throw new Error(`Card is locked by ${lock.userId}. Cannot move.`);
    }
  }

  const board = findBoard(state, boardId);
  if (!board) throw new Error("board not found");

  const nextBoard = moveCardInBoard({
    board,
    cardId,
    fromListId,
    toListId,
    toIndex,
  });

  const next = setState({
    ...state,
    boards: state.boards.map((b) => (b.id === boardId ? nextBoard : b)),
  });

  const targetList = nextBoard.lists.find((l) => l.id === toListId);
  broadcastEvent("card_moved", {
    cardId,
    fromListId,
    toListId,
    toIndex,
    newStatus: targetList?.statusId,
    boardId,
  });

  return { state: next };
}

async function handleCreateEpic(data) {
  const { name, description, projectKey } = data;
  const epicName = String(name || "").trim();
  if (!epicName) throw new Error("name is required");

  const state = getState();
  const epic = {
    id: createId(),
    name: epicName,
    description: String(description || "").trim(),
    projectKey: projectKey || null,
    status: "backlog",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  const next = setState({
    ...state,
    epics: [...(state.epics || []), epic],
  });

  broadcastEvent("epic_created", { epic });
  return { state: next, epicId: epic.id };
}

async function handleUpdateEpic(data) {
  const { epicId, patch } = data;
  if (!patch || typeof patch !== "object")
    throw new Error("patch must be an object");

  const state = getState();
  const next = setState({
    ...state,
    epics: (state.epics || []).map((e) =>
      e.id === epicId ? { ...e, ...patch, updatedAt: nowIso() } : e
    ),
  });

  broadcastEvent("epic_updated", { epicId, patch });
  return { state: next };
}

// ============ MCP Server (stdio) ============
const main = async (enableStdio = true, logger = console) => {
  const [{ McpServer }, { StdioServerTransport }, zod] = await Promise.all([
    import("@modelcontextprotocol/sdk/server/mcp.js"),
    import("@modelcontextprotocol/sdk/server/stdio.js"),
    import("zod"),
  ]);

  const z = zod.z;

  const server = new McpServer({
    name: "next-gen-scrum",
    version: "2.0.0",
    description: "BMAD-Method Kanban MCP Server with SSE support",
  });

  // ============ MCP Tools ============

  server.registerTool(
    "scrum_get_state",
    {
      title: "Get Scrum State",
      description:
        "Return the current Scrum state including all boards, epics, and locks",
      inputSchema: {},
      outputSchema: { state: z.any() },
    },
    async () => {
      cleanExpiredLocks();
      const output = { state: getState() };
      return withStructured(output);
    }
  );

  server.registerTool(
    "scrum_set_state",
    {
      title: "Set Scrum State",
      description: "Replace the entire Scrum state",
      inputSchema: { state: z.any() },
      outputSchema: { state: z.any() },
    },
    async ({ state }) => {
      if (!state || typeof state !== "object")
        throw new Error("state must be an object");
      const output = { state: setState(state) };
      return withStructured(output);
    }
  );

  server.registerTool(
    "scrum_create_board",
    {
      title: "Create Board",
      description:
        "Create a new board. Set type to 'bmad' for BMAD-Method workflow (backlog → ready-for-dev → in-progress → review → done)",
      inputSchema: {
        name: z.string(),
        type: z.enum(["bmad", "custom"]).optional(),
      },
      outputSchema: { state: z.any(), boardId: z.string() },
    },
    async ({ name, type }) => {
      const result = await handleCreateBoard({ name, type });
      return withStructured(result);
    }
  );

  server.registerTool(
    "scrum_delete_board",
    {
      title: "Delete Board",
      description: "Delete a board by id",
      inputSchema: { boardId: z.string() },
      outputSchema: { state: z.any() },
    },
    async ({ boardId }) => {
      const result = await handleDeleteBoard({ boardId });
      return withStructured(result);
    }
  );

  server.registerTool(
    "scrum_add_list",
    {
      title: "Add List",
      description: "Add a list to a board",
      inputSchema: {
        boardId: z.string(),
        name: z.string(),
        statusId: z.string().optional(),
        color: z.string().optional(),
      },
      outputSchema: { state: z.any() },
    },
    async ({ boardId, name, statusId, color }) => {
      const result = await handleAddList({ boardId, name, statusId, color });
      return withStructured(result);
    }
  );

  server.registerTool(
    "scrum_rename_list",
    {
      title: "Rename List",
      description: "Rename a list",
      inputSchema: {
        boardId: z.string(),
        listId: z.string(),
        name: z.string(),
      },
      outputSchema: { state: z.any() },
    },
    async ({ boardId, listId, name }) => {
      const result = await handleRenameList({ boardId, listId, name });
      return withStructured(result);
    }
  );

  server.registerTool(
    "scrum_delete_list",
    {
      title: "Delete List",
      description: "Delete a list",
      inputSchema: { boardId: z.string(), listId: z.string() },
      outputSchema: { state: z.any() },
    },
    async ({ boardId, listId }) => {
      const result = await handleDeleteList({ boardId, listId });
      return withStructured(result);
    }
  );

  server.registerTool(
    "scrum_add_card",
    {
      title: "Add Card/Story",
      description:
        "Add a card/story to a list. For BMAD-Method, cards represent stories.",
      inputSchema: {
        boardId: z.string(),
        listId: z.string(),
        title: z.string(),
        description: z.string().optional(),
        assignee: z.string().optional(),
        points: z.number().nullable().optional(),
        labels: z.array(z.string()).optional(),
        epicId: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
      },
      outputSchema: { state: z.any(), cardId: z.string() },
    },
    async (params) => {
      const result = await handleAddCard(params);
      return withStructured(result);
    }
  );

  server.registerTool(
    "scrum_update_card",
    {
      title: "Update Card/Story",
      description: "Update a card/story",
      inputSchema: {
        boardId: z.string(),
        listId: z.string(),
        cardId: z.string(),
        patch: z.any(),
      },
      outputSchema: { state: z.any() },
    },
    async ({ boardId, listId, cardId, patch }) => {
      const result = await handleUpdateCard(
        { boardId, listId, cardId, patch },
        "mcp-agent"
      );
      return withStructured(result);
    }
  );

  server.registerTool(
    "scrum_delete_card",
    {
      title: "Delete Card/Story",
      description: "Delete a card/story",
      inputSchema: {
        boardId: z.string(),
        listId: z.string(),
        cardId: z.string(),
      },
      outputSchema: { state: z.any() },
    },
    async ({ boardId, listId, cardId }) => {
      const result = await handleDeleteCard({ boardId, listId, cardId });
      return withStructured(result);
    }
  );

  server.registerTool(
    "scrum_move_card",
    {
      title: "Move Card/Story",
      description:
        "Move a card between lists (status columns) or reorder within a list. This changes the story status in BMAD-Method workflow.",
      inputSchema: {
        boardId: z.string(),
        cardId: z.string(),
        fromListId: z.string(),
        toListId: z.string(),
        toIndex: z.number(),
      },
      outputSchema: { state: z.any() },
    },
    async ({ boardId, cardId, fromListId, toListId, toIndex }) => {
      const result = await handleMoveCard(
        { boardId, cardId, fromListId, toListId, toIndex },
        "mcp-agent"
      );
      return withStructured(result);
    }
  );

  server.registerTool(
    "scrum_acquire_lock",
    {
      title: "Acquire Card Lock",
      description:
        "Acquire a lock on a card to prevent concurrent modifications. Locks expire after 30 seconds.",
      inputSchema: {
        cardId: z.string(),
        userId: z.string().optional(),
      },
      outputSchema: {
        success: z.boolean(),
        lockedBy: z.string().optional(),
        expiresAt: z.string().optional(),
      },
    },
    async ({ cardId, userId }) => {
      const result = acquireLock(cardId, userId || "mcp-agent");
      return withStructured(result);
    }
  );

  server.registerTool(
    "scrum_release_lock",
    {
      title: "Release Card Lock",
      description: "Release a lock on a card",
      inputSchema: {
        cardId: z.string(),
        userId: z.string().optional(),
      },
      outputSchema: { success: z.boolean() },
    },
    async ({ cardId, userId }) => {
      const result = releaseLock(cardId, userId || "mcp-agent");
      return withStructured(result);
    }
  );

  server.registerTool(
    "scrum_create_epic",
    {
      title: "Create Epic",
      description: "Create a new epic for BMAD-Method workflow",
      inputSchema: {
        name: z.string(),
        description: z.string().optional(),
        projectKey: z.string().optional(),
      },
      outputSchema: { state: z.any(), epicId: z.string() },
    },
    async ({ name, description, projectKey }) => {
      const result = await handleCreateEpic({ name, description, projectKey });
      return withStructured(result);
    }
  );

  server.registerTool(
    "scrum_update_epic",
    {
      title: "Update Epic",
      description: "Update an epic's properties or status",
      inputSchema: {
        epicId: z.string(),
        patch: z.any(),
      },
      outputSchema: { state: z.any() },
    },
    async ({ epicId, patch }) => {
      const result = await handleUpdateEpic({ epicId, patch });
      return withStructured(result);
    }
  );

  server.registerTool(
    "scrum_get_stories_by_status",
    {
      title: "Get Stories by Status",
      description:
        "Get all stories/cards filtered by status (backlog, ready-for-dev, in-progress, review, done)",
      inputSchema: {
        boardId: z.string(),
        status: z.enum([
          "backlog",
          "ready-for-dev",
          "in-progress",
          "review",
          "done",
        ]),
      },
      outputSchema: { stories: z.array(z.any()) },
    },
    async ({ boardId, status }) => {
      const state = getState();
      const board = findBoard(state, boardId);
      if (!board) throw new Error("Board not found");

      const list = board.lists.find((l) => l.statusId === status);
      const stories = list?.cards || [];

      return withStructured({ stories, count: stories.length, status });
    }
  );

  server.registerTool(
    "scrum_get_next_story",
    {
      title: "Get Next Story to Work On",
      description:
        "Get the next story from ready-for-dev that an agent should work on",
      inputSchema: {
        boardId: z.string(),
      },
      outputSchema: { story: z.any().nullable() },
    },
    async ({ boardId }) => {
      const state = getState();
      const board = findBoard(state, boardId);
      if (!board) throw new Error("Board not found");

      const readyList = board.lists.find((l) => l.statusId === "ready-for-dev");
      const nextStory = readyList?.cards?.[0] || null;

      if (nextStory) {
        // Auto-acquire lock for the agent
        acquireLock(nextStory.id, "mcp-agent");
      }

      return withStructured({ story: nextStory });
    }
  );

  server.registerTool(
    "scrum_complete_story",
    {
      title: "Complete Story",
      description: "Move a story to done status and release its lock",
      inputSchema: {
        boardId: z.string(),
        cardId: z.string(),
        summary: z.string().optional(),
      },
      outputSchema: { state: z.any() },
    },
    async ({ boardId, cardId, summary }) => {
      const state = getState();
      const board = findBoard(state, boardId);
      if (!board) throw new Error("Board not found");

      // Find current list
      let fromListId = null;
      for (const list of board.lists) {
        if (list.cards.some((c) => c.id === cardId)) {
          fromListId = list.id;
          break;
        }
      }

      if (!fromListId) throw new Error("Card not found");

      const doneList = board.lists.find((l) => l.statusId === "done");
      if (!doneList) throw new Error("Done list not found");

      // Move card to done
      const result = await handleMoveCard(
        {
          boardId,
          cardId,
          fromListId,
          toListId: doneList.id,
          toIndex: 0,
        },
        "mcp-agent"
      );

      // Update card with completion summary if provided
      if (summary) {
        await handleUpdateCard(
          {
            boardId,
            listId: doneList.id,
            cardId,
            patch: { completionSummary: summary, completedAt: nowIso() },
          },
          "mcp-agent"
        );
      }

      // Release lock
      releaseLock(cardId, "mcp-agent");

      return withStructured({ state: getState() });
    }
  );

  // Start both MCP (stdio) and HTTP (SSE) servers
  if (enableStdio) {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
};

let isRunning = false;

const start = async (port = SSE_PORT, logCallback = null) => {
  if (isRunning) return;
  isRunning = true;

  const logger = {
    log: (msg) => {
      console.log(msg);
      if (logCallback) logCallback("info", msg);
    },
    error: (msg) => {
      console.error(msg);
      if (logCallback) logCallback("error", msg);
    },
  };

  return new Promise((resolve, reject) => {
    const onListen = () => {
      logger.log(
        `BMAD-Method Kanban MCP SSE Server running on http://localhost:${port}`
      );
      logger.log(`Connect to SSE: http://localhost:${port}/sse`);
      logger.log(`API docs: http://localhost:${port}/`);

      main(false, logger)
        .then(() => resolve(true))
        .catch((err) => {
          logger.error(`Failed to start MCP logic: ${err}`);
          // resolve(false); // Don't reject entire app if MCP stdio fails, but logging is good
          resolve(true);
        });
    };

    if (httpServer.listening) {
      onListen();
      return;
    }

    httpServer.listen(port, onListen);

    httpServer.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        logger.log(`Port ${port} in use, assuming server is running.`);
        resolve(true);
      } else {
        logger.error(`HTTP Server Error: ${err}`);
        reject(err);
      }
    });
  });
};

const stop = () => {
  if (httpServer.listening) {
    httpServer.close();
  }
  isRunning = false;
};

if (require.main === module) {
  start().catch((err) => {
    process.stderr.write(`${err?.message || String(err)}\n`);
    process.exit(1);
  });
}

module.exports = { start, stop };
