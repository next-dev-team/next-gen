# BMAD Integration System

## Overview

The BMAD (Breakthrough Method for Agile AI-Driven) Integration System provides a unified workflow between GUI, IDE, and MCP for agile development with AI agents.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      BMAD Context Sync                           │
├────────────────┬─────────────────┬─────────────────┬─────────────┤
│   SYNC Mode    │    GUI Mode     │    IDE Mode     │   MCP Mode  │
│ (Master Sync)  │   (Chat+LLM)    │  (File Export)  │  (Scrum)    │
├────────────────┼─────────────────┼─────────────────┼─────────────┤
│ • Load from    │ • Chat with     │ • .cursorrules  │ • Stories   │
│   files        │   full context  │ • .windsurfrules│ • Epics     │
│ • Sync MCP     │ • Context from  │ • AGENTS.md     │ • Cards     │
│   stories      │   PRD, Arch,    │ • Artifacts     │ • Board     │
│ • Update IDE   │   Stories       │ • Export sync   │ • SSE live  │
│ • Refresh all  │ • Save to files │                 │             │
└────────────────┴─────────────────┴─────────────────┴─────────────┘
                               ↕
                    ┌──────────────────┐
                    │ _bmad-output/    │
                    │ • prd.md         │
                    │ • architecture.md│
                    │ • stories.md     │
                    └──────────────────┘
```

## Integration Modes

### 1. SYNC Mode (Master Synchronization)

Performs full synchronization across all systems:

- **Load Context**: Reads PRD, Architecture, Stories from `_bmad-output/`
- **MCP Sync**: Fetches stories from scrum board, writes to `stories.md`
- **IDE Export**: Generates `.cursorrules`, `.windsurfrules`, `AGENTS.md`
- **Context Refresh**: Updates all stores with latest data

**Usage**: Click "Sync All" to synchronize everything

### 2. GUI Mode (Chat with Agents)

Direct chat with BMAD agents with full project context:

- **Context Loaded**: PRD, Architecture, Stories automatically included
- **Workflow Commands**: Use `*create-prd`, `*create-story`, etc.
- **File Save**: "Save PRD" / "Save Arch" buttons on AI responses
- **MCP Create**: "Create Story" button sends to scrum board

### 3. IDE Mode (External Editor Integration)

Export context for external IDEs:

- **Cursor**: Reads `.cursorrules` automatically
- **Windsurf**: Reads `.windsurfrules` automatically
- **Universal**: `AGENTS.md` works with any AI assistant
- **Artifacts**: All docs in `_bmad-output/` accessible

### 4. MCP Mode (Scrum Board Operations)

Connect to the scrum MCP server:

- **Endpoint**: `http://127.0.0.1:3847/mcp`
- **SSE**: `http://127.0.0.1:3847/sse` for real-time updates
- **Tools**: create-story, update-card, move-card, list-stories, add-epic

## Workflow Commands

Use these commands in the Agent Chat or any connected IDE:

| Command                | Agent     | Description                  |
| ---------------------- | --------- | ---------------------------- |
| `*create-prd`          | PM        | Guided PRD creation workflow |
| `*create-story`        | SM        | Create a user story          |
| `*create-architecture` | Architect | Design system architecture   |
| `*create-epics`        | PM        | Create epic items            |
| `*brainstorm`          | Analyst   | Brainstorm ideas             |
| `*save-prd`            | PM        | Save PRD to file             |
| `*help`                | -         | Show all available commands  |

## File Structure

```
project/
├── _bmad/
│   └── bmm/
│       ├── agents/
│       │   ├── pm.agent.yaml
│       │   ├── architect.agent.yaml
│       │   ├── sm.agent.yaml
│       │   └── dev.agent.yaml
│       └── module.yaml
├── _bmad-output/
│   ├── prd.md              # Product Requirements Document
│   ├── architecture.md     # System Architecture
│   └── stories.md          # User Stories (synced from board)
├── .cursorrules            # Cursor IDE rules (auto-generated)
├── .windsurfrules          # Windsurf IDE rules (auto-generated)
└── AGENTS.md               # Universal agent config (auto-generated)
```

## Context Flow

### 1. Files → Chat Context

```
_bmad-output/prd.md        → Included in system prompt
_bmad-output/architecture.md → Included in system prompt
_bmad-output/stories.md    → Included in system prompt
```

### 2. MCP → Files

