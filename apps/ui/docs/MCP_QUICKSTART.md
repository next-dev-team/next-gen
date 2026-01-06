# MCP Kanban Quick Start Guide

## 🚀 1-Minute Setup for AI Agents

### Step 1: Start the Server

Run this in your terminal to start the background server:

```bash
cd c:\Users\MT-Staff\Documents\GitHub\next-gen\ui
npm run mcp:sse
```

### Step 2: Configure Your IDE

**For Cursor:**  
`Settings` > `Features` > `MCP` > `+ Add New`

**For VS Code (Cline/Roo):**  
`Settings` > `MCP Servers` > Edit JSON

**Configuration Payload (Copy & Paste):**

```json
{
  "scrum-kanban": {
    "command": "node",
    "args": [
      "c:/Users/MT-Staff/Documents/GitHub/next-gen/ui/scripts/scrum-mcp-server.js"
    ]
  }
}
```

### Step 3: Talk to Your Agent

Now your agent (Claude, GPT-4, etc.) knows about your Kanban board. Just ask:

- "What is my next task?"
- "Create a bug ticket for the login page crash."
- "Move the 'API Setup' task to In Progress."

---

## 🐞 Manual Testing (Curl)

Verify the server is running without an agent:

**Check Status:**

```bash
curl http://localhost:3847/api/state
```

**Create a Board:**

```bash
curl -X POST http://localhost:3847/api/board/create \
  -H "Content-Type: application/json" \
  -d '{"name": "My Sprint", "type": "bmad"}'
```

See [MCP_AGENT_INTEGRATION.md](./MCP_AGENT_INTEGRATION.md) for the full guide.
