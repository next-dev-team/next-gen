/**
 * RAG Sync Hook - Connects Kanban Store to RAG Service
 *
 * v1.0.2: Provides automatic syncing of kanban changes to the RAG index
 *
 * Usage:
 *   const { syncKanbanToRAG, isSyncing } = useRAGSync();
 *   // Call syncKanbanToRAG() when you want to update RAG with current kanban state
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useKanbanStore } from "../stores/kanbanStore";
import useProjectContextStore from "../stores/projectContextStore";

/**
 * Hook to sync Kanban data to RAG index
 */
export function useRAGSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [error, setError] = useState(null);

  const kanbanState = useKanbanStore((state) => state.state);
  const indexKanbanState = useProjectContextStore(
    (state) => state.indexKanbanState,
  );
  const indexTicket = useProjectContextStore((state) => state.indexTicket);
  const ragInitialized = useProjectContextStore(
    (state) => state.ragInitialized,
  );

  // Track previous state for diff detection
  const prevStateRef = useRef(null);

  /**
   * Full sync of all kanban data to RAG
   */
  const syncKanbanToRAG = useCallback(async () => {
    if (!kanbanState || !ragInitialized) {
      console.log("[RAGSync] Skipping sync - not ready");
      return;
    }

    setIsSyncing(true);
    setError(null);

    try {
      await indexKanbanState(kanbanState);
      setLastSynced(Date.now());
      console.log("[RAGSync] Full sync complete");
    } catch (err) {
      console.error("[RAGSync] Sync failed:", err);
      setError(err.message);
    } finally {
      setIsSyncing(false);
    }
  }, [kanbanState, indexKanbanState, ragInitialized]);

  /**
   * Incremental sync - only sync changed tickets
   * Called automatically when kanban state changes
   */
  const incrementalSync = useCallback(async () => {
    if (!kanbanState || !ragInitialized || !prevStateRef.current) {
      return;
    }

    // Find changed cards
    const currentCards = new Map();
    const prevCards = new Map();

    // Extract all cards from current state
    for (const board of kanbanState.boards || []) {
      for (const list of board.lists || []) {
        for (const card of list.cards || []) {
          currentCards.set(card.id, {
            ...card,
            status: list.statusId || list.name,
          });
        }
      }
    }

    // Extract all cards from previous state
    for (const board of prevStateRef.current.boards || []) {
      for (const list of board.lists || []) {
        for (const card of list.cards || []) {
          prevCards.set(card.id, {
            ...card,
            status: list.statusId || list.name,
          });
        }
      }
    }

    // Find new or updated cards
    const changedCards = [];
    for (const [id, card] of currentCards) {
      const prevCard = prevCards.get(id);
      if (
        !prevCard ||
        prevCard.title !== card.title ||
        prevCard.description !== card.description ||
        prevCard.status !== card.status ||
        prevCard.priority !== card.priority
      ) {
        changedCards.push(card);
      }
    }

    // Index changed cards
    if (changedCards.length > 0) {
      console.log(`[RAGSync] Indexing ${changedCards.length} changed cards`);
      for (const card of changedCards) {
        try {
          await indexTicket(card);
        } catch (err) {
          console.warn("[RAGSync] Failed to index card:", card.id, err);
        }
      }
    }

    // Update previous state reference
    prevStateRef.current = kanbanState;
  }, [kanbanState, indexTicket, ragInitialized]);

  // Auto-sync when kanban state changes (debounced)
  useEffect(() => {
    if (!kanbanState || !ragInitialized) return;

    // Set initial prev state if not set
    if (!prevStateRef.current) {
      prevStateRef.current = kanbanState;
      // Do a full sync on first load
      syncKanbanToRAG();
      return;
    }

    // Debounce incremental sync
    const timer = setTimeout(() => {
      incrementalSync();
    }, 2000); // 2 second debounce

    return () => clearTimeout(timer);
  }, [kanbanState, ragInitialized, incrementalSync, syncKanbanToRAG]);

  return {
    syncKanbanToRAG,
    isSyncing,
    lastSynced,
    error,
  };
}

export default useRAGSync;
