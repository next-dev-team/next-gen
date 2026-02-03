---
name: BMAD Integration
description: Use BMAD Method for AI-driven agile development with GUI, IDE, and MCP integration
---

# BMAD Integration Skill

This skill enables AI-driven agile development using the BMAD (Breakthrough Method for Agile AI-Driven) system with full synchronization between GUI, IDE, and Scrum MCP.

## Quick Start

1. **Sync Context**: Click "Sync All" in the BMAD Integration panel
2. **Create PRD**: Type `*create-prd` in Agent Chat
3. **Create Architecture**: Type `*create-architecture`
4. **Create Stories**: Type `*create-story`
5. **Save Artifacts**: Click "Save" buttons on AI responses

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      BMAD Context Sync                           │
├────────────────┬─────────────────┬─────────────────┬─────────────┤
│   SYNC Mode    │    GUI Mode     │    IDE Mode     │   MCP Mode  │
├────────────────┼─────────────────┼─────────────────┼─────────────┤
│ • Load files   │ • Agent Chat    │ • .cursorrules  │ • Stories   │
│ • Sync stories │ • Context aware │ • .windsurfrules│ • Epics     │
│ • Update IDE   │ • Save to files │ • AGENTS.md     │ • Board API │
└────────────────┴─────────────────┴─────────────────┴─────────────┘
```

## Workflow Commands

| Command                | Agent     | Description         |
| ---------------------- | --------- | ------------------- |
| `*create-prd`          | PM        | Guided PRD creation |
| `*create-story`        | SM        | Create user story   |
| `*create-architecture` | Architect | Design architecture |
| `*create-epics`        | PM        | Create epics        |
| `*brainstorm`          | Analyst   | Brainstorm ideas    |
| `*save-prd`            | PM        | Save PRD to file    |
| `*help`                | -         | Show commands       |

## File Structure

```
project/
├── _bmad/
│   └── bmm/
│       └── agents/           # Agent YAML definitions
├── _bmad-output/
│   ├── prd.md                # PRD document
│   ├── architecture.md       # Architecture doc
│   └── stories.md            # Stories (synced)
├── .cursorrules              # Cursor IDE config
├── .windsurfrules            # Windsurf IDE config
└── AGENTS.md                 # Universal agent rules
```

## Integration Modes

### Sync Mode

Master synchronization - loads context, syncs MCP stories, generates IDE rules.

### GUI Mode

Chat with agents using workflow commands. Context from PRD/Arch/Stories auto-included.

### IDE Mode

Export files for external editors (Cursor, Windsurf). Same workflow commands work.

### MCP Mode

Scrum board connection at `http://127.0.0.1:3847/mcp`.

## MCP Server

- **Base**: `http://127.0.0.1:3847`
- **MCP**: `http://127.0.0.1:3847/mcp`
- **SSE**: `http://127.0.0.1:3847/sse`

### MCP Tools

- `create-story` - Create a story on the board
- `update-card` - Update card properties
- `move-card` - Move card between lists
- `list-stories` - Get all stories
- `add-epic` - Add an epic
- `get-board` - Get board state

## IDE Setup

### Cursor/Windsurf MCP Config

```json
{
  "mcpServers": {
    "scrum": {
      "url": "http://127.0.0.1:3847/mcp"
    }
  }
}
```

## Context Flow

1. **Files → Chat**: PRD, Arch, Stories loaded into prompts
2. **MCP → Files**: Stories synced to `stories.md`
3. **Chat → Files**: Save buttons write to `_bmad-output/`
4. **Files → IDE**: Rules generated for external editors

## Agents

| Agent     | Role             | Use For                  |
| --------- | ---------------- | ------------------------ |
| PM        | Product Manager  | PRD, requirements, epics |
| Architect | System Architect | Design, tech stack       |
| SM        | Scrum Master     | Stories, sprints         |
| Analyst   | Business Analyst | Research, brainstorm     |
| Dev       | Developer        | Implementation           |

## Best Practices

1. Always start with "Sync All"
2. Follow workflow: PRD → Architecture → Epics → Stories
3. Save artifacts using the buttons
4. Keep context updated with periodic syncs
5. Use the right agent for each task

## Troubleshooting

| Issue                 | Solution                  |
| --------------------- | ------------------------- |
| MCP disconnected      | Check server on port 3847 |
| Context not loading   | Run "Sync All"            |
| IDE not reading rules | Restart IDE, run Sync     |
| Stories not syncing   | Check MCP, run Sync       |
