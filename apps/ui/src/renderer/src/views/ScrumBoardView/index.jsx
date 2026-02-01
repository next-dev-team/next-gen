/**
 * ScrumBoardView Module
 *
 * Main entry point for the Scrum Board view.
 * This file re-exports the main ScrumBoardView component along with
 * all extracted components, constants, and utilities.
 *
 * Folder Structure:
 * - index.jsx (this file) - main module exports
 * - ScrumBoardView.jsx - main component (moved from parent folder)
 * - constants.js - all configuration values
 * - utils.jsx - utility functions
 * - components/ - reusable UI components
 *   - AddListColumn.jsx - inline form to add columns
 *   - CardEditorDialog.jsx - create/edit story cards
 *   - CreateBoardDialog.jsx - create new boards
 *   - DropZone.jsx - drag-and-drop target
 *   - EpicManagerDialog.jsx - manage epics
 *   - ListColumn.jsx - kanban column
 *   - McpToolsUsage.jsx - MCP tool documentation
 *   - OfflineState.jsx - offline indicator
 *   - ScrumCard.jsx - individual story card
 *   - SprintManagerDialog.jsx - manage sprints
 *   - SprintTrackingView.jsx - sprint burndown view
 *   - StatsCard.jsx - board statistics
 *   - index.js - barrel exports
 */

// Re-export the main component from the local file
export { default } from "./ScrumBoardView.jsx";

// Export all constants
export * from "./constants";

// Export all utilities
export {
  getMcpToolUsageText,
  safeJsonParse,
  normalizeMcpPath,
  recommendAgent,
  renderMarkdownInline,
  MarkdownPreview,
  normalizeContextDocs,
  getPredefinedContextItems,
  groupContextItemsByCategory,
} from "./utils";

// Export all components
export {
  // Dialogs
  CardEditorDialog,
  CreateBoardDialog,
  EpicManagerDialog,
  SprintManagerDialog,
  // Board Components
  AddListColumn,
  DropZone,
  ListColumn,
  ScrumCard,
  // Views
  SprintTrackingView,
  // Display Components
  McpToolsUsage,
  OfflineState,
  StatsCard,
} from "./components";