```
Scrum Board Stories → _bmad-output/stories.md
```

### 3. Chat → Files

```
AI generates PRD    → [Save PRD] → _bmad-output/prd.md
AI generates Arch   → [Save Arch] → _bmad-output/architecture.md
AI generates Story  → [Create Story] → MCP Board
```

### 4. Files → IDE

```
_bmad-output/* + agents → .cursorrules
_bmad-output/* + agents → .windsurfrules
_bmad-output/* + agents → AGENTS.md
```

## API Endpoints

### LLM Server

- **URL**: `http://127.0.0.1:3333/api/chat`
- **Method**: POST
- **Body**: `{ messages: [...], provider: "codex" }`

### MCP Server

- **Base URL**: `http://127.0.0.1:3847`
- **MCP Endpoint**: `http://127.0.0.1:3847/mcp`
- **SSE Endpoint**: `http://127.0.0.1:3847/sse`
- **Health Check**: `http://127.0.0.1:3847/health`

### MCP Tools

```json
// Create Story
{
  "method": "tools/call",
  "params": {
    "name": "create-story",
    "arguments": {
      "title": "Story Title",
      "description": "As a user...",
      "priority": "medium",
      "status": "backlog"
    }
  }
}

// List Stories
{
  "method": "tools/call",
  "params": {
    "name": "list-stories",
    "arguments": {}
  }
}

// Update Card
{
  "method": "tools/call",
  "params": {
    "name": "update-card",
    "arguments": {
      "cardId": "card-123",
      "updates": { "status": "in-progress" }
    }
  }
}
```

## IDE Configuration

### Cursor

Create `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "scrum": {
      "url": "http://127.0.0.1:3847/mcp"
    }
  }
}
```

### Windsurf

Create `.windsurf/mcp.json`:

```json
{
  "mcpServers": {
    "scrum": {
      "url": "http://127.0.0.1:3847/mcp"
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "scrum": {
      "url": "http://127.0.0.1:3847/mcp"
    }
  }
}
```

## Chat Context Memory

The Agent Chat maintains conversation history:

- **Per-Project**: Each project has its own chat history
- **Per-Agent**: Each agent (PM, Architect, SM, Dev) has separate history
- **Persistent**: Conversations saved to localStorage
- **Context-Aware**: Project context (PRD, Arch, Stories) auto-included

## Best Practices

### 1. Start with Sync

Always click "Sync All" when opening a project to ensure all context is loaded.

### 2. Use Workflow Commands

Start with `*create-prd` → `*create-architecture` → `*create-epics` → `*create-story`

### 3. Save Artifacts

Use the Save buttons on AI responses to persist documents to files.

### 4. Keep Context Updated

After major changes, run Sync to update IDE rules and story files.

### 5. Use Right Agent

- **PM**: PRD, requirements, epics
- **Architect**: System design, tech stack
- **SM**: Stories, sprints, estimates
- **Analyst**: Research, brainstorming
- **Dev**: Implementation, debugging

## Troubleshooting

### MCP Not Connected

1. Check if MCP server is running on port 3847
2. Try clicking "Check" in MCP mode
3. Restart the application

### Context Not Loading

1. Ensure files exist in `_bmad-output/`
2. Click "Sync All" in Sync mode
3. Check project path is correct

### IDE Not Reading Rules

1. Ensure `.cursorrules` exists in project root
2. Restart the IDE
3. Run Sync to regenerate rules

### Stories Not Syncing

1. Check MCP connection status
2. Ensure stories exist on the scrum board
3. Click "Sync All" to fetch latest

## Components

| Component       | File                  | Purpose              |
| --------------- | --------------------- | -------------------- |
| BmadIntegration | `BmadIntegration.jsx` | Mode switcher & sync |
| AgentChat       | `AgentChat.jsx`       | Chat with agents     |
| StoryGenerator  | `StoryGenerator.jsx`  | AI story generation  |
| ContextManager  | `ContextManager.jsx`  | Context display      |
| SetupWizard     | `SetupWizard.jsx`     | Initial BMAD setup   |

## Stores

| Store               | File                     | Purpose                         |
| ------------------- | ------------------------ | ------------------------------- |
| bmadStore           | `bmadStore.js`           | BMAD state, sessions, artifacts |
| projectContextStore | `projectContextStore.js` | Project indexing, context       |
| kanbanStore         | `kanbanStore.js`         | Scrum board state               |
