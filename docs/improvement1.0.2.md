Here is the comprehensive **Master Prompt** you can use to instruct your AI agent (in Cursor, Windsurf, or your own "vibe coding" interface) to build **v1.0.2**.

This prompt is designed to give the AI full context of your existing Electron+React architecture and strict instructions on implementing the **RAG (Retrieval-Augmented Generation)** system so your app can "remember" everything.

### 📋 Master Prompt for v1.0.2 (RAG & Memory Upgrade)

Copy and paste the text below into your AI coding assistant:

---

**Role:** You are a Senior Full-Stack Architect specializing in Local-First AI Desktop Apps (Electron + React) and RAG (Retrieval-Augmented Generation) systems.

**Current State:**
We have a working Electron application "Next-Gen Development Tools" with:

1.  **React Frontend:** Uses Zustand for state management (`kanbanStore.js`, `bmadStore.js`).
2.  **BMAD Integration:** Agents (PM, Architect, Scrum Master) are set up and communicating via `AgentChat.jsx`.
3.  **MCP Server:** A local server handles Scrum board operations (`scrum-mcp-server.js`).
4.  **File System:** We store artifacts (PRDs, Stories) in `_bmad-output/`.

**The Goal (v1.0.2):**
We need to upgrade the app to have **Long-Term Memory** and **Project Intelligence**. The goal is a "Smart Product Management" experience where the user (who does not code) can ask questions like "Why is the login feature blocked?" or "What did we decide about the database?" and the AI knows the answer by "remembering" all tickets, chats, and documents.

**Tech Stack for Upgrade:**

- **Orchestration:** LangChain.js
- **Vector Store:** `MemoryVectorStore` (for MVP) or `SQLite-VSS` (since this is Electron/Local).
- **Embeddings:** `transformers.js` (local) or OpenAI Embeddings.

**Implementation Plan:**

**Phase 1: The RAG Core (`ragService.js`)**
Create a service to handle vector storage.

- Install necessary dependencies (`@langchain/core`, `@langchain/community`, etc.).
- Implement `addDocument(text, metadata)`: Takes text (like a ticket description) and stores it as a vector.
- Implement `query(text)`: Finds relevant documents based on semantic similarity.

**Phase 2: The "Brain" (`projectContextStore.js`)**
Create a new Zustand store that acts as the bridge between the GUI and the RAG service.

- **Watcher:** It must watch `kanbanStore.js`. When a ticket is moved or updated, it auto-indexes that ticket into the vector store.
- **File Reader:** It must watch `_bmad-output/` folder. When `prd.md` changes, it re-indexes the PRD.
- **Chat History:** It must index significant user decisions from the chat.

**Phase 3: Connecting the Agents (`AgentChat.jsx`)**
Modify the existing chat component.

- **Before** sending a prompt to the LLM, use `ragService.query(userMessage)`.
- **Inject** the retrieved context (e.g., "Relevant Tickets: Ticket #42 is blocked") into the System Prompt invisible to the user.
- The User simply types "Status?" and the AI answers with full context.

**Phase 4: "Vibe Coding" Interface**

- Ensure the "Sync All" button triggers a full re-index of the vector store so the AI is up to date immediately.
- Do not change the UI visually; keep it clean. All complexity happens in the background.

**Immediate Task:**
Start by scaffolding the `ragService.js` and creating the `projectContextStore.js` skeleton. Please ask me to confirm the specific vector database choice (Local SQLite vs In-Memory) before writing the implementation code.

---

### How to use this prompt

1.  **Paste** the block above into your AI Code Editor (Cursor/Windsurf).
2.  **Wait** for it to analyze your file structure.
3.  **Confirm** the database choice when it asks (I recommend **SQLite** or a local file-based vector store so the memory persists even if you close the Electron app).

### Why this works

- **References Source**: It explicitly targets the "Future v1.0.2" plans for RAG architecture.
- **Connects the dots**: It links your existing `kanbanStore` (Source) to the new "Brain" so the AI knows about ticket movements automatically.
- **User Focus**: It emphasizes that the _user_ shouldn't see code, aligning with your requirement for a "No-Code / GUI" experience.
