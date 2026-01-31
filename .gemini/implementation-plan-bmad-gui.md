# BMAD-Method GUI Integration - Implementation Plan

## 📋 Overview

Transform the current Next-Gen Tools into a powerful **BMAD-Method GUI** that integrates LLM capabilities with Scrum/Kanban boards for AI-assisted agile development. Users can manage projects through a visual interface without ever touching the terminal.

---

## 🎯 Goals

1. **Integrate `@nde/llm` package** — Move `agent-llm` to packages for shared use
2. **BMAD Setup Wizard** — Easy cross-OS setup with all v6 features
3. **AI-Powered Story Generation** — Generate stories from PRD with context awareness
4. **Agent Context History** — Maintain conversation history per story for continuity
5. **Unified Dashboard** — Single view for BMAD phases, agents, and Scrum board

---

## 🏗️ Architecture

```
packages/
└── llm/                        # Shared LLM package (moved from apps/agent-llm)
    ├── src/
    │   ├── providers/          # LLM providers (Ollama, OpenAI, GPT4Free, etc.)
    │   ├── agents/             # BMAD agent definitions
    │   ├── memory/             # Conversation history & context
    │   ├── prompts/            # System prompts for each BMAD agent
    │   └── index.ts            # Main exports
    └── package.json

apps/ui/
├── src/renderer/src/
│   ├── stores/
│   │   ├── kanbanStore.js      # Existing
│   │   ├── llmStore.js         # NEW: LLM state management
│   │   ├── bmadStore.js        # NEW: BMAD workflow state
│   │   └── projectContextStore.js  # NEW: PRD/context management
│   ├── views/
│   │   ├── ScrumBoardView.jsx  # Enhanced with AI features
│   │   └── BmadDashboardView.jsx  # NEW: Unified BMAD dashboard
│   └── components/
│       ├── bmad/               # NEW: BMAD-specific components
│       │   ├── SetupWizard.jsx
│       │   ├── AgentChat.jsx
│       │   ├── StoryGenerator.jsx
│       │   ├── ContextManager.jsx
│       │   └── PhaseProgress.jsx
│       └── llm/                # NEW: LLM UI components
│           ├── ChatPanel.jsx
│           ├── ProviderSelector.jsx
│           └── ModelSelector.jsx
```

---

## 📦 Phase 1: Package Restructure

### 1.1 Move `agent-llm` to `packages/llm`

```bash
# Package name: @nde/llm
packages/llm/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts               # Unified exports
│   ├── providers/
│   │   ├── index.ts
│   │   ├── ollama.ts
│   │   ├── openai-compatible.ts
│   │   ├── gpt4free.ts
│   │   └── codex.ts
│   ├── agents/                # BMAD Agent Prompts
│   │   ├── index.ts
│   │   ├── analyst.ts
│   │   ├── pm.ts
│   │   ├── architect.ts
│   │   ├── sm.ts
│   │   ├── dev.ts
│   │   └── bmad-master.ts
│   ├── memory/                # Context & History
│   │   ├── index.ts
│   │   ├── conversation.ts    # Per-story conversation history
│   │   ├── project-context.ts # PRD, Architecture, etc.
│   │   └── storage.ts         # Persistence layer
│   ├── types.ts
│   └── utils.ts
```

### 1.2 New package.json

```json
{
  "name": "@nde/llm",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./providers": "./dist/providers/index.js",
    "./agents": "./dist/agents/index.js",
    "./memory": "./dist/memory/index.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsc -w"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.1.0",
    "gpt-tokenizer": "^3.4.0"
  },
  "devDependencies": {
    "@types/node": "^25.0.6",
    "typescript": "^5.7.3"
  }
}
```

---

## 📦 Phase 2: BMAD Setup Wizard

### 2.1 Features

- **Cross-OS Support**: Windows, macOS, Linux
- **Auto-detection**: Check if BMAD is already installed
- **One-click Install**: npx-based installation with progress UI
- **Module Selection**: Choose which BMAD modules to install
- **IDE Integration**: Auto-configure for Cursor, VS Code, Claude Code, etc.

### 2.2 Component: `SetupWizard.jsx`

```jsx
// Steps:
// 1. Project Selection — Pick or create project folder
// 2. BMAD Installation — Install core + selected modules
// 3. IDE Configuration — Generate agent rules for selected IDEs
// 4. Initial Context — Create PRD or import existing
// 5. Board Setup — Create Scrum board from epics/stories
```

### 2.3 IPC Handlers (Electron Main Process)

```typescript
// handlers to add:
- bmad:check-install      // Check if BMAD installed
- bmad:install            // Run npx bmad-method install
- bmad:status             // Get installation status
- bmad:list-modules       // List available modules
- bmad:run-workflow       // Execute a BMAD workflow
- bmad:read-output        // Read _bmad-output files
- bmad:write-output       // Write to _bmad-output
```

