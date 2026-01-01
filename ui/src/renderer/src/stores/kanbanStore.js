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
        set({
          state: data.data,
          lockedCards: data.data?.locks || {},
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

      if (reconnectAttempts < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
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

  // Board operations
  setActiveBoard: (boardId) => {
    set({ activeBoardId: boardId });

    const { state, apiCall, connected } = get();
    if (connected && state) {
      apiCall("/state", { state: { ...state, activeBoardId: boardId } }).catch(
        console.error
      );
    }
  },

  createBoard: async (name, type = "bmad") => {
    const { apiCall, connected, state } = get();

    if (connected) {
      try {
        const result = await apiCall("/board/create", { name, type });
        set({ activeBoardId: result.boardId });
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
        await apiCall("/board/delete", { boardId });
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
        await apiCall("/list/delete", { boardId, listId });
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
        await apiCall("/list/rename", { boardId, listId, name: nextName });
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
        await apiCall("/list/add", {
          boardId,
          name: listName,
          statusId,
          color,
        });
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
        await apiCall("/state", { state: newState });
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
    const { apiCall, connected } = get();

    if (connected) {
      try {
        const result = await apiCall("/card/add", {
          boardId,
          listId,
          ...cardData,
        });
        return result.cardId;
      } catch (err) {
        set({ error: err.message });
        return null;
      }
    }

    // Local fallback handled by optimistic update
    return null;
  },

  updateCard: async (boardId, listId, cardId, patch) => {
    const { apiCall, connected, userId, lockedCards } = get();

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

    if (connected) {
      try {
        await apiCall("/card/update", { boardId, listId, cardId, patch });
        return true;
      } catch (err) {
        set({ error: err.message });
        return false;
      }
    }

    return false;
  },

  deleteCard: async (boardId, listId, cardId) => {
    const { apiCall, connected } = get();

    if (connected) {
      try {
        await apiCall("/card/delete", { boardId, listId, cardId });
        return true;
      } catch (err) {
        set({ error: err.message });
        return false;
      }
    }

    return false;
  },

  moveCard: async (boardId, cardId, fromListId, toListId, toIndex) => {
    const { apiCall, connected, userId, lockedCards } = get();

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

    if (connected) {
      try {
        await apiCall("/card/move", {
          boardId,
          cardId,
          fromListId,
          toListId,
          toIndex,
        });
        return true;
      } catch (err) {
        set({ error: err.message });
        return false;
      }
    }

    return false;
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
    const { apiCall, connected } = get();

    if (connected) {
      try {
        const result = await apiCall("/epic/create", {
          name,
          description,
          projectKey,
        });
        return result.epicId;
      } catch (err) {
        set({ error: err.message });
        return null;
      }
    }

    return null;
  },

  updateEpic: async (epicId, patch) => {
    const { apiCall, connected } = get();

    if (connected) {
      try {
        await apiCall("/epic/update", { epicId, patch });
        return true;
      } catch (err) {
        set({ error: err.message });
        return false;
      }
    }

    return false;
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
      byStatus: {},
      totalPoints: 0,
      completedPoints: 0,
    };

    for (const list of board.lists) {
      const count = list.cards.length;
      stats.total += count;
      stats.byStatus[list.statusId || list.name] = count;

      for (const card of list.cards) {
        if (typeof card.points === "number") {
          stats.totalPoints += card.points;
          if (list.statusId === "done") {
            stats.completedPoints += card.points;
          }
        }
      }
    }

    stats.completionPercent =
      stats.totalPoints > 0
        ? Math.round((stats.completedPoints / stats.totalPoints) * 100)
        : 0;

    return stats;
  },

  syncNow: async () => {
    try {
      const { serverBaseUrl } = get();
      const baseUrl = normalizeBaseUrl(serverBaseUrl) || DEFAULT_SERVER_BASE_URL;
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
    const normalized =
      normalizeBaseUrl(nextUrl) || DEFAULT_SERVER_BASE_URL;
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
