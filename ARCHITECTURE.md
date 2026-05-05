# MacVis — Architecture

## System overview

```
┌─────────────────────────────────────────────────────┐
│                 Electron App (macOS)                  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │           Renderer Process (React UI)            │ │
│  │  Chat · Settings · Skills · MCPs · Web Builder  │ │
│  └──────────────────┬──────────────────────────────┘ │
│                     │ IPC (contextBridge)             │
│  ┌──────────────────▼──────────────────────────────┐ │
│  │            Main Process (Node.js)                │ │
│  │                                                  │ │
│  │  ┌────────────┐  ┌──────────────┐  ┌─────────┐ │ │
│  │  │  AI Core   │  │  MCP Manager │  │ Config  │ │ │
│  │  │ agent loop │  │ spawn/manage │  │  store  │ │ │
│  │  └────────────┘  └──────────────┘  └─────────┘ │ │
│  │                                                  │ │
│  │  ┌────────────┐  ┌──────────────┐  ┌─────────┐ │ │
│  │  │Tool system │  │Skills loader │  │Telegram │ │ │
│  │  │bash/fs/web │  │  ~/.macvis  │  │  bot    │ │ │
│  │  └────────────┘  └──────────────┘  └─────────┘ │ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
         │                    │                │
    MCP servers          External APIs    Telegram API
  (child processes)      (Anthropic,       (remote
  GitHub/Supabase/        OpenAI etc)      control)
  Vercel/Railway...
```

## Process architecture

### Renderer process
- React 18 SPA built with Vite
- Communicates with main process ONLY via IPC (contextBridge)
- Never directly calls Node.js APIs — everything goes through preload.js
- Handles all UI state via Zustand stores

### Main process
- Full Node.js environment
- Spawns and manages MCP server child processes
- Runs the AI agentic loop
- Manages config file at `~/.macvis/config.json`
- Runs Telegram bot as background service
- Communicates with renderer via `ipcMain` / `ipcRenderer`

### MCP servers
- Each MCP server is a separate child process spawned via `spawn()`
- Communicate over stdio using JSON-RPC (MCP protocol)
- Managed by `MCPManager` class in main process
- Config stored per-MCP in `config.json`

## Data flow — user message to response

```
User types message
      ↓
Renderer sends via IPC: 'agent:run'
      ↓
Main process: AgentLoop.run(message)
      ↓
Build tool list (native tools + all active MCPs)
      ↓
Call AI model (Anthropic/OpenAI/etc) with tools
      ↓
Model returns tool_use block?
  YES → execute tool (bash/filesystem/MCP call)
      → stream result back to renderer via IPC
      → add to messages, loop back
  NO  → stream final text back to renderer
      ↓
Renderer displays streamed response
```

## Config file schema

Location: `~/.macvis/config.json` (managed by `conf` npm package)

```json
{
  "version": "1.0.0",
  "apiKeys": {
    "anthropic": "",
    "openai": "",
    "gemini": "",
    "groq": "",
    "ollama": "http://localhost:11434",
    "elevenlabs": "",
    "tavily": "",
    "serper": "",
    "brave": "",
    "firecrawl": "",
    "nanobrowser": "",
    "telegram": {
      "botToken": "",
      "allowedUserId": ""
    }
  },
  "models": {
    "default": "claude-opus-4-5",
    "provider": "anthropic",
    "fallback": "gpt-4o",
    "fallbackProvider": "openai"
  },
  "mcps": {
    "github": {
      "enabled": false,
      "token": ""
    },
    "supabase": {
      "enabled": false,
      "url": "",
      "serviceKey": ""
    },
    "vercel": {
      "enabled": false,
      "token": ""
    },
    "railway": {
      "enabled": false,
      "token": ""
    },
    "slack": {
      "enabled": false,
      "botToken": "",
      "teamId": ""
    },
    "gmail": {
      "enabled": false
    },
    "cloudflare": {
      "enabled": false,
      "apiToken": "",
      "accountId": ""
    },
    "netlify": {
      "enabled": false,
      "token": ""
    },
    "stripe": {
      "enabled": false,
      "secretKey": ""
    },
    "custom": []
  },
  "skills": {
    "installed": [],
    "enabled": []
  },
  "ui": {
    "theme": "system",
    "fontSize": "medium",
    "sidebarOpen": true
  },
  "telegram": {
    "enabled": false,
    "runOnStartup": false
  }
}
```

## IPC channels (main ↔ renderer)

### Renderer → Main
| Channel | Payload | Description |
|---|---|---|
| `agent:run` | `{ message, sessionId }` | Run agent with message |
| `agent:stop` | `{ sessionId }` | Stop running agent |
| `config:get` | `{ key? }` | Get config value |
| `config:set` | `{ key, value }` | Set config value |
| `mcp:list` | — | List all MCP servers |
| `mcp:connect` | `{ name }` | Connect an MCP server |
| `mcp:disconnect` | `{ name }` | Disconnect MCP server |
| `mcp:install` | `{ name, command, args }` | Install custom MCP |
| `skills:list` | — | List installed skills |
| `skills:install` | `{ url }` | Install skill from URL |
| `telegram:start` | — | Start Telegram bot |
| `telegram:stop` | — | Stop Telegram bot |
| `shell:run` | `{ command }` | Run shell command |

### Main → Renderer
| Channel | Payload | Description |
|---|---|---|
| `agent:stream` | `{ type, content, sessionId }` | Stream agent output |
| `agent:tool` | `{ name, input, status }` | Tool call update |
| `agent:done` | `{ sessionId }` | Agent finished |
| `agent:error` | `{ error, sessionId }` | Agent error |
| `mcp:status` | `{ name, status }` | MCP connection status |
| `telegram:status` | `{ running }` | Telegram bot status |

## Security model

- Telegram bot only responds to `allowedUserId` — all others get rejected immediately
- MCP servers run as child processes with inherited env
- No network server exposed — everything is local IPC
- API keys never logged, never sent anywhere except their intended API
- `contextBridge` in preload.js ensures renderer cannot access Node.js directly

## File storage

```
~/.macvis/
├── config.json          # All settings and API keys
├── workspace/           # Agent working directory
│   ├── AGENTS.md        # Agent persona/instructions
│   └── projects/        # Generated projects
├── skills/              # Installed skills
│   └── <skill-name>/
│       └── SKILL.md
├── sessions/            # Chat history (JSON files)
│   └── <session-id>.json
└── logs/                # App logs
    └── macvis.log
```
