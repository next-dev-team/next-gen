/**
 * RAG Service Wrapper - API-based RAG functionality
 *
 * This wrapper calls the agent-llm API server for RAG operations.
 * The heavy dependencies are handled by the external server.
 */

const RAG_API_BASE = "http://127.0.0.1:3333/api/rag";

// Track if we've enabled RAG
let ragEnabled = false;

/**
 * Make API request to RAG endpoints
 */
async function ragApi(endpoint, method = "GET", body = null) {
  try {
    const options = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${RAG_API_BASE}${endpoint}`, options);
    const data = await response.json();

    if (!data.ok) {
      console.warn(`[RAGWrapper] API error: ${data.error}`);
      return null;
    }

    return data;
  } catch (err) {
    console.warn(`[RAGWrapper] API request failed:`, err.message);
    return null;
  }
}

/**
 * Ensure RAG is enabled on the server
 */
async function ensureEnabled() {
  if (ragEnabled) return true;

  const result = await ragApi("/enable", "POST", { enabled: true });
  if (result) {
    ragEnabled = true;
    console.log("[RAGWrapper] RAG enabled on server");
    return true;
  }
  return false;
}

/**
 * RAG Service proxy - wraps all methods to call API
 */
export const RAGServiceProxy = {
  async initialize(projectPath) {
    // For API-based RAG, just ensure it's enabled
    return ensureEnabled();
  },

  async addDocument(id, content, metadata = {}) {
    if (!(await ensureEnabled())) return false;

    const result = await ragApi("/documents", "POST", {
      id,
      content,
      metadata,
    });
    return result?.added ?? false;
  },

  async query(query, options = {}) {
    if (!ragEnabled) return [];

    const result = await ragApi("/query", "POST", { query, ...options });
    return result?.results ?? [];
  },

  async buildContextForQuery(query, options = {}) {
    if (!ragEnabled) return "";

    const result = await ragApi("/context", "POST", { query, ...options });
    return result?.context ?? "";
  },

  async reindexKanban(kanbanState) {
    if (!(await ensureEnabled())) return;

    // Index boards/tickets from kanban state
    if (!kanbanState) return;

    for (const board of kanbanState.boards || []) {
      for (const list of board.lists || []) {
        for (const card of list.cards || []) {
          await this.indexTicket({
            ...card,
            status: list.statusId || list.name,
          });
        }
      }
    }

    // Index epics
    for (const epic of kanbanState.epics || []) {
      await this.addDocument(
        `epic-${epic.id}`,
        `Epic: ${epic.name}\nDescription: ${epic.description || ""}\nStatus: ${epic.status || "backlog"}`,
        { type: "epic", epicId: epic.id, name: epic.name },
      );
    }

    // Index sprints
    for (const sprint of kanbanState.sprints || []) {
      await this.addDocument(
        `sprint-${sprint.id}`,
        `Sprint: ${sprint.name}\nGoal: ${sprint.goal || ""}\nStatus: ${sprint.status}`,
        { type: "sprint", sprintId: sprint.id, name: sprint.name },
      );
    }
  },

  async indexTicket(ticket) {
    if (!ticket || !ticket.id) return false;

    const content = [
      `Title: ${ticket.title || "Untitled"}`,
      `Description: ${ticket.description || "No description"}`,
      `Status: ${ticket.status || "unknown"}`,
      `Priority: ${ticket.priority || "medium"}`,
      ticket.acceptanceCriteria
        ? `Acceptance Criteria: ${ticket.acceptanceCriteria}`
        : "",
      ticket.labels?.length ? `Labels: ${ticket.labels.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return this.addDocument(`ticket-${ticket.id}`, content, {
      type: "ticket",
      ticketId: ticket.id,
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
    });
  },

  async indexPRD(content, path = null) {
    if (!content) return false;

    return this.addDocument("prd-main", content, {
      type: "prd",
      source: path || "_bmad-output/prd.md",
    });
  },

  async indexArchitecture(content, path = null) {
    if (!content) return false;

    return this.addDocument("architecture-main", content, {
      type: "arch",
      source: path || "_bmad-output/architecture.md",
    });
  },

  async indexChatDecision(message, agentId) {
    if (!message || !message.content) return false;

    const id = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    return this.addDocument(id, message.content, {
      type: "chat",
      agentId,
      role: message.role,
      timestamp: message.timestamp,
    });
  },

  getStats() {
    // Synchronous - return cached/default stats
    return {
      documentCount: 0,
      isInitialized: ragEnabled,
      embeddingReady: ragEnabled,
    };
  },

  // Async version to get real stats from API
  async getStatsAsync() {
    const result = await ragApi("/status");
    if (result?.service) {
      return result.service;
    }
    return this.getStats();
  },
};

/**
 * Document types - exported for compatibility
 */
export const DOC_TYPES_PROXY = {
  TICKET: "ticket",
  EPIC: "epic",
  PRD: "prd",
  ARCHITECTURE: "arch",
  CHAT: "chat",
  SPRINT: "sprint",
  DOCUMENT: "document",
};

export default RAGServiceProxy;
