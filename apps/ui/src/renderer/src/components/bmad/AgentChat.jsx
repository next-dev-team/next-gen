/**
 * Agent Chat Component
 *
 * Standalone chat component for interacting with BMAD agents.
 * Features:
 * - Agent selection
 * - Conversation history per project and agent
 * - Context-aware responses
 * - Continue conversation
 * - File read/write for artifacts
 * - MCP integration for scrum operations
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  User,
  Bot,
  Loader2,
  MessageSquare,
  RefreshCw,
  Trash2,
  ChevronDown,
  Sparkles,
  Copy,
  Check,
  FileOutput,
  Save,
  FolderOpen,
  Paperclip,
  X,
  FileText,
  FileCode,
  Image as ImageIcon,
} from "lucide-react";
import useBmadStore from "../../stores/bmadStore";
import useProjectContextStore from "../../stores/projectContextStore";
import { useKanbanStore } from "../../stores/kanbanStore";
import { useRAGSync } from "../../hooks/useRAGSync";

// RAG Constants
const RAG_ENABLED = true; // Toggle RAG feature

// API endpoints
const API_URL = "http://127.0.0.1:3333/api/chat";
const MCP_URL = "http://127.0.0.1:3847";

// Available agents configuration
const AGENTS = {
  pm: {
    id: "pm",
    name: "Product Manager",
    title: "PM Agent",
    icon: "📊",
    description: "Helps with PRD and product requirements",
  },
  analyst: {
    id: "analyst",
    name: "Analyst",
    title: "Analyst Agent",
    icon: "🔍",
    description: "Analyzes market and competitors",
  },
  architect: {
    id: "architect",
    name: "Architect",
    title: "Architect Agent",
    icon: "🏗️",
    description: "Designs system architecture",
  },
  sm: {
    id: "sm",
    name: "Scrum Master",
    title: "SM Agent",
    icon: "📋",
    description: "Helps with sprint planning and stories",
  },
  dev: {
    id: "dev",
    name: "Developer",
    title: "Dev Agent",
    icon: "💻",
    description: "Helps with implementation",
  },
};

// BMAD Workflow Commands - when user types *command, inject workflow instructions
const BMAD_WORKFLOWS = {
  "*create-prd": {
    agent: "pm",
    name: "Create PRD",
    instructions: `You are now running the Create PRD workflow. Follow these steps:

1. **Understand the Product Vision**: Ask the user about their product idea, target users, and core problem being solved.

2. **Discovery Interview**: Ask probing questions to understand:
   - Who are the primary users?
   - What pain points are we solving?
   - What does success look like?
   - What are the constraints (time, budget, tech)?

3. **Define Core Features**: Help identify and prioritize features into:
   - Must-have (MVP)
   - Should-have (v1.1)
   - Nice-to-have (future)

4. **Generate PRD Document**: Once you have enough information, generate a complete PRD with:
   - Executive Summary
   - Problem Statement
   - User Personas
   - Functional Requirements
   - Non-Functional Requirements
   - Success Metrics

Start by asking about the product vision. What product would you like to create the PRD for?`,
  },
  "*create-story": {
    agent: "sm",
    name: "Create Story",
    instructions: `You are now running the Create Story workflow. Follow these steps:

1. **Understand the Epic**: Ask which epic this story belongs to or what feature area.

2. **Define the User Story**: Help create a story in the format:
   "As a [user type], I want to [action] so that [benefit]"

3. **Acceptance Criteria**: Help define clear acceptance criteria using Given/When/Then format.

4. **Story Points**: Help estimate complexity (1, 2, 3, 5, 8, 13).

5. **Dependencies**: Identify any blocking dependencies.

Which epic or feature would you like to create a story for?`,
  },
  "*create-architecture": {
    agent: "architect",
    name: "Create Architecture",
    instructions: `You are now running the Create Architecture workflow. Follow these steps:

1. **Review Requirements**: Ask about the PRD or requirements for the system.

2. **Define System Components**: Help identify:
   - Frontend architecture
   - Backend services
   - Database design
   - External integrations

3. **Technology Selection**: Discuss and recommend tech stack.

4. **Generate Architecture Document**: Create a comprehensive architecture document with diagrams described in text.

What system would you like to architect?`,
  },
  "*brainstorm": {
    agent: "analyst",
    name: "Brainstorm",
    instructions: `You are now running the Brainstorm workflow. Let's explore ideas together!

I'll help you:
1. **Define the Problem Space**: What challenge are we solving?
2. **Generate Ideas**: Let's brainstorm multiple approaches
3. **Evaluate Options**: Pros/cons of each idea
4. **Prioritize**: Which ideas to pursue first

What topic or problem would you like to brainstorm about?`,
  },
  "*create-epics": {
    agent: "pm",
    name: "Create Epics",
    instructions: `You are now running the Create Epics workflow. Follow these steps:

1. **Review PRD**: I'll analyze the project requirements
2. **Identify Themes**: Group features into logical categories
3. **Define Epics**: Create epic-level work items with:
   - Epic name
   - Description
   - Key features included
   - Success criteria

What product/project should I create epics for?`,
  },
  "*save-prd": {
    agent: "pm",
    name: "Save PRD",
    saveArtifact: "prd.md",
    instructions: `I'll help you save the PRD document. Please provide the PRD content, or if we've been working on one, I'll format and save it.

The PRD will be saved to: _bmad-output/prd.md

Would you like me to:
1. Save the current PRD from our conversation
2. Generate a new PRD to save
3. Import a PRD from clipboard`,
  },
  "*help": {
    agent: null, // Don't switch agent
    name: "BMAD Help",
    instructions: `## Available BMAD Workflow Commands

| Command | Description | Agent |
|---------|-------------|-------|
| \`*create-prd\` | Guided PRD creation | PM |
| \`*create-story\` | Create user story | Scrum Master |
| \`*create-architecture\` | Design architecture | Architect |
| \`*create-epics\` | Create epic items | PM |
| \`*brainstorm\` | Brainstorm ideas | Analyst |
| \`*save-prd\` | Save PRD to file | PM |
| \`*help\` | Show this help | - |

## Quick Tips
- Switch agents using the dropdown above
- Workflows auto-switch to the right agent
- Artifacts save to \`_bmad-output/\` folder
- Use IDE mode to sync files with external editors

Type any command to start a guided workflow!`,
  },
};

// ===========================================
// File Operations & MCP Integration Helpers
// ===========================================

/**
 * Save artifact to project file
 */
