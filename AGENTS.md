# Project Agent Rules

## Project Overview

- **Name**: Next-Gen Development Tools
- **Description**: A comprehensive desktop application for developers featuring browser automation, LLM integration, and BMAD-method Scrum workflow management.
- **Tech Stack**: Electron, React, Vite, Zustand, Node.js, TypeScript

## Key Features

1. **Browser Automation** - Camoufox-based anti-detection browser
2. **LLM Integration** - Multiple providers (GPT4Free, OpenAI, Local LLM)
3. **Scrum Board** - Full Kanban with BMAD agent integration
4. **MCP Server** - Tool execution via MCP protocol

## Coding Standards

- Use React functional components with hooks
- State management via Zustand stores
- Follow ESLint and Prettier rules
- Write JSDoc comments for complex functions
- Use meaningful variable names

## File Structure

```text
apps/
  ui/               - Main Electron app
  mmo/              - MMO automation tools
packages/
  llm/              - LLM service package
  agent-llm/        - Agent LLM integration
  scripts/          - Shared scripts
_bmad/              - BMAD Method files
  bmm/agents/       - Agent personas
  bmm/config.yaml   - Project config
_bmad-output/       - Generated artifacts
```

## Communication Style

- Be concise and provide actionable guidance
- Include code examples when helpful
- Explain trade-offs for architectural decisions
- Reference project files when relevant
