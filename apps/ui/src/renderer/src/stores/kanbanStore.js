import { create } from "zustand";

// BMAD-Method Story Status Definitions
export const STORY_STATUSES = [
  {
    id: "backlog",
    name: "Backlog",
    color: "#6b7280",
    description: "Story only exists in epic file",
  },
  {
    id: "ready-for-dev",
    name: "Ready for Dev",
    color: "#3b82f6",
    description: "Story file created in stories folder",
  },
  {
    id: "in-progress",
    name: "In Progress",
    color: "#f59e0b",
    description: "Developer actively working on implementation",
  },
  {
    id: "review",
    name: "Review",
    color: "#8b5cf6",
    description: "Ready for code review",
  },
  {
    id: "done",
    name: "Done",
    color: "#22c55e",
    description: "Story completed",
  },
];

export const EPIC_STATUSES = [
  { id: "backlog", name: "Backlog", description: "Epic not yet started" },
  {
    id: "in-progress",
    name: "In Progress",
    description: "Epic actively being worked on",
  },
  { id: "done", name: "Done", description: "All stories in epic completed" },
];

export const PRIORITY_LEVELS = [
  { id: "low", name: "Low", color: "#6b7280" },
  { id: "medium", name: "Medium", color: "#3b82f6" },
  { id: "high", name: "High", color: "#f59e0b" },
  { id: "critical", name: "Critical", color: "#ef4444" },
];

// MCP Server connection settings
const DEFAULT_SERVER_BASE_URL = "http://localhost:3847";
const SERVER_BASE_URL_KEY = "kanban-server-base-url";
const USE_REMOTE_SERVER_KEY = "kanban-use-remote-server";

const normalizeBaseUrl = (raw) => {
  const value = String(raw || "").trim();
  if (!value) return "";
  return value.replace(/[\\/]+$/, "");
};

// Generate unique ID
const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// Get user ID for locking
const getUserId = () => {
  let userId = localStorage.getItem("kanban-user-id");
  if (!userId) {
    userId = `user-${createId().slice(0, 8)}`;
    localStorage.setItem("kanban-user-id", userId);
  }
  return userId;
};