async function saveArtifact(projectPath, filename, content) {
  if (!window.electronAPI?.writeProjectFile) {
    console.error("[BMAD] File write API not available");
    return { success: false, error: "File write API not available" };
  }

  try {
    await window.electronAPI.writeProjectFile({
      projectRoot: projectPath,
      relativePath: `_bmad-output/${filename}`,
      content,
      overwrite: true,
    });
    console.log(`[BMAD] Saved artifact: _bmad-output/${filename}`);
    return { success: true, path: `_bmad-output/${filename}` };
  } catch (err) {
    console.error("[BMAD] Failed to save artifact:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Read artifact from project file
 */
async function readArtifact(projectPath, filename) {
  if (!window.electronAPI?.readProjectFile) {
    return { success: false, error: "File read API not available" };
  }

  try {
    const content = await window.electronAPI.readProjectFile({
      projectRoot: projectPath,
      relativePath: `_bmad-output/${filename}`,
    });
    return { success: true, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Create story via MCP server (REST API)
 */
async function createStoryViaMcp(storyData) {
  try {
    // First get the state to find the board and backlog list
    const stateResponse = await fetch(`${MCP_URL}/api/state`);
    if (!stateResponse.ok)
      throw new Error(`Failed to get state: ${stateResponse.status}`);
    const state = await stateResponse.json();

    // Find the first board and its backlog list
    const board = state.boards?.[0];
    if (!board) throw new Error("No board found");

    const backlogList = board.lists?.find((l) => l.statusId === "backlog");
    if (!backlogList) throw new Error("No backlog list found");

    // Create the card
    const response = await fetch(`${MCP_URL}/api/card/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boardId: board.id,
        listId: backlogList.id,
        title: storyData.title || "New Story",
        description: storyData.description || "",
        type: "story",
        priority: storyData.priority || "medium",
        status: "backlog",
        storyPoints: storyData.points || 0,
        epicId: storyData.epicId || null,
      }),
    });

    if (!response.ok) throw new Error(`MCP error: ${response.status}`);
    const result = await response.json();
    return { success: true, result };
  } catch (err) {
    console.error("[MCP] create-story failed:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Create epic via MCP server (REST API)
 */
async function createEpicViaMcp(epicData) {
  try {
    const response = await fetch(`${MCP_URL}/api/epic/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: epicData.name || epicData.title || "New Epic",
        description: epicData.description || "",
        status: epicData.status || "backlog",
        color: epicData.color || "#3b82f6",
      }),
    });

    if (!response.ok) throw new Error(`MCP error: ${response.status}`);
    const result = await response.json();
    return { success: true, result };
  } catch (err) {
    console.error("[MCP] create-epic failed:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Extract markdown code blocks or structured data from LLM response
 */
function extractArtifactFromResponse(content, type = "markdown") {
  // Try to find markdown code block
  const codeBlockMatch = content.match(/```(?:markdown|md)?\n([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find JSON for stories
  if (type === "json") {
    const jsonMatch = content.match(/```json\n([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        return null;
      }
    }
  }

  // For PRD/Architecture, look for document headers
  if (content.includes("# ") || content.includes("## ")) {
    // Extract from first header onwards
    const headerMatch = content.match(/(^|\n)(#+ .+[\s\S]*)/);
    if (headerMatch) {
      return headerMatch[2].trim();
    }
  }

  return null;
}

// Chat Message Component with action buttons
function ChatMessage({
  message,
  agent,
  onCopy,
  onSaveArtifact,
  onCreateStory,
  projectPath,
}) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check if message looks like a PRD, architecture, or story
  const content = message.content || "";
  const looksLikePrd =
    content.includes("# PRD") ||
    content.includes("# Product Requirements") ||
    content.includes("## Overview");
  const looksLikeArch =
    content.includes("# Architecture") ||
    content.includes("## System Components") ||
    content.includes("## Tech Stack");
  const looksLikeStory =
    content.includes("As a ") &&
    content.includes("I want") &&
    content.includes("so that");

  const handleSave = async (type) => {
    if (!onSaveArtifact || !projectPath) return;
    setSaving(true);
    try {
      const artifact = extractArtifactFromResponse(content) || content;
      const filename =
        type === "prd"
          ? "prd.md"
          : type === "architecture"
            ? "architecture.md"
            : "document.md";
      const result = await saveArtifact(projectPath, filename, artifact);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        onSaveArtifact?.(result.path);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCreateStory = async () => {
    if (!onCreateStory) return;
    setSaving(true);
    try {
      // Parse story from content
      const titleMatch = content.match(/(?:title|story):\s*(.+)/i);
      const descMatch = content.match(
        /As a\s+(.+),\s*I want\s+(.+)\s+so that\s+(.+)/i,
      );

      const storyData = {
        title: titleMatch?.[1] || "New Story",
        description: descMatch
          ? `As a ${descMatch[1]}, I want ${descMatch[2]} so that ${descMatch[3]}`
          : content.slice(0, 200),
        status: "backlog",
        priority: "medium",
      };

      const result = await createStoryViaMcp(storyData);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        onCreateStory?.(result);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
          isUser
            ? "bg-primary/20 text-primary"
            : "bg-purple-500/20 text-purple-500 dark:text-purple-400"
        }`}
      >
        {isUser ? <User size={16} /> : agent?.icon || <Bot size={16} />}
      </div>
      <div
        className={`max-w-[80%] rounded-xl px-4 py-3 ${
          isUser
            ? "bg-primary/10 border border-primary/30"
            : "bg-muted border border-border"
        }`}
      >
        <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
          {message.content}
        </div>
        {/* Show attachments indicator for user messages */}
        {isUser && message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50 flex flex-wrap gap-1">
            {message.attachments.map((att, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-primary/20 text-primary rounded"
              >
                <Paperclip size={10} />
                {att.name}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            {message.timestamp
              ? new Date(message.timestamp).toLocaleTimeString()
              : ""}
          </span>
          {!isUser && (
            <div className="flex items-center gap-2">
              {/* Save as PRD button */}
              {looksLikePrd && (
                <button
                  onClick={() => handleSave("prd")}
                  disabled={saving}
                  className="text-xs text-green-500 hover:text-green-400 flex items-center gap-1 transition-colors"
                >
                  {saving ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Save size={12} />
                  )}
                  Save PRD
                </button>
              )}
              {/* Save as Architecture button */}
              {looksLikeArch && (
                <button
                  onClick={() => handleSave("architecture")}
                  disabled={saving}
                  className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1 transition-colors"
                >
                  {saving ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Save size={12} />
                  )}
                  Save Arch
                </button>
              )}
              {/* Create Story button */}
              {looksLikeStory && (
                <button
                  onClick={handleCreateStory}
                  disabled={saving}
                  className="text-xs text-purple-500 hover:text-purple-400 flex items-center gap-1 transition-colors"
                >
                  {saving ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <FileOutput size={12} />
                  )}
                  Create Story
                </button>
              )}
              {/* Saved indicator */}
              {saved && (
                <span className="text-xs text-green-500 flex items-center gap-1">
                  <Check size={12} />
                  Saved!
                </span>
              )}
              {/* Copy button */}
              <button
                onClick={handleCopy}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                {copied ? (
                  <>
                    <Check size={12} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    Copy
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Agent Selector Dropdown
function AgentSelector({ agents, activeAgent, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const currentAgent = agents[activeAgent];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-3 bg-muted/50 border border-border rounded-lg hover:border-primary/50 transition-colors w-full"
      >
        <span className="text-xl">{currentAgent?.icon}</span>
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-foreground">
            {currentAgent?.title}
          </div>
          <div className="text-xs text-muted-foreground">
            {currentAgent?.name}
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-xl z-10 max-h-64 overflow-y-auto">
          {Object.values(agents).map((agent) => (
            <button
              key={agent.id}
              onClick={() => {
                onSelect(agent.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors ${
                activeAgent === agent.id ? "bg-primary/10" : ""
              }`}
            >
              <span className="text-lg">{agent.icon}</span>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-foreground">
                  {agent.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {agent.description}
                </div>
              </div>
              {activeAgent === agent.id && (
                <Check size={16} className="text-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Suggested Prompts
function SuggestedPrompts({ agent, onSelect }) {
  const prompts = {
    pm: ["*create-prd", "*create-epics", "*save-prd"],
    analyst: ["*brainstorm", "*help", "Analyze this competitor"],
    architect: [
      "*create-architecture",
      "What tech stack?",
      "Review architecture",
    ],
    sm: ["*create-story", "Break down feature", "Estimate points"],
    dev: ["*help", "Implement feature", "Debug this issue"],
  };

  const agentPrompts = prompts[agent] || prompts.pm;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Suggested prompts:</p>
      <div className="flex flex-wrap gap-2">
        {agentPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onSelect(prompt)}
            className="px-3 py-1.5 text-xs bg-muted border border-border rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

// Main Agent Chat Component
export default function AgentChat({
  storyId = "default",
  projectPath = "",
  className = "",
}) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeAgent, setActiveAgent] = useState("pm");
  const chatRef = useRef(null);

  const {
    getActiveSession,
    getChatHistory,
    saveChatHistory,
    clearChatHistory,
    setActiveProject,
    activeProjectPath,
  } = useBmadStore();

  // Project context store for enhanced context (now with RAG)
  const {
    setActiveProject: setContextProject,
    buildContextPrompt,
    getContextStats,
    isIndexing,
    reindexCurrentProject,
    queryRAG,
    indexChatDecision,
    syncAll,
    ragInitialized,
    indexKanbanState,
  } = useProjectContextStore();

  // Kanban store for accessing ticket data
  const kanbanState = useKanbanStore((state) => state.state);

  // RAG sync hook - automatically syncs kanban changes to RAG
  const { syncKanbanToRAG, isSyncing: isRAGSyncing } = useRAGSync();

  // Use a default fallback key for persistence when no project is set
  const DEFAULT_PROJECT_KEY = "__default_scrum_project__";
  const effectiveProjectPath =
    projectPath || activeProjectPath || DEFAULT_PROJECT_KEY;

  // Sync projectPath with both stores (only if we have a real project path)
  useEffect(() => {
    const targetPath = projectPath || activeProjectPath;
    if (targetPath) {
      if (projectPath && projectPath !== activeProjectPath) {
        setActiveProject(projectPath);
      }
      // Also set in project context store for indexing
      setContextProject(targetPath);
    }
  }, [projectPath, activeProjectPath, setActiveProject, setContextProject]);

  // Get messages from store for current project and agent (uses effectiveProjectPath for persistence)
  const messages = getChatHistory(activeAgent, effectiveProjectPath);

  // Debug: log on mount to verify persistence
  useEffect(() => {
    console.log("[AgentChat] Loaded messages:", {
      agent: activeAgent,
      projectPath: effectiveProjectPath,
      messageCount: messages.length,
    });
  }, [activeAgent, effectiveProjectPath, messages.length]);

  // Get project context
  const projectContext = getActiveSession().projectContext;

  const agents = AGENTS;
  const currentAgent = agents[activeAgent];

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // Get context stats for display
  const contextStats = getContextStats();

  // Build system prompt based on agent and enhanced project context
  // Now async to support RAG queries (v1.0.2)
  const buildSystemPrompt = async (userQuery = null) => {
    // Detailed agent role descriptions
    const agentRoles = {
      pm: `You are John, an expert Product Manager AI assistant with 8+ years of experience launching B2B and consumer products.

Your expertise includes:
- PRD creation and refinement
- Market research and competitive analysis
- User behavior insights and Jobs-to-be-Done framework
- Feature prioritization and opportunity scoring
- Stakeholder alignment and requirement discovery

Your communication style:
- Ask "WHY?" relentlessly to understand root needs
- Be direct and data-sharp, cut through fluff
- PRDs emerge from understanding, not template filling
- Ship the smallest thing that validates assumptions
- User value first, technical feasibility is a constraint`,

      analyst: `You are an expert Business Analyst AI assistant specializing in research and discovery.

Your expertise includes:
- Market analysis and competitive landscape mapping
- User research and behavior pattern identification
- Data analysis and insight extraction
- Business case development
- Stakeholder interviews and requirement elicitation

Be thorough, methodical, and always back conclusions with evidence.`,

      architect: `You are an expert Software Architect AI assistant with deep technical knowledge.

Your expertise includes:
- System design and architecture patterns
- Technology stack selection and trade-off analysis
- Scalability, performance, and security considerations
- API design and integration patterns
- Database design and data modeling
- Cloud architecture (AWS, GCP, Azure)

Provide clear diagrams (describe in text/mermaid) and justify architectural decisions.`,

      sm: `You are an expert Scrum Master AI assistant focused on agile delivery.

Your expertise includes:
- Sprint planning and backlog refinement
- User story writing (As a... I want... So that...)
- Story point estimation and velocity tracking
- Removing blockers and facilitating ceremonies
- Team health and continuous improvement

Help break down work into actionable, estimable stories.`,

      dev: `You are a Senior Developer AI assistant with full-stack expertise.

Your expertise includes:
- React, TypeScript, Node.js development
- Code review and best practices
- Debugging and troubleshooting
- Performance optimization
- Testing strategies
- Clean code principles and design patterns

Write clean, maintainable code with clear explanations.`,
    };

    let prompt = agentRoles[activeAgent] || agentRoles.pm;

    // v1.0.2: Query RAG for relevant context based on user's question
    if (RAG_ENABLED && userQuery && ragInitialized) {
      try {
        const ragContext = await queryRAG(userQuery, { maxTokens: 2000 });
        if (ragContext && ragContext.length > 0) {
          prompt += `\n\n---\n\n# Retrieved Knowledge (from project memory)\n\n${ragContext}`;
          console.log(
            "[AgentChat] RAG context injected, length:",
            ragContext.length,
          );
        }
      } catch (err) {
        console.warn("[AgentChat] RAG query failed:", err);
      }
    }

    // v1.0.2: Inject live kanban data for SM agent or when asking about tickets/backlog
    const kanbanKeywords = [
      "ticket",
      "backlog",
      "sprint",
      "story",
      "stories",
      "epic",
      "board",
      "status",
      "blocked",
      "in progress",
      "done",
      "todo",
      "how many",
    ];
    const isKanbanQuery =
      userQuery &&
      kanbanKeywords.some((kw) => userQuery.toLowerCase().includes(kw));

    if (kanbanState && (activeAgent === "sm" || isKanbanQuery)) {
      try {
        const boards = kanbanState.boards || [];
        const epics = kanbanState.epics || [];
        const sprints = kanbanState.sprints || [];

        let kanbanContext = "\n\n---\n\n# Live Kanban Board Data\n\n";

        // Summarize tickets by status
        const ticketsByStatus = {};
        let totalTickets = 0;

        for (const board of boards) {
          for (const list of board.lists || []) {
            const statusName = list.name || list.statusId || "Unknown";
            const cards = list.cards || [];
            ticketsByStatus[statusName] = ticketsByStatus[statusName] || [];

            for (const card of cards) {
              ticketsByStatus[statusName].push({
                id: card.id,
                title: card.title,
                priority: card.priority,
                labels: card.labels,
              });
              totalTickets++;
            }
          }
        }

        kanbanContext += `## Summary\n- **Total Tickets:** ${totalTickets}\n`;

        // Show ticket counts by status
        kanbanContext += `\n## Tickets by Status\n`;
        for (const [status, tickets] of Object.entries(ticketsByStatus)) {
          kanbanContext += `\n### ${status} (${tickets.length} tickets)\n`;
          for (const ticket of tickets.slice(0, 10)) {
            // Limit to 10 per status
            const priorityEmoji =
              ticket.priority === "high"
                ? "🔴"
                : ticket.priority === "medium"
                  ? "🟡"
                  : "🟢";
            kanbanContext += `- ${priorityEmoji} #${ticket.id}: ${ticket.title}\n`;
          }
          if (tickets.length > 10) {
            kanbanContext += `- ... and ${tickets.length - 10} more\n`;
          }
        }

        // Show epics
        if (epics.length > 0) {
          kanbanContext += `\n## Epics (${epics.length})\n`;
          for (const epic of epics.slice(0, 5)) {
            kanbanContext += `- 🎯 ${epic.name}: ${epic.description || "No description"}\n`;
          }
        }

        // Show sprints
        if (sprints.length > 0) {
          const activeSprint = sprints.find((s) => s.status === "active");
          if (activeSprint) {
            kanbanContext += `\n## Active Sprint: ${activeSprint.name}\n`;
            kanbanContext += `- Goal: ${activeSprint.goal || "Not set"}\n`;
            kanbanContext += `- Period: ${activeSprint.startDate} to ${activeSprint.endDate}\n`;
          }
        }

        prompt += kanbanContext;
        console.log(
          "[AgentChat] Kanban context injected, total tickets:",
          totalTickets,
        );
      } catch (err) {
        console.warn("[AgentChat] Failed to inject kanban context:", err);
      }
    }

    // Add enhanced project context from projectContextStore (with agentId for agent-specific context)
    const enhancedContext = await buildContextPrompt({
      maxTokens: 6000,
      agentId: activeAgent, // Pass agent ID to get agent-specific BMAD persona
      userQuery, // Pass user query for additional RAG lookup
    });

    // Debug: log context stats
    console.log(
      "[AgentChat] Building prompt for:",
      activeAgent,
      "Context stats:",
      contextStats,
      "RAG ready:",
      ragInitialized,
    );
    console.log(
      "[AgentChat] Enhanced context length:",
      enhancedContext?.length || 0,
    );

    if (enhancedContext) {
      prompt += `\n\n---\n\n# Project Context\n\n${enhancedContext}`;
    }

    // Legacy context from bmadStore (fallback only if not already included)
    if (
      projectContext.prd &&
      !enhancedContext.includes("Product Requirements")
    ) {
      prompt += `\n\n## Project PRD\n${projectContext.prd.slice(0, 3000)}`;
    }
    if (
      projectContext.architecture &&
      !enhancedContext.includes("Architecture")
    ) {
      prompt += `\n\n## Architecture\n${projectContext.architecture.slice(0, 2000)}`;
    }

    return prompt;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const trimmedInput = input.trim().toLowerCase();

    // Check if this is a workflow command
    const workflow = BMAD_WORKFLOWS[trimmedInput];
    if (workflow) {
      // For *help, just show the instructions without calling LLM
      if (trimmedInput === "*help") {
        const helpMessage = {
          role: "assistant",
          content: workflow.instructions,
          timestamp: new Date().toISOString(),
        };
        const newMessages = [
          ...messages,
          { role: "user", content: input, timestamp: new Date().toISOString() },
          helpMessage,
        ];
        saveChatHistory(activeAgent, newMessages, effectiveProjectPath);
        setInput("");
        return;
      }

      // Switch to appropriate agent if specified
      if (workflow.agent && workflow.agent !== activeAgent) {
        setActiveAgent(workflow.agent);
      }

      // Inject workflow instructions as a system message followed by the workflow start
      const workflowStartMessage = {
        role: "user",
        content: `${input}\n\n[Starting ${workflow.name} workflow...]`,
        timestamp: new Date().toISOString(),
      };

      const newMessages = [...messages, workflowStartMessage];
      saveChatHistory(
        workflow.agent || activeAgent,
        newMessages,
        effectiveProjectPath,
      );
      setInput("");
      setIsLoading(true);
      setError(null);

      try {
        // Include workflow instructions in the prompt (now async with RAG)
        const systemPrompt = await buildSystemPrompt(input);
        const apiMessages = [
          {
            role: "system",
            content: systemPrompt + "\n\n---\n\n" + workflow.instructions,
          },
          ...newMessages.map((m) => ({ role: m.role, content: m.content })),
        ];

        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages, provider: "codex" }),
        });

        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();

        const assistantMessage = {
          role: "assistant",
          content:
            data.text ||
            data.content ||
            data.message ||
            data.response ||
            "No response received",
          timestamp: new Date().toISOString(),
        };

        saveChatHistory(
          workflow.agent || activeAgent,
          [...newMessages, assistantMessage],
          effectiveProjectPath,
        );
      } catch (err) {
        console.error("Workflow error:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Normal message handling
    const userMessage = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
      attachments:
        attachedFiles.length > 0
          ? attachedFiles.map((f) => ({
              name: f.name,
              type: f.type,
              size: f.size,
            }))
          : undefined,
    };

    // Build message content with attachments
    let messageContent = input;
    if (attachedFiles.length > 0) {
      messageContent += "\n\n---\n\n## Attached Files (Uploaded via Chat)\n\n";
      for (const file of attachedFiles) {
        messageContent += `### 📎 ${file.name}\n`;
        if (file.isImage) {
          // For images - clarify this is an embedded upload, not a file path to read
          messageContent += `**[EMBEDDED IMAGE UPLOAD]**\n`;
          messageContent += `- Filename: ${file.name}\n`;
          messageContent += `- Size: ${formatFileSize(file.size)}\n`;
          messageContent += `- Type: ${file.type}\n\n`;
          messageContent += `> ⚠️ NOTE: This image was uploaded directly to this chat. You cannot access it via file path. `;
          messageContent += `Since you are a text-only AI, you cannot see the image content. `;
          messageContent += `Please ask the user to describe what's in the image or what they need help with regarding it.\n\n`;
        } else if (file.isCode) {
          messageContent += `\`\`\`${file.extension.replace(".", "")}\n${file.content.slice(0, 10000)}\n\`\`\`\n\n`;
        } else {
          messageContent += `\`\`\`\n${file.content.slice(0, 10000)}\n\`\`\`\n\n`;
        }
        if (!file.isImage && file.content.length > 10000) {
          messageContent += `*(truncated, showing first 10,000 characters)*\n\n`;
        }
      }
    }

    // Create message with original content for display, but use enhanced content for API
    const displayMessage = { ...userMessage, content: input };

    // Save attached files before clearing (needed for API call)
    const filesToSend = [...attachedFiles];

    const newMessages = [...messages, displayMessage];
    saveChatHistory(activeAgent, newMessages, effectiveProjectPath);
    setInput("");
    setAttachedFiles([]); // Clear attachments after sending
    setIsLoading(true);
    setError(null);

    try {
      // Build messages array with system prompt (now async with RAG - v1.0.2)
      const systemPrompt = await buildSystemPrompt(messageContent); // Use enhanced content for RAG

      // Build the user message content - use multimodal format if images are attached
      const hasImages = filesToSend.some((f) => f.isImage && f.dataUrl);
      let userMessageContent;

      if (hasImages) {
        // Use OpenAI Vision format: content is an array of text and image_url objects
        userMessageContent = [{ type: "text", text: messageContent }];

        // Add images as image_url objects with base64 data URLs
        for (const file of filesToSend) {
          if (file.isImage && file.dataUrl) {
            userMessageContent.push({
              type: "image_url",
              image_url: {
                url: file.dataUrl, // Already in data:image/...;base64,... format
                detail: "auto", // Let the model decide detail level
              },
            });
          }
        }
      } else {
        // Text-only message
        userMessageContent = messageContent;
      }

      const apiMessages = [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userMessageContent },
      ];

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: apiMessages,
          provider: "codex",
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage = {
        role: "assistant",
        content:
          data.text ||
          data.content ||
          data.message ||
          data.response ||
          "No response received",
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...newMessages, assistantMessage];
      saveChatHistory(activeAgent, updatedMessages, effectiveProjectPath);

      // v1.0.2: Index important decisions in RAG
      // Check if the response looks like an important decision or artifact
      const responseContent = assistantMessage.content || "";
      const isImportantDecision =
        responseContent.includes("# ") ||
        responseContent.includes("Decision:") ||
        responseContent.includes("We decided") ||
        responseContent.includes("Conclusion:") ||
        responseContent.length > 500;

      if (isImportantDecision && RAG_ENABLED) {
        try {
          await indexChatDecision(assistantMessage, activeAgent);
        } catch (err) {
          // Non-critical, just log
          console.warn("[AgentChat] Failed to index decision:", err);
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setError(err.message || "Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // File attachment state
  const [attachedFiles, setAttachedFiles] = useState([]);
  const fileInputRef = useRef(null);

  // Supported file extensions (no video files)
  const SUPPORTED_EXTENSIONS = [
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".py",
    ".java",
    ".cpp",
    ".c",
    ".h",
    ".css",
    ".scss",
    ".html",
    ".vue",
    ".svelte",
    ".json",
    ".yaml",
    ".yml",
    ".xml",
    ".toml",
    ".md",
    ".txt",
    ".csv",
    ".log",
    ".sql",
    ".sh",
    ".bash",
    ".ps1",
    ".env",
    ".gitignore",
    ".dockerfile",
    // Image files
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".webp",
    ".ico",
    ".bmp",
    // Document files
    ".pdf",
    // Design files
    ".fig",
    ".sketch",
    ".xd",
  ];

  // Image extensions for special handling
  const IMAGE_EXTENSIONS = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".webp",
    ".ico",
    ".bmp",
  ];

  // Check if file is an image
  const isImageFile = (ext) => IMAGE_EXTENSIONS.includes(ext.toLowerCase());

  // Handle file selection
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    const newAttachments = [];

    for (const file of files) {
      // Skip video files
      if (file.type.startsWith("video/")) {
        console.warn(`Video files are not supported: ${file.name}`);
        continue;
      }

      // Check file size (max 2MB for images, 500KB for text)
      const maxSize = file.type.startsWith("image/")
        ? 2 * 1024 * 1024
        : 500 * 1024;
      if (file.size > maxSize) {
        console.warn(
          `File ${file.name} is too large (max ${maxSize / 1024}KB)`,
        );
        continue;
      }

      try {
        const ext = "." + file.name.split(".").pop()?.toLowerCase();
        const isImage = isImageFile(ext) || file.type.startsWith("image/");
        const isCode = [
          ".js",
          ".jsx",
          ".ts",
          ".tsx",
          ".py",
          ".java",
          ".cpp",
          ".css",
          ".html",
        ].includes(ext);

        let content;
        let dataUrl = null;

        if (isImage) {
          // Read image as base64 data URL
          dataUrl = await readFileAsDataUrl(file);
          content = `[Image: ${file.name} (${formatFileSize(file.size)})]`;
        } else {
          // Read as text
          content = await readFileAsText(file);
        }

        newAttachments.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          size: file.size,
          type: file.type || "text/plain",
          content: content,
          dataUrl: dataUrl,
          isCode,
          isImage,
          extension: ext,
        });
      } catch (err) {
        console.error(`Failed to read file ${file.name}:`, err);
      }
    }

    setAttachedFiles((prev) => [...prev, ...newAttachments]);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Read file as text
  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result || "");
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // Read file as data URL (for images)
  const readFileAsDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result || "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Remove attached file
  const removeAttachment = (id) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Get file icon based on extension
  const getFileIcon = (ext) => {
    if (
      [
        ".js",
        ".jsx",
        ".ts",
        ".tsx",
        ".py",
        ".java",
        ".cpp",
        ".css",
        ".html",
      ].includes(ext)
    ) {
      return <FileCode size={14} className="text-blue-500" />;
    }
    if ([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"].includes(ext)) {
      return <ImageIcon size={14} className="text-green-500" />;
    }
    return <FileText size={14} className="text-muted-foreground" />;
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleClear = () => {
    if (confirm(`Clear conversation with ${currentAgent?.name}?`)) {
      clearChatHistory(activeAgent, effectiveProjectPath);
      setError(null);
    }
  };

  const handleSuggestedPrompt = (prompt) => {
    setInput(prompt);
  };

  // Handle agent change - messages are automatically loaded from store
  const handleAgentChange = (agentId) => {
    setActiveAgent(agentId);
    setError(null);
  };

  return (
    <div
      className={`flex flex-col bg-card rounded-xl border border-border overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <AgentSelector
          agents={agents}
          activeAgent={activeAgent}
          onSelect={handleAgentChange}
        />
        {projectPath && (
          <div className="mt-2 flex items-center justify-between">
            <div className="text-xs text-muted-foreground truncate">
              📁 {projectPath.split(/[/\\]/).pop() || projectPath}
            </div>
            <div className="flex items-center gap-2">
              {isIndexing ? (
                <span className="text-xs text-amber-500 flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" /> Indexing...
                </span>
              ) : (
                <button
                  onClick={reindexCurrentProject}
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                  title="Re-index project context"
                >
                  <RefreshCw size={10} />
                </button>
              )}
            </div>
          </div>
        )}
        {/* Context Stats */}
        {(contextStats.hasAgentRules ||
          contextStats.hasPrd ||
          contextStats.skillsCount > 0) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {contextStats.hasAgentRules && (
              <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 rounded">
                AGENTS.md
              </span>
            )}
            {contextStats.hasPrd && (
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded">
                PRD
              </span>
            )}
            {contextStats.skillsCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded">
                {contextStats.skillsCount} skills
              </span>
            )}
            {contextStats.bmadAgentsCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded">
                {contextStats.bmadAgentsCount} agents
              </span>
            )}
            {/* v1.0.2: RAG Memory Stats */}
            {contextStats.ragReady && (
              <span
                className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded flex items-center gap-1"
                title="RAG Memory: AI can recall project knowledge semantically"
              >
                🧠 {contextStats.ragDocuments || 0} memories
              </span>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={chatRef} className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center text-3xl">
              {currentAgent?.icon || <Sparkles size={24} />}
            </div>
            <h3 className="text-foreground font-medium mb-1">
              Chat with {currentAgent?.name}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {currentAgent?.description}
            </p>
            <SuggestedPrompts
              agent={activeAgent}
              onSelect={handleSuggestedPrompt}
            />
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <ChatMessage
                key={i}
                message={msg}
                agent={currentAgent}
                projectPath={effectiveProjectPath}
                onSaveArtifact={(path) => console.log("[BMAD] Saved:", path)}
                onCreateStory={(result) =>
                  console.log("[BMAD] Created story:", result)
                }
              />
            ))}
            {isLoading && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Loader2
                    size={16}
                    className="animate-spin text-purple-500 dark:text-purple-400"
                  />
                </div>
                <span className="text-sm">
                  {currentAgent?.name} is thinking...
                </span>
              </div>
            )}
          </>
        )}
        {error && (
          <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-3 text-destructive text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        {messages.length > 0 && (
          <div className="flex justify-end mb-2">
            <button
              onClick={handleClear}
              className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
            >
              <Trash2 size={12} />
              Clear chat
            </button>
          </div>
        )}

        {/* Attached Files Preview */}
        {attachedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-xs"
              >
                {/* Show thumbnail for images */}
                {file.isImage && file.dataUrl ? (
                  <img
                    src={file.dataUrl}
                    alt={file.name}
                    className="w-8 h-8 object-cover rounded"
                  />
                ) : (
                  getFileIcon(file.extension)
                )}
                <span
                  className="text-foreground max-w-[150px] truncate"
                  title={file.name}
                >
                  {file.name}
                </span>
                <span className="text-muted-foreground">
                  {formatFileSize(file.size)}
                </span>
                <button
                  onClick={() => removeAttachment(file.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                  title="Remove file"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.h,.css,.scss,.html,.vue,.svelte,.json,.yaml,.yml,.xml,.toml,.md,.txt,.csv,.log,.sql,.sh,.bash,.ps1,.env,.gitignore,.dockerfile,.png,.jpg,.jpeg,.gif,.svg,.webp,.ico,.bmp,.pdf,.fig,.sketch,.xd,image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Attach file button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 bg-muted/50 hover:bg-muted border border-input rounded-lg transition-colors flex items-center justify-center"
            title="Attach files (code, documents, etc.)"
          >
            <Paperclip size={18} className="text-muted-foreground" />
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${currentAgent?.name}...${attachedFiles.length > 0 ? ` (${attachedFiles.length} file${attachedFiles.length > 1 ? "s" : ""} attached)` : ""}`}
            className="flex-1 bg-muted/50 border border-input rounded-lg px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary resize-none"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={
              isLoading || (!input.trim() && attachedFiles.length === 0)
            }
            className="px-4 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground rounded-lg transition-colors"
          >
            <Send size={18} />
          </button>
        </div>

        {/* File attachment hint */}
        <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
          <Paperclip size={10} />
          Attach code, images, documents (no video)
        </div>
      </div>
    </div>
  );
}
