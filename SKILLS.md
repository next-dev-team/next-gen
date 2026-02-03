# Project Skills

This document lists all available skills for AI assistants working on this project.

## Available Skills

### 1. BMAD Integration

**Location:** `.agent/skills/bmad-integration/SKILL.md`

AI-driven agile development with GUI, IDE, and MCP integration.

**Features:**

- Workflow commands (`*create-prd`, `*create-story`, etc.)
- Context sync between GUI, IDE, and Scrum Board
- File-based artifacts (`_bmad-output/`)
- MCP server integration for scrum operations

**Quick Commands:**
| Command | Description |
|---------|-------------|
| `*create-prd` | Create PRD document |
| `*create-story` | Create user story |
| `*create-architecture` | Design architecture |
| `*create-epics` | Create epics |
| `*brainstorm` | Brainstorm ideas |
| `*help` | Show all commands |

---

## How to Use Skills

1. **Read the skill file** before starting related work
2. **Follow the instructions** in the SKILL.md
3. **Use workflow commands** where applicable
4. **Keep context synced** using the Sync feature

## File Locations

```
.agent/
└── skills/
    └── bmad-integration/
        └── SKILL.md          # BMAD workflow skill

_bmad-output/
├── prd.md                    # PRD artifact
├── architecture.md           # Architecture artifact
└── stories.md                # Stories artifact

docs/
└── BMAD-INTEGRATION.md       # Full documentation
```

## Adding New Skills

Create a new skill by adding a folder under `.agent/skills/`:

```
.agent/skills/your-skill/
└── SKILL.md                  # Required: Main skill file
```

SKILL.md format:

```yaml
---
name: Your Skill Name
description: Brief description of what this skill does
---
# Skill Instructions

[Detailed instructions here]
```