export const useKanbanStore = create((set, get) => ({
  // State
  state: null,
  loading: true,
  error: null,
  connected: false,
  userId: getUserId(),
  autoConnect: localStorage.getItem("kanban-auto-connect") !== "false",
  serverRunning: false,
  useRemoteServer: localStorage.getItem(USE_REMOTE_SERVER_KEY) === "true",
  serverBaseUrl: normalizeBaseUrl(
    localStorage.getItem(SERVER_BASE_URL_KEY) || DEFAULT_SERVER_BASE_URL
  ),

  // SSE Connection
  eventSource: null,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,

  // UI State
  activeBoardId: null,
  selectedCardId: null,
  cardBeingEdited: null,
  lockedCards: {}, // { cardId: { userId, expiresAt } }

  // Initialize connection to MCP server
  connect: async () => {
    const { eventSource, userId, serverBaseUrl, useRemoteServer } = get();

    // Close existing connection
    if (eventSource) {
      eventSource.close();
    }

    set({ loading: true, error: null });

    // Start server if auto-connect is enabled (Electron only)
    if (!useRemoteServer && get().autoConnect && window.electronAPI) {
      try {
        await window.electronAPI.startMcpServer();
        set({ serverRunning: true });
        // Give it a moment to start listening
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (err) {
        console.error("Failed to start MCP server:", err);
      }
    }

    const baseUrl = normalizeBaseUrl(serverBaseUrl) || DEFAULT_SERVER_BASE_URL;
    const sseUrl = `${baseUrl}/sse`;
    const es = new EventSource(`${sseUrl}?userId=${userId}`);

    es.onopen = () => {
      set({ connected: true, reconnectAttempts: 0, serverRunning: true });
    };

    es.addEventListener("connected", (event) => {
      try {
        const data = JSON.parse(event.data);
        set({
          state: data.state,
          activeBoardId:
            data.state?.activeBoardId || data.state?.boards?.[0]?.id || null,
          loading: false,
          lockedCards: data.state?.locks || {},
        });
      } catch (err) {
        console.error("Failed to parse connected event:", err);
      }
    });

    es.addEventListener("state_update", (event) => {
      try {
        const data = JSON.parse(event.data);
        const nextState = data.data;
        const boards = Array.isArray(nextState?.boards) ? nextState.boards : [];
        const currentActiveBoardId = get().activeBoardId;
        const hasCurrentActive = boards.some(
          (b) => b.id === currentActiveBoardId
        );

        const nextActiveBoardId = hasCurrentActive
          ? currentActiveBoardId
          : boards.some((b) => b.id === nextState?.activeBoardId)
            ? nextState.activeBoardId
            : boards[0]?.id || null;

        try {
          localStorage.setItem("kanban-state", JSON.stringify(nextState));
        } catch {}

        set({
          state: nextState,
          activeBoardId: nextActiveBoardId,
          lockedCards: nextState?.locks || {},
        });
      } catch (err) {
        console.error("Failed to parse state_update event:", err);
      }
    });

    es.addEventListener("card_locked", (event) => {
      try {
        const data = JSON.parse(event.data);
        set((state) => ({
          lockedCards: {
            ...state.lockedCards,
            [data.data.cardId]: {
              userId: data.data.userId,
              expiresAt: data.data.expiresAt,
            },
          },
        }));
      } catch (err) {
        console.error("Failed to parse card_locked event:", err);
      }
    });

    es.addEventListener("card_unlocked", (event) => {
      try {
        const data = JSON.parse(event.data);
        set((state) => {
          const { [data.data.cardId]: _, ...rest } = state.lockedCards;
          return { lockedCards: rest };
        });
      } catch (err) {
        console.error("Failed to parse card_unlocked event:", err);
      }
    });

    es.addEventListener("card_moved", (event) => {
      // State will be updated via state_update event
      console.log("Card moved:", event.data);
    });

    es.addEventListener("card_created", (event) => {
      console.log("Card created:", event.data);
    });

    es.addEventListener("card_updated", (event) => {
      console.log("Card updated:", event.data);
    });

    es.addEventListener("card_deleted", (event) => {
      console.log("Card deleted:", event.data);
    });

    es.onerror = () => {
      const { reconnectAttempts, maxReconnectAttempts } = get();
      set({ connected: false });

      try {
        es.close();
      } catch {}
      set({ eventSource: null });

      if (reconnectAttempts < maxReconnectAttempts) {
        const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000);
        setTimeout(() => {
          set({ reconnectAttempts: reconnectAttempts + 1 });
          get().connect();
        }, delay);
      } else {
        set({
          error:
            "Failed to connect to Kanban server. Please ensure the MCP server is running.",
          loading: false,
        });
      }
    };

    set({ eventSource: es });
  },

  disconnect: () => {
    const { eventSource } = get();
    if (eventSource) {
      eventSource.close();
    }
    set({ eventSource: null, connected: false });
  },

  // Fallback to local state if server is not available
  loadLocalState: () => {
    try {
      const raw = localStorage.getItem("kanban-state");
      const state = raw ? JSON.parse(raw) : null;

      if (state?.boards?.length) {
        if (!Array.isArray(state.sprints)) state.sprints = [];
        set({
          state,
          activeBoardId: state.activeBoardId || state.boards[0]?.id || null,
          loading: false,
        });
        return;
      }

      // Create default state
      const defaultState = get().createDefaultState();
      localStorage.setItem("kanban-state", JSON.stringify(defaultState));
      set({
        state: defaultState,
        activeBoardId: defaultState.activeBoardId,
        loading: false,
      });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  createDefaultState: () => {
    const boardId = createId();
    return {
      version: 2,
      stateVersion: 1,
      activeBoardId: boardId,
      boards: [
        {
          id: boardId,
          name: "Sprint Board",
          type: "bmad",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lists: STORY_STATUSES.map((status) => ({
            id: createId(),
            statusId: status.id,
            name: status.name,
            color: status.color,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            cards: [],
          })),
        },
      ],
      epics: [],
      sprints: [],
      locks: {},
    };
  },

  // API calls
  apiCall: async (endpoint, data = {}) => {
    const { userId, state, serverBaseUrl } = get();
    const baseUrl = normalizeBaseUrl(serverBaseUrl) || DEFAULT_SERVER_BASE_URL;
    const apiBase = `${baseUrl}/api`;

    try {
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": userId,
          "X-State-Version": String(state?.stateVersion || 0),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "API request failed");
      }

      return response.json();
    } catch (err) {
      // Fallback to local storage
      console.warn("API call failed, using local fallback:", err.message);
      throw err;
    }
  },

  applyServerState: (nextState) => {
    if (!nextState) return;

    const boards = Array.isArray(nextState.boards) ? nextState.boards : [];
    const nextActiveBoardId = boards.some(
      (b) => b.id === nextState.activeBoardId
    )
      ? nextState.activeBoardId
      : boards[0]?.id || null;

    localStorage.setItem("kanban-state", JSON.stringify(nextState));
    set({
      state: nextState,
      activeBoardId: nextActiveBoardId,
      lockedCards: nextState?.locks || {},
    });
  },

  // Board operations
  setActiveBoard: (boardId) => {
    set({ activeBoardId: boardId });

    const { state, apiCall, connected } = get();
    if (connected && state) {
      apiCall("/state", { state: { ...state, activeBoardId: boardId } })
        .then((result) => {
          if (result?.state) get().applyServerState(result.state);
        })
        .catch(console.error);
    }
  },

  createBoard: async (name, type = "bmad") => {
    const { apiCall, connected, state } = get();

    if (connected) {
      try {
        const result = await apiCall("/board/create", { name, type });
        if (result?.state) get().applyServerState(result.state);
        return result.boardId;
      } catch (err) {
        set({ error: err.message });
        return null;
      }
    }

    // Local fallback
    const boardId = createId();
    const newBoard = {
      id: boardId,
      name,
      type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lists:
        type === "bmad"
          ? STORY_STATUSES.map((status) => ({
              id: createId(),
              statusId: status.id,
              name: status.name,
              color: status.color,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              cards: [],
            }))
          : [{ id: createId(), name: "Backlog", cards: [] }],
    };

    const newState = {
      ...state,
      activeBoardId: boardId,
      boards: [...(state?.boards || []), newBoard],
    };

    localStorage.setItem("kanban-state", JSON.stringify(newState));
    set({ state: newState, activeBoardId: boardId });

    return boardId;
  },

  deleteBoard: async (boardId) => {
    const { apiCall, connected, state } = get();

    if (connected) {
      try {
        const result = await apiCall("/board/delete", { boardId });
        if (result?.state) get().applyServerState(result.state);
      } catch (err) {
        set({ error: err.message });
      }
      return;
    }

    // Local fallback
    const remaining = state.boards.filter((b) => b.id !== boardId);
    const newActiveBoardId =
      state.activeBoardId === boardId
        ? remaining[0]?.id || null
        : state.activeBoardId;

    const newState = {
      ...state,
      activeBoardId: newActiveBoardId,
      boards: remaining,
    };

    localStorage.setItem("kanban-state", JSON.stringify(newState));
    set({ state: newState, activeBoardId: newActiveBoardId });
  },

  deleteList: async (boardId, listId) => {
    const { apiCall, connected, state } = get();

    if (connected) {
      try {
        const result = await apiCall("/list/delete", { boardId, listId });
        if (result?.state) get().applyServerState(result.state);
        return true;
      } catch (err) {
        set({ error: err.message });
        return false;
      }
    }

    if (!state?.boards?.length) return false;

    const board = state.boards.find((b) => b.id === boardId);
    if (!board) return false;

    const nextBoard = {
      ...board,
      lists: board.lists.filter((l) => l.id !== listId),
      updatedAt: new Date().toISOString(),
    };

    const newState = {
      ...state,
      boards: state.boards.map((b) => (b.id === boardId ? nextBoard : b)),
    };

    localStorage.setItem("kanban-state", JSON.stringify(newState));
    set({ state: newState });
    return true;
  },

  renameList: async (boardId, listId, name) => {
    const { apiCall, connected, state } = get();
    const nextName = String(name || "").trim();
    if (!nextName) return false;

    if (connected) {
      try {
        const result = await apiCall("/list/rename", {
          boardId,
          listId,
          name: nextName,
        });
        if (result?.state) get().applyServerState(result.state);
        return true;
      } catch (err) {
        set({ error: err.message });
        return false;
      }
    }

    if (!state?.boards?.length) return false;
    const board = state.boards.find((b) => b.id === boardId);
    if (!board) return false;
    const list = board.lists.find((l) => l.id === listId);
    if (!list) return false;

    const nextBoard = {
      ...board,
      lists: board.lists.map((l) =>
        l.id === listId
          ? { ...l, name: nextName, updatedAt: new Date().toISOString() }
          : l
      ),
      updatedAt: new Date().toISOString(),
    };

    const newState = {
      ...state,
      boards: state.boards.map((b) => (b.id === boardId ? nextBoard : b)),
    };

    localStorage.setItem("kanban-state", JSON.stringify(newState));
    set({ state: newState });
    return true;
  },

  addList: async (boardId, name, options = {}) => {
    const { apiCall, connected, state } = get();
    const listName = String(name || "").trim();
    if (!listName) return false;

    const color = options.color || STORY_STATUSES[0]?.color || "#6b7280";
    const statusId = options.statusId || null;

    if (connected) {
      try {
        const result = await apiCall("/list/add", {
          boardId,
          name: listName,
          statusId,
          color,
        });
        if (result?.state) get().applyServerState(result.state);
        return true;
      } catch (err) {
        set({ error: err.message });
        return false;
      }
    }

    if (!state?.boards?.length) return false;

    const board = state.boards.find((b) => b.id === boardId);
    if (!board) return false;

    const nextBoard = {
      ...board,
      lists: [
        ...board.lists,
        {
          id: createId(),
          statusId,
          name: listName,
          color,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          cards: [],
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    const newState = {
      ...state,
      boards: state.boards.map((b) => (b.id === boardId ? nextBoard : b)),
    };

    localStorage.setItem("kanban-state", JSON.stringify(newState));
    set({ state: newState });
    return true;
  },

  moveList: async (boardId, listId, toIndex) => {
    const { apiCall, connected, state } = get();
    if (!state?.boards?.length) return false;

    const board = state.boards.find((b) => b.id === boardId);
    if (!board?.lists?.length) return false;

    const fromIndex = board.lists.findIndex((l) => l.id === listId);
    if (fromIndex < 0) return false;

    const rawTarget = Number(toIndex);
    const clampedTarget = Number.isFinite(rawTarget)
      ? Math.max(0, Math.min(rawTarget, board.lists.length))
      : 0;

    const nextLists = [...board.lists];
    const [moved] = nextLists.splice(fromIndex, 1);
    if (!moved) return false;

    let targetIndex = clampedTarget;
    if (fromIndex < targetIndex) targetIndex -= 1;
    targetIndex = Math.max(0, Math.min(targetIndex, nextLists.length));

    nextLists.splice(targetIndex, 0, moved);

    const nextBoard = {
      ...board,
      lists: nextLists,
      updatedAt: new Date().toISOString(),
    };

    const newState = {
      ...state,
      boards: state.boards.map((b) => (b.id === boardId ? nextBoard : b)),
    };

    localStorage.setItem("kanban-state", JSON.stringify(newState));
    set({ state: newState });

    if (connected) {
      try {
        const result = await apiCall("/state", { state: newState });
        if (result?.state) get().applyServerState(result.state);
        return true;
      } catch (err) {
        set({ error: err.message });
        return false;
      }
    }

    return true;
  },

  // Card operations
  addCard: async (boardId, listId, cardData) => {
    const { apiCall, connected, state } = get();

    // Simple numeric ID based on max existing ID
    const allCards = (state?.boards || []).flatMap((b) =>
      b.lists.flatMap((l) => l.cards)
    );
    const maxId = allCards.reduce((max, c) => {
      const numericId = parseInt(c.id, 10);
      return !isNaN(numericId) ? Math.max(max, numericId) : max;
    }, 0);
    const newId = String(maxId + 1);

    const newCard = {
      id: newId,
      title: cardData.title || "New Story",
      description: cardData.description || "",
      points: cardData.points,
      assignee: cardData.assignee || "",
      priority: cardData.priority || "medium",
      epicId: cardData.epicId || null,
      sprintId: cardData.sprintId || null,
      labels: cardData.labels || [],
      attachments: (cardData.attachments || []).map((a, idx) => ({
        ...a,
        id: `${newId}-${idx + 1}`,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Local update
    if (state?.boards) {
      const newState = {
        ...state,
        boards: state.boards.map((b) => {
          if (b.id !== boardId) return b;
          return {
            ...b,
            updatedAt: new Date().toISOString(),
            lists: b.lists.map((l) => {
              if (l.id !== listId) return l;
              return {
                ...l,
                updatedAt: new Date().toISOString(),
                cards: [...l.cards, newCard],
              };
            }),
          };
        }),
      };
      set({ state: newState });
      localStorage.setItem("kanban-state", JSON.stringify(newState));
    }

    if (connected) {
      try {
        const result = await apiCall("/card/add", {
          boardId,
          listId,
          ...cardData,
        });
        if (result?.state) get().applyServerState(result.state);
        return result.cardId || newId;
      } catch (err) {
        set({ error: err.message });
        return null;
      }
    }

    return newId;
  },

  updateCard: async (boardId, listId, cardId, patch) => {
    const { apiCall, connected, userId, lockedCards, state } = get();

    // Check if card is locked by another user
    const lock = lockedCards[cardId];
    if (lock && lock.userId !== userId) {
      const now = Date.now();
      const expiresAt = new Date(lock.expiresAt).getTime();
      if (now < expiresAt) {
        set({
          error: `Card is being edited by ${lock.userId}. Please try again.`,
        });
        return false;
      }
    }

    // Local update
    if (state?.boards) {
      const newState = {
        ...state,
        boards: state.boards.map((b) => {
          if (b.id !== boardId) return b;
          return {
            ...b,
            updatedAt: new Date().toISOString(),
            lists: b.lists.map((l) => {
              if (l.id !== listId) return l;
              return {
                ...l,
                updatedAt: new Date().toISOString(),
                cards: l.cards.map((c) => {
                  if (c.id !== cardId) return c;
                  const updatedAttachments = (
                    patch.attachments ||
                    c.attachments ||
                    []
                  ).map((a, idx) => ({
                    ...a,
                    id: `${cardId}-${idx + 1}`,
                  }));
                  return {
                    ...c,
                    ...patch,
                    attachments: updatedAttachments,
                    updatedAt: new Date().toISOString(),
                  };
                }),
              };
            }),
          };
        }),
      };
      set({ state: newState });
      localStorage.setItem("kanban-state", JSON.stringify(newState));
    }

    if (connected) {
      try {
        const result = await apiCall("/card/update", {
          boardId,
          listId,
          cardId,
          patch,
        });
        if (result?.state) get().applyServerState(result.state);
        return true;
      } catch (err) {
        set({ error: err.message });
        return false;
      }
    }

    return true;
  },

  deleteCard: async (boardId, listId, cardId) => {
    const { apiCall, connected, state } = get();

    // Local update
    if (state?.boards) {
      const newState = {
        ...state,
        boards: state.boards.map((b) => {
          if (b.id !== boardId) return b;
          return {
            ...b,
            updatedAt: new Date().toISOString(),
            lists: b.lists.map((l) => {
              if (l.id !== listId) return l;
              return {
                ...l,
                updatedAt: new Date().toISOString(),
                cards: l.cards.filter((c) => c.id !== cardId),
              };
            }),
          };
        }),
      };
      set({ state: newState });
      localStorage.setItem("kanban-state", JSON.stringify(newState));
    }

    if (connected) {
      try {
        const result = await apiCall("/card/delete", {
          boardId,
          listId,
          cardId,
        });
        if (result?.state) get().applyServerState(result.state);
        return true;
      } catch (err) {
        set({ error: err.message });
        return false;
      }
    }

    return true;
  },

  moveCard: async (boardId, cardId, fromListId, toListId, toIndex) => {
    const { apiCall, connected, userId, lockedCards, state } = get();

    // Check if card is locked by another user
    const lock = lockedCards[cardId];
    if (lock && lock.userId !== userId) {
      const now = Date.now();
      const expiresAt = new Date(lock.expiresAt).getTime();
      if (now < expiresAt) {
        set({
          error: `Card "${cardId}" is locked by another user. Please wait.`,
        });
        return false;
      }
    }

    // Local state update (optimistic)
    if (state?.boards) {
      const board = state.boards.find((b) => b.id === boardId);
      if (board) {
        const fromList = board.lists.find((l) => l.id === fromListId);
        const toList = board.lists.find((l) => l.id === toListId);

        if (fromList && toList) {
          const cardIndex = fromList.cards.findIndex((c) => c.id === cardId);
          if (cardIndex !== -1) {
            const isDoneList = (list) => {
              if (!list) return false;
              if (String(list.statusId || "") === "done") return true;
              return (
                String(list.name || "")
                  .trim()
                  .toLowerCase() === "done"
              );
            };

            const card = fromList.cards[cardIndex];
            const movingFromDone = isDoneList(fromList);
            const movingToDone = isDoneList(toList);
            const completedAt = movingToDone
              ? card.completedAt || new Date().toISOString()
              : movingFromDone
                ? null
                : card.completedAt;

            const nextCard = {
              ...card,
              status: toList.statusId || card.status,
              completedAt,
            };

            const nextLists = board.lists.map((list) => {
              if (list.id === fromListId && list.id === toListId) {
                // Moving within same list
                const nextCards = [...list.cards];
                nextCards.splice(cardIndex, 1);
                let finalToIndex = toIndex;
                if (cardIndex < toIndex) finalToIndex -= 1;
                nextCards.splice(finalToIndex, 0, nextCard);
                return {
                  ...list,
                  cards: nextCards,
                  updatedAt: new Date().toISOString(),
                };
              } else if (list.id === fromListId) {
                // Remove from source list
                return {
                  ...list,
                  cards: list.cards.filter((c) => c.id !== cardId),
                  updatedAt: new Date().toISOString(),
                };
              } else if (list.id === toListId) {
                // Add to target list
                const nextCards = [...list.cards];
                nextCards.splice(toIndex, 0, nextCard);
                return {
                  ...list,
                  cards: nextCards,
                  updatedAt: new Date().toISOString(),
                };
              }
              return list;
            });

            const nextBoard = {
              ...board,
              lists: nextLists,
              updatedAt: new Date().toISOString(),
            };

            const newState = {
              ...state,
              boards: state.boards.map((b) =>
                b.id === boardId ? nextBoard : b
              ),
            };

            set({ state: newState });
            localStorage.setItem("kanban-state", JSON.stringify(newState));
          }
        }
      }
    }

    if (connected) {
      try {
        const result = await apiCall("/card/move", {
          boardId,
          cardId,
          fromListId,
          toListId,
          toIndex,
        });
        if (result?.state) get().applyServerState(result.state);
        return true;
      } catch (err) {
        set({ error: err.message });
        return false;
      }
    }

    return true;
  },

  // Lock operations
  acquireLock: async (cardId) => {
    const { apiCall, connected, userId } = get();

    if (connected) {
      try {
        const result = await apiCall("/lock/acquire", { cardId, userId });
        if (!result.success) {
          set({ error: `Card is locked by ${result.lockedBy}` });
        }
        return result.success;
      } catch (err) {
        set({ error: err.message });
        return false;
      }
    }

    return true; // Local mode always succeeds
  },

  releaseLock: async (cardId) => {
    const { apiCall, connected, userId } = get();

    if (connected) {
      try {
        await apiCall("/lock/release", { cardId, userId });
        return true;
      } catch (err) {
        console.error("Failed to release lock:", err);
        return false;
      }
    }

    return true;
  },

  // Check if a card is locked by another user
  isCardLocked: (cardId) => {
    const { lockedCards, userId } = get();
    const lock = lockedCards[cardId];

    if (!lock) return false;
    if (lock.userId === userId) return false;

    const now = Date.now();
    const expiresAt = new Date(lock.expiresAt).getTime();
    return now < expiresAt;
  },

  // Get lock info for a card
  getCardLock: (cardId) => {
    const { lockedCards, userId } = get();
    const lock = lockedCards[cardId];

    if (!lock) return null;

    const now = Date.now();
    const expiresAt = new Date(lock.expiresAt).getTime();

    if (now >= expiresAt) return null;

    return {
      ...lock,
      isOwnLock: lock.userId === userId,
    };
  },

  // Epic operations
  createEpic: async (name, description, projectKey) => {
    const { apiCall, connected, state } = get();
    const epicName = String(name || "").trim();
    if (!epicName) return null;

    if (connected) {
      try {
        const result = await apiCall("/epic/create", {
          name: epicName,
          description,
          projectKey,
        });
        if (result?.state) get().applyServerState(result.state);
        return result.epicId;
      } catch (err) {
        set({ error: err.message });
        return null;
      }
    }

    const nextEpic = {
      id: createId(),
      name: epicName,
      description: String(description || "").trim(),
      projectKey: projectKey || null,
      status: "backlog",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextState = {
      ...(state || get().createDefaultState()),
      epics: [...((state?.epics || []) ?? []), nextEpic],
    };

    localStorage.setItem("kanban-state", JSON.stringify(nextState));
    set({ state: nextState });
    return nextEpic.id;
  },

  updateEpic: async (epicId, patch) => {
    const { apiCall, connected, state } = get();
    if (!epicId) return false;
    if (!patch || typeof patch !== "object") return false;

    if (connected) {
      try {
        const result = await apiCall("/epic/update", { epicId, patch });
        if (result?.state) get().applyServerState(result.state);
        return true;
      } catch (err) {
        set({ error: err.message });
        return false;
      }
    }

    if (!state) return false;
    const exists = (state.epics || []).some((e) => e.id === epicId);
    if (!exists) return false;

    const nextState = {
      ...state,
      epics: (state.epics || []).map((e) =>
        e.id === epicId
          ? { ...e, ...patch, updatedAt: new Date().toISOString() }
          : e
      ),
    };

    localStorage.setItem("kanban-state", JSON.stringify(nextState));
    set({ state: nextState });
    return true;
  },

  // Sprint operations
  createSprint: async ({
    name,
    startDate,
    endDate,
    goal,
    capacityPoints,
    status,
  } = {}) => {
    const { apiCall, connected, state } = get();
    const sprintName = String(name || "").trim();
    if (!sprintName) return null;

    if (connected) {
      try {
        const result = await apiCall("/sprint/create", {
          name: sprintName,
          startDate,
          endDate,
          goal,
          capacityPoints,
          status,
        });
        if (result?.state) get().applyServerState(result.state);
        return result.sprintId;
      } catch (err) {
        set({ error: err.message });
        return null;
      }
    }

    const nextSprint = {
      id: createId(),
      name: sprintName,
      goal: String(goal || "").trim(),
      startDate: String(startDate || "").trim() || null,
      endDate: String(endDate || "").trim() || null,
      capacityPoints:
        typeof capacityPoints === "number" ? capacityPoints : null,
      status: ["planned", "active", "completed"].includes(status)
        ? status
        : "planned",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const base = state || get().createDefaultState();
    const nextState = {
      ...base,
      sprints: [...(base.sprints || []), nextSprint],
    };

    localStorage.setItem("kanban-state", JSON.stringify(nextState));
    set({ state: nextState });
    return nextSprint.id;
  },

  updateSprint: async (sprintId, patch) => {
    const { apiCall, connected, state } = get();
    if (!sprintId) return false;
    if (!patch || typeof patch !== "object") return false;

    if (connected) {
      try {
        const result = await apiCall("/sprint/update", { sprintId, patch });
        if (result?.state) get().applyServerState(result.state);
        return true;
      } catch (err) {
        set({ error: err.message });
        return false;
      }
    }

    if (!state) return false;
    const exists = (state.sprints || []).some((s) => s.id === sprintId);
    if (!exists) return false;

    const nextState = {
      ...state,
      sprints: (state.sprints || []).map((s) =>
        s.id === sprintId
          ? { ...s, ...patch, updatedAt: new Date().toISOString() }
          : s
      ),
    };

    localStorage.setItem("kanban-state", JSON.stringify(nextState));
    set({ state: nextState });
    return true;
  },

  deleteSprint: async (sprintId) => {
    const { apiCall, connected, state } = get();
    if (!sprintId) return false;

    if (connected) {
      try {
        const result = await apiCall("/sprint/delete", { sprintId });
        if (result?.state) get().applyServerState(result.state);
        return true;
      } catch (err) {
        set({ error: err.message });
        return false;
      }
    }

    if (!state) return false;
    const nextBoards = (state.boards || []).map((b) => ({
      ...b,
      lists: (b.lists || []).map((l) => ({
        ...l,
        cards: (l.cards || []).map((c) =>
          c.sprintId === sprintId ? { ...c, sprintId: null } : c
        ),
      })),
    }));

    const nextState = {
      ...state,
      boards: nextBoards,
      epics: (state.epics || []).map((e) =>
        e.sprintId === sprintId ? { ...e, sprintId: null } : e
      ),
      sprints: (state.sprints || []).filter((s) => s.id !== sprintId),
    };

    localStorage.setItem("kanban-state", JSON.stringify(nextState));
    set({ state: nextState });
    return true;
  },

  // UI actions
  setSelectedCard: (cardId) => set({ selectedCardId: cardId }),
  setCardBeingEdited: (card) => set({ cardBeingEdited: card }),
  clearError: () => set({ error: null }),

  // Getters
  getActiveBoard: () => {
    const { state, activeBoardId } = get();
    return state?.boards?.find((b) => b.id === activeBoardId) || null;
  },

  getEpics: () => {
    const { state } = get();
    return state?.epics || [];
  },

  getSprints: () => {
    const { state } = get();
    return state?.sprints || [];
  },

  getCardsByStatus: (status) => {
    const board = get().getActiveBoard();
    if (!board) return [];

    const list = board.lists.find((l) => l.statusId === status);
    return list?.cards || [];
  },

  getStats: () => {
    const board = get().getActiveBoard();
    if (!board) return {};

    const stats = {
      total: 0,
      completed: 0,
      byStatus: {},
      totalPoints: 0,
      completedPoints: 0,
    };

    for (const list of board.lists) {
      const count = list.cards?.length || 0;
      stats.total += count;

      // Normalize status for byStatus mapping
      const statusKey = (list.statusId || list.name || "")
        .toLowerCase()
        .replace(/\s+/g, "-");
      stats.byStatus[statusKey] = (stats.byStatus[statusKey] || 0) + count;

      const isDone =
        list.statusId === "done" || list.name?.toLowerCase() === "done";
      if (isDone) {
        stats.completed += count;
      }

      for (const card of list.cards || []) {
        const pts =
          typeof card.points === "number"
            ? card.points
            : parseFloat(card.points);
        if (!isNaN(pts)) {
          stats.totalPoints += pts;
          if (isDone) {
            stats.completedPoints += pts;
          }
        }
      }
    }

    if (stats.totalPoints > 0) {
      stats.completionPercent = Math.round(
        (stats.completedPoints / stats.totalPoints) * 100
      );
    } else if (stats.total > 0) {
      stats.completionPercent = Math.round(
        (stats.completed / stats.total) * 100
      );
    } else {
      stats.completionPercent = 0;
    }

    return stats;
  },

  syncNow: async () => {
    try {
      const { serverBaseUrl } = get();
      const baseUrl =
        normalizeBaseUrl(serverBaseUrl) || DEFAULT_SERVER_BASE_URL;
      const response = await fetch(`${baseUrl}/api/state`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Sync failed (${response.status})`);
      }

      const nextState = await response.json();
      set({
        state: nextState,
        activeBoardId:
          nextState?.activeBoardId || nextState?.boards?.[0]?.id || null,
        loading: false,
        error: null,
      });
      return nextState;
    } catch (err) {
      set({ error: err?.message || "Failed to sync" });
      return null;
    }
  },

  // Server Management
  setUseRemoteServer: (enabled) => {
    localStorage.setItem(USE_REMOTE_SERVER_KEY, String(Boolean(enabled)));
    set({ useRemoteServer: Boolean(enabled) });
    if (get().connected) {
      get().connect();
    }
  },

  setServerBaseUrl: (nextUrl) => {
    const normalized = normalizeBaseUrl(nextUrl) || DEFAULT_SERVER_BASE_URL;
    localStorage.setItem(SERVER_BASE_URL_KEY, normalized);
    set({ serverBaseUrl: normalized });
    if (get().connected) {
      get().connect();
    }
  },

  setAutoConnect: (enabled) => {
    localStorage.setItem("kanban-auto-connect", String(enabled));
    set({ autoConnect: enabled });
    if (enabled && !get().connected) {
      get().connect();
    }
  },

  checkServerStatus: async () => {
    const { useRemoteServer, serverBaseUrl } = get();
    const baseUrl = normalizeBaseUrl(serverBaseUrl) || DEFAULT_SERVER_BASE_URL;

    if (useRemoteServer) {
      try {
        const response = await fetch(`${baseUrl}/api/state`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const running = Boolean(response.ok);
        set({ serverRunning: running });
        return running;
      } catch {
        set({ serverRunning: false });
        return false;
      }
    }

    if (window.electronAPI) {
      const running = await window.electronAPI.getMcpServerStatus();
      set({ serverRunning: running });
      return running;
    }
    return false;
  },

  toggleServer: async () => {
    if (!window.electronAPI) return;
    if (get().useRemoteServer) return;

    const { serverRunning } = get();
    if (serverRunning) {
      await window.electronAPI.stopMcpServer();
      set({ serverRunning: false, connected: false });
      get().disconnect();
    } else {
      await window.electronAPI.startMcpServer();
      set({ serverRunning: true });
      setTimeout(() => get().connect(), 1000);
    }
  },
}));

export default useKanbanStore;
