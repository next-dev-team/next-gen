const Conf = require("conf");
const nodeCrypto = require("crypto");

const store = new Conf({ projectName: "next-gen-scrum" });

const createId = () =>
  typeof nodeCrypto?.randomUUID === "function"
    ? nodeCrypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const nowIso = () => new Date().toISOString();

const defaultState = () => {
  const boardId = createId();
  const listNames = ["Backlog", "Todo", "In Progress", "Done"];
  return {
    version: 1,
    activeBoardId: boardId,
    boards: [
      {
        id: boardId,
        name: "Team Board",
        createdAt: nowIso(),
        updatedAt: nowIso(),
        lists: listNames.map((name) => ({
          id: createId(),
          name,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          cards: [],
        })),
      },
    ],
  };
};

const getState = () => {
  const current = store.get("scrumState");
  if (current?.boards?.length) return current;
  const seed = defaultState();
  store.set("scrumState", seed);
  return seed;
};

const setState = (next) => {
  store.set("scrumState", next);
  return getState();
};

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

const main = async () => {
  const [{ McpServer }, { StdioServerTransport }, zod] = await Promise.all([
    import("@modelcontextprotocol/sdk/server/mcp.js"),
    import("@modelcontextprotocol/sdk/server/stdio.js"),
    import("zod"),
  ]);

  const z = zod.z;

  const server = new McpServer({
    name: "next-gen-scrum",
    version: "1.0.0",
  });

  server.registerTool(
    "scrum_get_state",
    {
      title: "Get Scrum State",
      description: "Return the current Scrum state",
      inputSchema: {},
      outputSchema: { state: z.any() },
    },
    async () => {
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
      description: "Create a new board",
      inputSchema: { name: z.string() },
      outputSchema: { state: z.any(), boardId: z.string() },
    },
    async ({ name }) => {
      const boardName = String(name || "").trim();
      if (!boardName) throw new Error("name is required");

      const state = getState();
      const isDuplicate = state.boards.some(
        (b) => b.name.toLowerCase() === boardName.toLowerCase()
      );
      if (isDuplicate) {
        throw new Error(`A board with name "${boardName}" already exists`);
      }

      const boardId = createId();
      const board = {
        id: boardId,
        name: boardName,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        lists: [
          {
            id: createId(),
            name: "Backlog",
            createdAt: nowIso(),
            updatedAt: nowIso(),
            cards: [],
          },
          {
            id: createId(),
            name: "Todo",
            createdAt: nowIso(),
            updatedAt: nowIso(),
            cards: [],
          },
          {
            id: createId(),
            name: "In Progress",
            createdAt: nowIso(),
            updatedAt: nowIso(),
            cards: [],
          },
          {
            id: createId(),
            name: "Done",
            createdAt: nowIso(),
            updatedAt: nowIso(),
            cards: [],
          },
        ],
      };

      const next = setState({
        ...state,
        activeBoardId: boardId,
        boards: [...state.boards, board],
      });

      return withStructured({ state: next, boardId });
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
      const state = getState();
      const remaining = state.boards.filter((b) => b.id !== boardId);
      const nextActive =
        state.activeBoardId === boardId
          ? remaining[0]?.id || null
          : state.activeBoardId;
      const next = remaining.length
        ? setState({ ...state, boards: remaining, activeBoardId: nextActive })
        : setState(defaultState());

      return withStructured({ state: next });
    }
  );

  server.registerTool(
    "scrum_add_list",
    {
      title: "Add List",
      description: "Add a list to a board",
      inputSchema: { boardId: z.string(), name: z.string() },
      outputSchema: { state: z.any() },
    },
    async ({ boardId, name }) => {
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
              name: listName,
              createdAt: nowIso(),
              updatedAt: nowIso(),
              cards: [],
            },
          ],
        }))
      );
      return withStructured({ state: next });
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
      return withStructured({ state: next });
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
      const state = getState();
      const next = setState(
        updateBoardInState(state, boardId, (board) => ({
          ...board,
          lists: board.lists.filter((l) => l.id !== listId),
        }))
      );
      return withStructured({ state: next });
    }
  );

  server.registerTool(
    "scrum_add_card",
    {
      title: "Add Card",
      description: "Add a card to a list",
      inputSchema: {
        boardId: z.string(),
        listId: z.string(),
        title: z.string(),
        description: z.string().optional(),
        assignee: z.string().optional(),
        points: z.number().nullable().optional(),
        labels: z.array(z.string()).optional(),
      },
      outputSchema: { state: z.any(), cardId: z.string() },
    },
    async ({
      boardId,
      listId,
      title,
      description,
      assignee,
      points,
      labels,
    }) => {
      const trimmed = String(title || "").trim();
      if (!trimmed) throw new Error("title is required");

      const card = {
        id: createId(),
        title: trimmed,
        description: String(description || "").trim(),
        assignee: String(assignee || "").trim(),
        points: typeof points === "number" ? points : null,
        labels: Array.isArray(labels) ? labels.map((l) => String(l)) : [],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      const state = getState();
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

      return withStructured({ state: next, cardId: card.id });
    }
  );

  server.registerTool(
    "scrum_update_card",
    {
      title: "Update Card",
      description: "Update a card",
      inputSchema: {
        boardId: z.string(),
        listId: z.string(),
        cardId: z.string(),
        patch: z.any(),
      },
      outputSchema: { state: z.any() },
    },
    async ({ boardId, listId, cardId, patch }) => {
      if (!patch || typeof patch !== "object")
        throw new Error("patch must be an object");
      const state = getState();
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
      return withStructured({ state: next });
    }
  );

  server.registerTool(
    "scrum_delete_card",
    {
      title: "Delete Card",
      description: "Delete a card",
      inputSchema: {
        boardId: z.string(),
        listId: z.string(),
        cardId: z.string(),
      },
      outputSchema: { state: z.any() },
    },
    async ({ boardId, listId, cardId }) => {
      const state = getState();
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
      return withStructured({ state: next });
    }
  );

  server.registerTool(
    "scrum_move_card",
    {
      title: "Move Card",
      description: "Move a card between lists or reorder",
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
      const state = getState();
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

      return withStructured({ state: next });
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
};

main().catch((err) => {
  process.stderr.write(`${err?.message || String(err)}\n`);
  process.exit(1);
});
