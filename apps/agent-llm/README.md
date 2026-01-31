# LLM Chat API

Lightweight LLM Chat API server with MCP support. Chat with various LLM providers via HTTP API or MCP tools.

## Features

- **HTTP API**: RESTful endpoints for chat completions
- **MCP Server**: Use as MCP tools with Codex, Cursor, Claude Desktop, etc.
- **Multiple Providers**: Codex (default), Ollama, OpenAI-compatible APIs, gpt4free, local CLI commands
- **CORS enabled**: Can be called from browser apps
- **Minimal dependencies**: Only needs @modelcontextprotocol/sdk

## Installation

```bash
npm install
npm run build
```

## Usage

### HTTP API Server

Start the API server:

```bash
# Production
npm start

# Development (with hot reload)
npm run dev
```

Server runs on `http://127.0.0.1:3333` by default.

### MCP Server

Start the MCP server (for use with Codex, Cursor, etc.):

```bash
# Production
npm run start:mcp

# Development
npm run dev:mcp
```

## API Endpoints

### `GET /`

Returns API info and available endpoints.

### `GET /api/health`

Health check endpoint.

### `POST /api/chat`

Main chat endpoint. Send messages to any LLM provider.

**Request body:**

```json
{
  "provider": "codex | ollama | openai_compatible | gpt4free | command",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello!" }
  ],
  "model": "llama3.2",
  "base_url": "http://localhost:11434",
  "api_key": "optional-api-key",
  "temperature": 0.7,
  "max_tokens": 1000
}
```

**Response:**

```json
{
  "ok": true,
  "text": "Hello! How can I help you today?",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 8,
    "total_tokens": 18
  }
}
```

### `POST /v1/chat/completions`

OpenAI-compatible endpoint (same format as `/api/chat`).

### `GET /api/models`

List available models from a provider.

**Query params:**

- `provider`: `ollama` or `openai_compatible`
- `base_url`: Provider URL
- `api_key`: (optional) API key for authentication

### `POST /api/gpt4free/connect`

Start the gpt4free server (auto-downloads if needed).

## Providers

### Codex (default, no config needed)

Uses the Codex CLI tool. Make sure `codex` is installed and in your PATH.

```json
{
  "provider": "codex",
  "messages": [{ "role": "user", "content": "Hello!" }]
}
```

### Ollama

```json
{
  "provider": "ollama",
  "base_url": "http://localhost:11434",
  "model": "llama3.2",
  "messages": [{ "role": "user", "content": "Hi" }]
}
```

### OpenAI-compatible (OpenAI, Azure, local proxies, etc.)

```json
{
  "provider": "openai_compatible",
  "base_url": "https://api.openai.com",
  "model": "gpt-4o",
  "api_key": "sk-...",
  "messages": [{ "role": "user", "content": "Hi" }]
}
```

### gpt4free (free models)

```json
{
  "provider": "gpt4free",
  "model": "gpt-4o",
  "messages": [{ "role": "user", "content": "Hi" }]
}
```

First call `/api/gpt4free/connect` to start the server.

### Command (local CLI tools)

Requires `ENABLE_COMMAND_LLM=1` environment variable.

```json
{
  "provider": "command",
  "command": "some-llm-cli",
  "messages": [{ "role": "user", "content": "Hi" }]
}
```

## MCP Configuration

Add to your Codex/Cursor MCP config:

```json
{
  "mcpServers": {
    "llm-chat": {
      "command": "node",
      "args": ["dist/api/mcp-server.js"],
      "cwd": "/path/to/llm-chat-api"
    }
  }
}
```

Or for development:

```json
{
  "mcpServers": {
    "llm-chat": {
      "command": "npx",
      "args": ["tsx", "src/api/mcp-server.ts"],
      "cwd": "/path/to/llm-chat-api"
    }
  }
}
```

### MCP Tools

- **chat**: Full chat with message history
- **quick_chat**: Simple prompt → response
- **list_ollama_models**: List available Ollama models

## Environment Variables

| Variable             | Default                 | Description                     |
| -------------------- | ----------------------- | ------------------------------- |
| `HOST`               | `127.0.0.1`             | Server host                     |
| `PORT`               | `3333`                  | Server port                     |
| `HTTPS`              | `0`                     | Enable HTTPS (`1` to enable)    |
| `SSL_KEY`            | -                       | Path to SSL key file            |
| `SSL_CERT`           | -                       | Path to SSL cert file           |
| `ENABLE_COMMAND_LLM` | `0`                     | Enable generic command provider |
| `G4F_API_URL`        | `http://127.0.0.1:1337` | gpt4free API URL                |
| `G4F_PATH`           | -                       | Custom gpt4free binary path     |

## Examples

### cURL

```bash
# Chat with Codex (default)
curl -X POST http://localhost:3333/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "codex",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# Chat with Ollama
curl -X POST http://localhost:3333/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "ollama",
    "base_url": "http://localhost:11434",
    "model": "llama3.2",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# List Ollama models
curl "http://localhost:3333/api/models?provider=ollama&base_url=http://localhost:11434"
```

### JavaScript/TypeScript

```typescript
// Using Codex (simplest)
const response = await fetch('http://localhost:3333/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'codex',
    messages: [{ role: 'user', content: 'What is the capital of France?' }],
  }),
});

// Using Ollama
const response = await fetch('http://localhost:3333/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'ollama',
    base_url: 'http://localhost:11434',
    model: 'llama3.2',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'What is the capital of France?' },
    ],
  }),
});

const data = await response.json();
console.log(data.text);
```

## Development

```bash
# Watch mode
npm run dev:watch

# Build
npm run build
```

## License

MIT