---

## 📦 Phase 3: AI-Powered Story Generation

### 3.1 Story Generator Flow

```
1. User clicks "Generate Stories" in Scrum Board
2. System loads project context (PRD, Architecture, existing epics)
3. LLM (via @nde/llm) generates stories using BMAD PM/SM agent prompts
4. User reviews and edits generated stories
5. Stories are created in Kanban board with full context
```

### 3.2 Context Loading

```typescript
interface ProjectContext {
  prd: string; // _bmad-output/prd.md
  architecture?: string; // _bmad-output/architecture.md
  existingEpics: Epic[]; // From Kanban store
  existingStories: Story[]; // From Kanban store
  customContext?: string; // User-provided additional context
}
```

### 3.3 Story Generation Prompts

Each BMAD agent has specialized prompts:

```typescript
const SM_STORY_PROMPT = `
You are the Scrum Master agent from BMAD-Method.
Given the following project context:

## PRD Summary
{{prd_summary}}

## Architecture
{{architecture}}

## Existing Epics
{{epics}}

Generate user stories following this format:
- Title: Clear, action-oriented title
- Description: As a [user], I want [feature] so that [benefit]
- Acceptance Criteria: Testable bullet points
- Story Points: Fibonacci estimate
- Priority: Critical/High/Medium/Low
- Epic: Which epic this belongs to

Focus on MVP features first. Each story should be completable in 1-3 days.
`;
```

---

## 📦 Phase 4: Agent Context History

### 4.1 Per-Story Conversation History

Each story maintains its own conversation history with the AI agent:

```typescript
interface StoryAgentContext {
  storyId: string;
  conversations: Conversation[];
  lastAgent: string; // Which agent was last used
  contextSnapshot: {
    // Context at time of generation
    prdVersion: string;
    architectureVersion: string;
  };
}

interface Conversation {
  id: string;
  agent: string; // 'pm', 'dev', 'sm', etc.
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}
```

### 4.2 Storage Strategy

```typescript
// Use electron-store for persistence
// Key structure: story-context-{storyId}
// Stored in: %APPDATA%/next-gen-tools/story-contexts/

class StoryContextStore {
  async saveContext(storyId: string, context: StoryAgentContext): Promise<void>;
  async loadContext(storyId: string): Promise<StoryAgentContext | null>;
  async getConversationHistory(
    storyId: string,
    agent: string,
  ): Promise<Conversation[]>;
  async appendMessage(
    storyId: string,
    agent: string,
    message: ChatMessage,
  ): Promise<void>;
}
```

### 4.3 UI: Continue Conversation

When opening a story card:

1. Load previous conversation history
2. Show "Continue with [Agent]" button
3. AI has full context of previous discussions
4. User can switch agents while maintaining history

---

## 📦 Phase 5: Unified BMAD Dashboard

### 5.1 Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│  🎯 BMAD Dashboard                        [Project: MyApp]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐│
│  │ Phase 1     │ │ Phase 2     │ │ Phase 3     │ │Phase 4 ││
│  │ 🔍 Analysis │→│ 📋 Planning │→│ 🏗️ Solution │→│💻 Impl ││
│  │ ✅ Complete │ │ ⏳ Active   │ │ ○ Pending   │ │○ Pending││
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🤖 Active Agent: Product Manager (PM)                   ││
│  │ ┌─────────────────────────────────────────────────────┐ ││
│  │ │ Chat with PM...                                     │ ││
│  │ │ ─────────────────────────────────────────────────── │ ││
│  │ │ [Generate PRD] [Create Stories] [Review]            │ ││
│  │ └─────────────────────────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 📊 Sprint Board                                         ││
│  │ [Backlog: 12] [Ready: 3] [In Progress: 2] [Done: 8]     ││
│  │ ┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐      ││
│  │ │Story 1 ││Story 2 ││Story 3 ││Story 4 ││Story 5 │      ││
│  │ └────────┘└────────┘└────────┘└────────┘└────────┘      ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Key Features

1. **Phase Progress Tracker** — Visual indicator of BMAD workflow progress
2. **Agent Selector** — Switch between BMAD agents
3. **Integrated Chat** — Chat with any agent, context-aware
4. **Quick Actions** — Generate PRD, Create Stories, Review Architecture
5. **Sprint Board Preview** — Inline Kanban with filters
6. **Context Panel** — View/edit PRD, Architecture, etc.

---

## 📦 Phase 6: Enhanced Scrum MCP Server

### 6.1 New MCP Tools

