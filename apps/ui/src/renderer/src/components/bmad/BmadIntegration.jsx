/**
 * BMAD Integration Component
 *
 * Provides unified integration between:
 * - GUI: Direct LLM chat with BMAD agents
 * - IDE: Generate/sync files for external IDE use
 * - MCP: Scrum board operations via MCP server
 * - Context Sync: Keep all modes in sync with same project context
 *
 * This component serves as the bridge between all three modes.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Monitor,
  Code2,
  Server,
  FileOutput,
  RefreshCw,
  Check,
  AlertCircle,
  Loader2,
  Download,
  Upload,
  Zap,
  FolderSync,
  Database,
  MessageSquare,
  ListTodo,
  Settings,
} from "lucide-react";
import useBmadStore from "../../stores/bmadStore";
import useProjectContextStore from "../../stores/projectContextStore";

// MCP Server endpoints
const MCP_BASE_URL = "http://127.0.0.1:3847";

// Integration modes
const MODES = {
  GUI: "gui",
  IDE: "ide",
  MCP: "mcp",
  SYNC: "sync",
};

/**
 * Fetch stories from MCP server (REST API)
 */
async function fetchStoriesFromMcp() {
  try {
    const response = await fetch(`${MCP_BASE_URL}/api/state`);
    if (!response.ok) throw new Error(`MCP error: ${response.status}`);
    const state = await response.json();

    // Get all cards from all boards
    const stories = [];
    for (const board of state.boards || []) {
      for (const list of board.lists || []) {
        for (const card of list.cards || []) {
          stories.push({
            id: card.id,
            title: card.title,
            description: card.description,
            status: card.status || list.statusId,
            priority: card.priority,
            storyPoints: card.storyPoints,
            epicId: card.epicId,
            boardId: board.id,
            listId: list.id,
          });
        }
      }
    }

    return { success: true, stories };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Sync stories to file
 */
async function syncStoriesToFile(projectPath, stories) {
  if (!window.electronAPI?.writeProjectFile || !projectPath)
    return { success: false };

  // Format stories as markdown
  const content = `# Project Stories\n\n_Synced from Scrum Board: ${new Date().toISOString()}_\n\n${stories
    .map(
      (s, i) =>
        `## ${i + 1}. ${s.title || "Untitled"}\n\n**Status:** ${s.status || "backlog"}\n**Priority:** ${s.priority || "medium"}\n\n${s.description || ""}\n`,
    )
    .join("\n---\n\n")}`;

  try {
    await window.electronAPI.writeProjectFile({
      projectRoot: projectPath,
      relativePath: "_bmad-output/stories.md",
      content,
      overwrite: true,
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Load context from project files
 */
async function loadContextFromFiles(projectPath) {
  if (!window.electronAPI?.readProjectFile || !projectPath) {
    return { prd: null, architecture: null, stories: null };
  }

  const readFile = async (relativePath) => {
    try {
      return await window.electronAPI.readProjectFile({
        projectRoot: projectPath,
        relativePath,
      });
    } catch {
      return null;
    }
  };

  const [prd, architecture, stories] = await Promise.all([
    readFile("_bmad-output/prd.md"),
    readFile("_bmad-output/architecture.md"),
    readFile("_bmad-output/stories.md"),
  ]);

  return { prd, architecture, stories };
}

export default function BmadIntegration({ projectPath }) {
  const [activeMode, setActiveMode] = useState(MODES.SYNC);
  const [mcpStatus, setMcpStatus] = useState("checking");
  const [ideFiles, setIdeFiles] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [syncStatus, setSyncStatus] = useState({
    prd: false,
    architecture: false,
    stories: false,
    lastSync: null,
  });
  const [mcpStories, setMcpStories] = useState([]);

  const {
    installStatus,
    activeProjectPath,
    getActiveSession,
    loadProjectContext,
  } = useBmadStore();

  const {
    setActiveProject: setContextProject,
    buildContextPrompt,
    getContextStats,
    reindexCurrentProject,
  } = useProjectContextStore();

  const effectivePath = projectPath || activeProjectPath;

  // Check MCP server status
  useEffect(() => {
    checkMcpStatus();
    const interval = setInterval(checkMcpStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Sync project context on mount and path change
  useEffect(() => {
    if (effectivePath) {
      setContextProject(effectivePath);
      loadProjectContext(effectivePath);
    }
  }, [effectivePath]);

  const checkMcpStatus = async () => {
    try {
      const response = await fetch(`${MCP_BASE_URL}/health`);
      setMcpStatus(response.ok ? "connected" : "disconnected");
    } catch {
      setMcpStatus("disconnected");
    }
  };

  // Full sync - sync all context between IDE, GUI, and MCP
  const performFullSync = useCallback(async () => {
    if (!effectivePath) return;

    setSyncing(true);
    setError(null);

    try {
      // 1. Load context from files
      const fileContext = await loadContextFromFiles(effectivePath);

      // 2. Fetch stories from MCP
      const mcpResult = await fetchStoriesFromMcp();
      if (mcpResult.success) {
        setMcpStories(mcpResult.stories);

        // 3. Sync MCP stories to file
        if (mcpResult.stories.length > 0) {
          await syncStoriesToFile(effectivePath, mcpResult.stories);
        }
      }

      // 4. Update sync status
      setSyncStatus({
        prd: !!fileContext.prd,
        architecture: !!fileContext.architecture,
        stories: mcpResult.success,
        lastSync: new Date().toISOString(),
      });

      // 5. Reload project context in stores
      await loadProjectContext(effectivePath);
      await reindexCurrentProject();

      // 6. Generate IDE rules
      await generateIdeRules(effectivePath, fileContext);
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  }, [effectivePath, loadProjectContext, reindexCurrentProject]);

  // Generate IDE rules file
  const generateIdeRules = async (path, context) => {
    if (!window.electronAPI?.writeProjectFile) return;

    const projectName = path?.split(/[/\\]/).pop() || "Project";

    const rulesContent = `# BMAD Method Project Rules
# Generated by Next-Gen Tools - ${new Date().toISOString()}

## Project: ${projectName}

## BMAD Workflow Commands
Use these commands to run guided workflows:
- *create-prd - Create a Product Requirements Document
- *create-story - Create a user story  
- *create-architecture - Design system architecture
- *create-epics - Create epic items
- *brainstorm - Brainstorm ideas
- *save-prd - Save PRD to file
- *help - Show available commands

## Project Context
${context.prd ? "✓ PRD loaded from _bmad-output/prd.md" : "○ PRD not yet created - run *create-prd"}
${context.architecture ? "✓ Architecture loaded from _bmad-output/architecture.md" : "○ Architecture not yet created - run *create-architecture"}
${context.stories ? "✓ Stories synced from scrum board" : "○ No stories yet - run *create-story"}

## Scrum Board Integration
MCP Server: ${MCP_BASE_URL}
SSE Endpoint: ${MCP_BASE_URL}/sse
MCP Endpoint: ${MCP_BASE_URL}/mcp

## Working with Stories
1. Create stories using *create-story command
2. Stories sync to scrum board automatically via MCP
3. Stories also save to _bmad-output/stories.md for IDE access

## Context Files
- _bmad-output/prd.md - Product Requirements
- _bmad-output/architecture.md - System Architecture  
- _bmad-output/stories.md - User Stories (synced from board)
- _bmad/bmm/agents/ - BMAD agent definitions

## Chat Context
The GUI chat remembers conversation history per project and agent.
Context from PRD, Architecture, and Stories is automatically included.
`;

    try {
      // Write to multiple IDE formats
      await Promise.all([
        window.electronAPI.writeProjectFile({
          projectRoot: path,
          relativePath: ".cursorrules",
          content: rulesContent,
          overwrite: true,
        }),
        window.electronAPI.writeProjectFile({
          projectRoot: path,
          relativePath: ".windsurfrules",
          content: rulesContent,
          overwrite: true,
        }),
        window.electronAPI.writeProjectFile({
          projectRoot: path,
          relativePath: "AGENTS.md",
          content: rulesContent,
          overwrite: true,
        }),
      ]);
    } catch (err) {
      console.error("[BMAD] Failed to generate IDE rules:", err);
    }
  };

  // List IDE integration files
  const listIdeFiles = async () => {
    if (!effectivePath || !window.electronAPI?.readProjectFile) return;

    try {
      const files = [
        { path: "_bmad/bmm/module.yaml", name: "BMAD Module", type: "config" },
        { path: "_bmad-output/prd.md", name: "PRD Document", type: "artifact" },
        {
          path: "_bmad-output/architecture.md",
          name: "Architecture",
          type: "artifact",
        },
        {
          path: "_bmad-output/stories.md",
          name: "Stories (synced)",
          type: "artifact",
        },
        { path: ".cursorrules", name: "Cursor Rules", type: "ide" },
        { path: ".windsurfrules", name: "Windsurf Rules", type: "ide" },
        { path: "AGENTS.md", name: "Agents Config", type: "ide" },
      ];

      const results = await Promise.all(
        files.map(async (file) => {
          try {
            const content = await window.electronAPI.readProjectFile({
              projectRoot: effectivePath,
              relativePath: file.path,
            });
            return { ...file, exists: !!content };
          } catch {
            return { ...file, exists: false };
          }
        }),
      );

      setIdeFiles(results);
    } catch (err) {
      console.error("Failed to list IDE files:", err);
    }
  };

  useEffect(() => {
    if (activeMode === MODES.IDE) {
      listIdeFiles();
    }
  }, [activeMode, effectivePath]);

  // Auto-sync on mount
  useEffect(() => {
    if (effectivePath && activeMode === MODES.SYNC) {
      performFullSync();
    }
  }, [effectivePath]);

  const contextStats = getContextStats();

  return (
    <div className="bg-card rounded-lg border border-border">
      {/* Mode Tabs */}
      <div className="flex items-center gap-1 p-2 bg-muted/50 border-b border-border">
        {[
          { id: MODES.SYNC, icon: FolderSync, label: "Sync" },
          { id: MODES.GUI, icon: MessageSquare, label: "Chat" },
          { id: MODES.IDE, icon: Code2, label: "IDE" },
          { id: MODES.MCP, icon: Server, label: "MCP" },
        ].map((mode) => (
          <button
            key={mode.id}
            onClick={() => setActiveMode(mode.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
              activeMode === mode.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <mode.icon size={14} />
            {mode.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* SYNC Mode - Context Synchronization */}
        {activeMode === MODES.SYNC && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <FolderSync size={16} className="text-primary" />
                Context Sync
              </h3>
              <button
                onClick={performFullSync}
                disabled={syncing}
                className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded flex items-center gap-1.5 hover:bg-primary/90 disabled:opacity-50"
              >
                {syncing ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}
                Sync All
              </button>
            </div>

            {error && (
              <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
                {error}
              </div>
            )}

            {/* Sync Status Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div
                className={`p-3 rounded-lg border ${syncStatus.prd ? "bg-green-500/10 border-green-500/30" : "bg-muted/30 border-border"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileOutput
                    size={14}
                    className={
                      syncStatus.prd
                        ? "text-green-500"
                        : "text-muted-foreground"
                    }
                  />
                  <span className="text-xs font-medium">PRD</span>
                </div>
                <span
                  className={`text-[10px] ${syncStatus.prd ? "text-green-500" : "text-muted-foreground"}`}
                >
                  {syncStatus.prd ? "Synced" : "Not found"}
                </span>
              </div>

              <div
                className={`p-3 rounded-lg border ${syncStatus.architecture ? "bg-blue-500/10 border-blue-500/30" : "bg-muted/30 border-border"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Database
                    size={14}
                    className={
                      syncStatus.architecture
                        ? "text-blue-500"
                        : "text-muted-foreground"
                    }
                  />
                  <span className="text-xs font-medium">Arch</span>
                </div>
                <span
                  className={`text-[10px] ${syncStatus.architecture ? "text-blue-500" : "text-muted-foreground"}`}
                >
                  {syncStatus.architecture ? "Synced" : "Not found"}
                </span>
              </div>

              <div
                className={`p-3 rounded-lg border ${syncStatus.stories ? "bg-purple-500/10 border-purple-500/30" : "bg-muted/30 border-border"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <ListTodo
                    size={14}
                    className={
                      syncStatus.stories
                        ? "text-purple-500"
                        : "text-muted-foreground"
                    }
                  />
                  <span className="text-xs font-medium">Stories</span>
                </div>
                <span
                  className={`text-[10px] ${syncStatus.stories ? "text-purple-500" : "text-muted-foreground"}`}
                >
                  {mcpStories.length > 0
                    ? `${mcpStories.length} synced`
                    : "No stories"}
                </span>
              </div>
            </div>

            {/* Last Sync */}
            {syncStatus.lastSync && (
              <p className="text-[10px] text-muted-foreground text-center">
                Last synced:{" "}
                {new Date(syncStatus.lastSync).toLocaleTimeString()}
              </p>
            )}

            {/* Context Stats */}
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs font-medium text-foreground mb-2">
                Chat Context Includes:
              </p>
              <div className="flex flex-wrap gap-1">
                {contextStats.hasPrd && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-500 rounded">
                    PRD
                  </span>
                )}
                {contextStats.hasAgentRules && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-500 rounded">
                    AGENTS.md
                  </span>
                )}
                {contextStats.bmadAgentsCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-500 rounded">
                    {contextStats.bmadAgentsCount} agents
                  </span>
                )}
                {contextStats.skillsCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-500 rounded">
                    {contextStats.skillsCount} skills
                  </span>
                )}
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground">
              <p>
                <strong>How it works:</strong>
              </p>
              <ul className="mt-1 space-y-0.5">
                <li>• Chat context includes PRD, Architecture from files</li>
                <li>• Stories sync between MCP scrum board and files</li>
                <li>• IDE rules generated for Cursor/Windsurf</li>
                <li>• All modes share the same project context</li>
              </ul>
            </div>
          </div>
        )}

        {/* GUI Mode */}
        {activeMode === MODES.GUI && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-10 h-10 mx-auto mb-2 bg-primary/10 rounded-full flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">
                Chat Mode Active
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-3">
                Use Agent Chat with workflow commands. Context from PRD,
                Architecture, and Stories is included.
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg text-xs">
              <p className="font-medium text-foreground mb-1">
                Workflow Commands:
              </p>
              <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                <span>
                  <code className="text-primary">*create-prd</code>
                </span>
                <span>
                  <code className="text-primary">*create-story</code>
                </span>
                <span>
                  <code className="text-primary">*create-architecture</code>
                </span>
                <span>
                  <code className="text-primary">*create-epics</code>
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Check size={12} className="text-green-500" />
                Context Loaded
              </span>
              <span className="flex items-center gap-1">
                {mcpStatus === "connected" ? (
                  <Check size={12} className="text-green-500" />
                ) : (
                  <AlertCircle size={12} className="text-yellow-500" />
                )}
                MCP {mcpStatus}
              </span>
            </div>
          </div>
        )}

        {/* IDE Mode */}
        {activeMode === MODES.IDE && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">IDE Files</h3>
              <button
                onClick={performFullSync}
                disabled={syncing}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
              >
                {syncing ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Upload size={12} />
                )}
                Sync
              </button>
            </div>

            <div className="space-y-2">
              {ideFiles.map((file, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 p-2 rounded border text-xs ${
                    file.exists
                      ? "bg-green-500/5 border-green-500/20"
                      : "bg-muted/30 border-border"
                  }`}
                >
                  <FileOutput
                    size={12}
                    className={
                      file.exists ? "text-green-500" : "text-muted-foreground"
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground truncate">{file.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {file.path}
                    </p>
                  </div>
                  {file.exists ? (
                    <Check size={12} className="text-green-500" />
                  ) : (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                </div>
              ))}
            </div>

            <div className="p-2 bg-muted/30 rounded text-[10px] text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Usage:</p>
              <ul className="space-y-0.5">
                <li>• Open in Cursor/Windsurf - reads .cursorrules</li>
                <li>• Use same *workflow commands with AI</li>
                <li>• Files sync back to GUI on next Sync</li>
              </ul>
            </div>
          </div>
        )}

        {/* MCP Mode */}
        {activeMode === MODES.MCP && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">
                MCP Server
              </h3>
              <button
                onClick={checkMcpStatus}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <RefreshCw size={12} />
                Check
              </button>
            </div>

            <div
              className={`p-3 rounded-lg border ${
                mcpStatus === "connected"
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-yellow-500/10 border-yellow-500/30"
              }`}
            >
              <div className="flex items-center gap-2">
                {mcpStatus === "connected" ? (
                  <Check size={14} className="text-green-500" />
                ) : mcpStatus === "checking" ? (
                  <Loader2 size={14} className="text-yellow-500 animate-spin" />
                ) : (
                  <AlertCircle size={14} className="text-yellow-500" />
                )}
                <span className="text-xs font-medium">
                  {mcpStatus === "connected"
                    ? "Connected"
                    : mcpStatus === "checking"
                      ? "Checking..."
                      : "Disconnected"}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {MCP_BASE_URL}
              </p>
            </div>

            <div className="p-2 bg-muted/30 rounded text-xs">
              <p className="font-medium text-foreground mb-1">MCP Tools:</p>
              <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
                <span>• create-story</span>
                <span>• update-card</span>
                <span>• move-card</span>
                <span>• list-stories</span>
                <span>• add-epic</span>
                <span>• get-board</span>
              </div>
            </div>

            <div className="p-2 bg-muted/30 rounded text-[10px] text-muted-foreground">
              <p className="font-medium text-foreground mb-1">
                Connect from IDE:
              </p>
              <pre className="bg-background p-1.5 rounded mt-1 overflow-x-auto">
                {`{
  "mcpServers": {
    "scrum": {
      "url": "${MCP_BASE_URL}/mcp"
    }
  }
}`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
