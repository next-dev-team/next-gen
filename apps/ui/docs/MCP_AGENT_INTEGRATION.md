# BMAD-Method Kanban MCP Server Documentation

## Overview

This MCP (Model Context Protocol) server bridges your Kanban board with AI agents in IDEs like **Cursor**, **VS Code**, and **Windsurf**. It allows your AI assistant to act as a full Scrum team member—reading tasks, updating status, and preventing conflicts while you code.

---

## 🔌 Connecting to Your IDE

### Option 1: Cursor (Native MCP Support)

Cursor has built-in support for MCP servers.

1.  Open **Cursor Settings** (Ctrl/Cmd + ,).
2.  Navigate to **Features** > **MCP Servers**.
3.  Click **+ Add New MCP Server**.
4.  Fill in the details:
    - **Name**: `scrum-board`
    - **Type**: `command` (stdio)
    - **Command**: `node`
    - **Arguments**: `C:/Users/MT-Staff/Documents/GitHub/next-gen/ui/scripts/scrum-mcp-server.js` (Use the absolute path to your script)
5.  Click **Add**. The green light should turn on, indicating the server is connected.

### Option 2: VS Code (via Cline / Roo Code)

VS Code requires an agent extension like **Cline** or **Roo Code** to talk to MCP servers.

1.  Open the **MCP Servers** configuration file for your extension:
    - **Cline**: Click the settings gear icon > **MCP Servers** -> Edit `mcp_config.json`.
2.  Add your server configuration:

```json
{
  "mcpServers": {
    "scrum-kanban": {
      "command": "node",
      "args": [
        "C:/Users/MT-Staff/Documents/GitHub/next-gen/ui/scripts/scrum-mcp-server.js"
      ],
      "disabled": false,
      "autoApprove": [
        "scrum_get_next_story",
        "scrum_get_state",
        "scrum_stories_by_status"
      ]
    }
  }
}
```

3.  Save the file. The extension should auto-reload the connection.

### Option 3: Windsurf IDE

1.  Open **Windsurf Settings** or configure via `.windsurf/mcp-config.json`.
2.  Add the server configuration similarly to VS Code.

---

## 💬 How to Use (Natural Language Prompts)

Once connected, you don't need to know the tool names. Just talk to your agent naturally.

### 1. Planning & Picking Up Work

> **"What's the next story ready for development?"**
>
> _Agent calls `scrum_get_next_story`_ · Returns the highest priority card from the "Ready for Dev" column.

> **"What is currently in progress?"**
>
> _Agent calls `scrum_get_stories_by_status("in-progress")`_ · Lists active tasks.

> **"I'll start working on the 'User Auth' story."**
>
> _Agent calls `scrum_move_card`_ · Moves card from "Ready for Dev" to "In Progress".

### 2. Implementation & Conflict Handling

> **"I need to update the acceptance criteria for the login story."**
>
> _Agent calls `scrum_acquire_lock`_ then `scrum_update_card`\* · Safely updates the card description, preventing others from overwriting.

> **"Create a new task for fixing the CSS bug in the header."**
>
> _Agent calls `scrum_add_card`_ · Creates a new card in the Backlog.

### 3. Review & Completion

> **"I've finished the authentication logic. Move it to review."**
>
> _Agent calls `scrum_move_card`_ · Moves status to "Review".

> **"Mark the login story as done. I implemented JWT and added tests."**
>
> _Agent calls `scrum_complete_story`_ · Moves to "Done" and adds the summary.

---

## 🛠️ Available Tools Reference

Your agent has access to these specific function calls:

| Tool Name              | Description           | Natural Language Trigger Examples                         |
| ---------------------- | --------------------- | --------------------------------------------------------- |
| `scrum_get_state`      | Get full board state  | "Show me the board", "What's the status of the project?"  |
| `scrum_get_next_story` | Get top priority item | "What should I work on next?", "Give me a task"           |
| `scrum_add_card`       | Create a new story    | "Add a ticket for...", "Create a bug report for..."       |
| `scrum_update_card`    | Edit story details    | "Update the description of...", "Change priority to high" |
| `scrum_move_card`      | Change status/list    | "Move this to done", "Start working on this"              |
| `scrum_complete_story` | Finish a story        | "I'm done with task X", "Close this ticket"               |
| `scrum_acquire_lock`   | Lock card for editing | "I'm editing this card", "Prevent conflicts"              |
| `scrum_release_lock`   | Release card lock     | "I'm done editing", "Unlock the card"                     |
| `scrum_create_epic`    | Create a new epic     | "Start a new epic for...", "Create a project theme"       |

---

## ⚡ Technical Quick Start (CLI)

If you want to manually interact via terminal (curl):

1.  **Start Server**: `npm run mcp:sse` (Port 3847)
2.  **Get State**: `curl http://localhost:3847/api/state`
3.  **Add Card**:
    ```bash
    curl -X POST http://localhost:3847/api/card/add \
         -H "Content-Type: application/json" \
         -d '{"boardId": "...", "listId": "...", "title": "New Task"}'
    ```

For full API documentation, see [Introduction section above](#overview).