```typescript
// Story Generation Tools
-bmad_generate_stories - // Generate stories from PRD
  bmad_refine_story - // Refine a story with AI
  bmad_estimate_story - // AI-powered story point estimation
  // Context Management Tools
  bmad_get_project_context - // Get full project context
  bmad_update_context - // Update context files
  bmad_sync_context - // Sync context with Kanban state
  // Agent Conversation Tools
  bmad_chat - // Chat with specific agent
  bmad_get_history - // Get conversation history
  bmad_clear_history; // Clear conversation history for story
```

### 6.2 Enhanced Story Schema

```typescript
interface EnhancedStory {
  // Existing fields...
  id: string;
  title: string;
  description: string;

  // New BMAD fields
  generatedBy?: string; // Which agent generated this
  agentContext?: {
    lastAgent: string;
    hasHistory: boolean;
    historyCount: number;
  };
  contextSnapshot?: {
    prdHash: string;
    architectureHash: string;
    generatedAt: string;
  };
  aiSuggestions?: {
    acceptanceCriteria?: string[];
    technicalNotes?: string[];
    risks?: string[];
  };
}
```

---

## 🚀 Implementation Order

### Sprint 1: Foundation (Week 1) ✅ COMPLETED

- [x] Move `agent-llm` to `packages/llm`
- [x] Update package.json and exports
- [x] Add `@nde/llm` dependency to UI app
- [x] Create `llmStore.js` with full provider/agent support
- [x] Create `bmadStore.js` with workflow state
- [x] Build and test `@nde/llm` package

### Sprint 2: BMAD Setup (Week 2) ✅ COMPLETED

- [x] Create `SetupWizard.jsx` component
- [x] Implement BMAD installation IPC handlers
- [x] Add project folder selection
- [x] Implement module selection UI
- [x] Add IDE configuration step

### Sprint 3: Story Generation (Week 3) ✅ COMPLETED

- [x] Add agent prompt templates (in @nde/llm/agents)
- [x] Create story generation flow (in llmStore.generateStories)
- [x] Create `StoryGenerator.jsx` component
- [x] Implement context loading from files
- [x] Integrate with Kanban board

### Sprint 4: Context History (Week 4) ✅ COMPLETED

- [x] Implement `StoryContextStore` (in @nde/llm/memory/storage)
- [x] Create `AgentChat.jsx` component
- [x] Add conversation persistence (in llmStore)
- [x] Implement "Continue Conversation" feature
- [x] Add context panel to story detail (ContextManager.jsx)

### Sprint 5: Dashboard & Polish (Week 5) ✅ COMPLETED

- [x] Create `BmadDashboardView.jsx`
- [x] Implement phase progress tracker (PhaseProgress.jsx)
- [x] Add quick action buttons
- [x] Polish UI/UX with premium design
- [x] Documentation and testing

---

## 🔧 Technical Notes

### LLM Provider Priority

1. **Ollama** — Local, free, best for development
2. **GPT4Free** — Free cloud fallback
3. **OpenAI Compatible** — For power users with API keys

### Context Token Management

- PRD summary: ~2000 tokens max
- Architecture: ~1500 tokens max
- Existing stories: ~500 tokens (summarized)
- Conversation history: Rolling window of last 10 messages

### Performance Considerations

- Lazy load agent prompts
- Cache context summaries
- Debounce story generation requests
- Background sync for conversation history

---

## 📝 Files to Create/Modify

### New Files

```
packages/llm/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── types.ts
    ├── providers/index.ts
    ├── agents/index.ts
    └── memory/index.ts

apps/ui/src/renderer/src/
├── stores/
│   ├── llmStore.js
│   ├── bmadStore.js
│   └── projectContextStore.js
├── views/
│   └── BmadDashboardView.jsx
└── components/
    └── bmad/
        ├── SetupWizard.jsx
        ├── AgentChat.jsx
        ├── StoryGenerator.jsx
        ├── ContextManager.jsx
        └── PhaseProgress.jsx
```

### Modified Files

```
apps/ui/package.json           # Add @nde/llm dependency
apps/ui/src/main/              # Add BMAD IPC handlers
apps/ui/src/preload/           # Expose BMAD APIs
apps/ui/src/renderer/src/views/ScrumBoardView.jsx  # Add AI features
apps/ui/scripts/scrum-mcp-server.js  # Add new MCP tools
```

---

## ✅ Success Criteria

1. **Zero Terminal** — User never needs to open terminal for BMAD setup
2. **Context Aware** — AI always has relevant project context
3. **History Preserved** — Can continue any conversation seamlessly
4. **Cross-Platform** — Works on Windows, macOS, Linux
5. **Offline Capable** — Works with local Ollama models
6. **Fast** — Story generation under 10 seconds
