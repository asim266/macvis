# MacVis — Folder Structure

Create this exact folder and file structure. Do not deviate.

```
macvis/
│
├── CLAUDE.md                          # Master brief (this repo)
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── tsconfig.node.json
├── electron-builder.yml
├── vite.config.ts
├── tailwind.config.ts
├── .env.example
├── .gitignore
│
├── electron/                          # Main process (Node.js)
│   ├── main.ts                        # App entry, window creation
│   ├── preload.ts                     # contextBridge IPC definitions
│   │
│   ├── core/
│   │   ├── agent/
│   │   │   ├── AgentLoop.ts           # Main agentic loop
│   │   │   ├── ModelRouter.ts         # Route to Anthropic/OpenAI/etc
│   │   │   ├── ToolBuilder.ts         # Build tool list for model
│   │   │   └── StreamHandler.ts      # Handle streaming responses
│   │   │
│   │   ├── tools/
│   │   │   ├── index.ts               # Tool registry
│   │   │   ├── BashTool.ts            # Execute shell commands
│   │   │   ├── FilesystemTool.ts      # Read/write/list files
│   │   │   ├── BrowserTool.ts         # Playwright browser control
│   │   │   ├── WebSearchTool.ts       # Tavily/Brave/Serper search
│   │   │   └── ScreenTool.ts          # Screenshot macOS screen
│   │   │
│   │   ├── mcp/
│   │   │   ├── MCPManager.ts          # Spawn/manage MCP servers
│   │   │   ├── MCPClient.ts           # JSON-RPC client per server
│   │   │   ├── MCPRegistry.ts         # Known MCPs + install commands
│   │   │   └── MCPToolAdapter.ts      # Convert MCP tools → agent tools
│   │   │
│   │   ├── skills/
│   │   │   ├── SkillsLoader.ts        # Load SKILL.md files
│   │   │   ├── SkillsInstaller.ts     # Install skills from URL/git
│   │   │   └── SkillsRegistry.ts      # Track installed skills
│   │   │
│   │   ├── config/
│   │   │   ├── ConfigStore.ts         # conf wrapper — reads/writes JSON
│   │   │   └── ConfigSchema.ts        # Zod schema for config validation
│   │   │
│   │   ├── sessions/
│   │   │   ├── SessionManager.ts      # Create/load/save chat sessions
│   │   │   └── SessionStore.ts        # Persist sessions to JSON files
│   │   │
│   │   └── telegram/
│   │       ├── TelegramBot.ts         # Telegraf bot setup
│   │       └── TelegramHandler.ts     # Message handling + security
│   │
│   └── ipc/
│       ├── agentHandlers.ts           # IPC handlers for agent calls
│       ├── configHandlers.ts          # IPC handlers for config
│       ├── mcpHandlers.ts             # IPC handlers for MCP
│       ├── skillsHandlers.ts          # IPC handlers for skills
│       └── telegramHandlers.ts        # IPC handlers for telegram
│
├── src/                               # Renderer process (React)
│   ├── main.tsx                       # React entry point
│   ├── App.tsx                        # Root component + router
│   │
│   ├── pages/
│   │   ├── Chat.tsx                   # Main chat interface
│   │   ├── Settings.tsx               # All settings tabs
│   │   ├── Skills.tsx                 # Skills browser + installer
│   │   ├── MCPs.tsx                   # MCP connections manager
│   │   ├── WebBuilder.tsx             # Website builder UI
│   │   └── Onboarding.tsx             # First-run setup wizard
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx            # Left nav sidebar
│   │   │   ├── TitleBar.tsx           # macOS traffic lights + title
│   │   │   └── StatusBar.tsx          # Bottom status bar
│   │   │
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx         # Message list
│   │   │   ├── MessageBubble.tsx      # Individual message
│   │   │   ├── ToolCallCard.tsx       # Show tool being used
│   │   │   ├── CodeBlock.tsx          # Syntax highlighted code
│   │   │   ├── ChatInput.tsx          # Input box + send button
│   │   │   └── SessionTabs.tsx        # Multiple sessions tabs
│   │   │
│   │   ├── settings/
│   │   │   ├── APIKeysTab.tsx         # All API key inputs
│   │   │   ├── ModelsTab.tsx          # Model selector
│   │   │   ├── MCPsTab.tsx            # MCP enable/disable
│   │   │   └── TelegramTab.tsx        # Telegram bot config
│   │   │
│   │   └── ui/                        # Reusable primitives
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Toggle.tsx
│   │       ├── Badge.tsx
│   │       ├── Spinner.tsx
│   │       └── Modal.tsx
│   │
│   ├── stores/                        # Zustand state
│   │   ├── chatStore.ts               # Messages, sessions, streaming
│   │   ├── configStore.ts             # Config state (synced with main)
│   │   ├── mcpStore.ts                # MCP connection states
│   │   └── uiStore.ts                 # Sidebar, modals, theme
│   │
│   ├── hooks/
│   │   ├── useAgent.ts                # Agent run/stop/stream
│   │   ├── useConfig.ts               # Read/write config
│   │   ├── useMCP.ts                  # MCP connect/disconnect
│   │   └── useIPCListener.ts          # Generic IPC listener
│   │
│   └── lib/
│       ├── ipc.ts                     # Type-safe IPC wrapper
│       ├── markdown.ts                # Markdown renderer setup
│       └── utils.ts                   # General utilities
│
├── assets/
│   ├── icon.icns                      # macOS app icon
│   ├── icon.png                       # 512x512 PNG icon
│   └── dmg-background.png            # DMG installer background
│
├── skills/                            # Built-in bundled skills
│   ├── web-builder/
│   │   └── SKILL.md
│   ├── code-reviewer/
│   │   └── SKILL.md
│   └── deploy-helper/
│       └── SKILL.md
│
└── docs/                              # Planning docs (this folder)
    ├── CLAUDE.md
    ├── ARCHITECTURE.md
    ├── FOLDER_STRUCTURE.md
    ├── PHASE_1.md → PHASE_8.md
    ├── UI_SPEC.md
    ├── MCP_REGISTRY.md
    └── API_KEYS.md
```

## Key files to create first (Phase 1)

In this exact order:

1. `package.json` — all dependencies
2. `vite.config.ts` — electron-vite config
3. `tsconfig.json` — TypeScript config
4. `electron/main.ts` — creates BrowserWindow
5. `electron/preload.ts` — exposes IPC to renderer
6. `src/main.tsx` — React entry
7. `src/App.tsx` — root with router
8. `src/pages/Chat.tsx` — basic chat UI
9. `electron/core/config/ConfigStore.ts` — config system
10. `electron/ipc/agentHandlers.ts` — wire up first IPC calls
