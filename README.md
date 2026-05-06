<div align="center">

# MacVis

**A local-first, fully-agentic AI assistant for macOS.**

Bring-your-own-key. No backend. No telemetry. Full Mac access.

[![License](https://img.shields.io/badge/license-MIT-red.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS-lightgrey.svg)](#)
[![Built with](https://img.shields.io/badge/built%20with-Electron%20%2B%20React-red.svg)](#)

</div>

---

## What is MacVis?

MacVis is a desktop AI assistant that runs natively on your Mac. It's like having Claude or ChatGPT, but with **full access to your machine** — bash, filesystem, web search, browser automation, and developer platforms (GitHub, Vercel, Supabase, etc.) via MCP.

It's designed as a local-first alternative to cloud agent platforms: your conversations, projects, and credentials never leave your machine.

```
┌────────────────────────────────────────────┐
│  🦞 MacVis                                  │
│                                            │
│  💬  Chat with full Mac access              │
│  📁  Projects you build, kept locally       │
│  🔌  MCP integrations (BYOK)                │
│  📡  Telegram remote control                │
│  🧠  Persistent memory across sessions      │
└────────────────────────────────────────────┘
```

## Highlights

- **Full Mac access** — bash, filesystem, web search out of the box. Browser automation via Playwright (Phase 3).
- **BYOK, multi-provider** — Anthropic, OpenAI, OpenRouter, Gemini, Groq, Ollama. Add your keys, validate them, pick a model.
- **Live key validation** — every key has a one-click "Test" that hits the provider's `/models` endpoint and fetches the actual list of models you have access to.
- **Persistent memory** — every chat is saved to `~/.macvis/sessions/`. Reopen the app, your history is there. The agent remembers what it created in past turns.
- **Projects view** — every code project the agent creates lands in `~/.macvis/workspace/projects/` and shows up in a dedicated Projects page with one-click open in browser / editor / Finder, plus a Run button for HTML / Node / Next / Python projects.
- **MCP-ready** — first-class config for GitHub, Supabase, Vercel, Railway, Slack, Cloudflare, Netlify, Stripe (full connectivity in Phase 4).
- **Telegram remote** — single-user-gated bot for full agent access from your phone (Phase 7).
- **No database** — everything is flat JSON in `~/.macvis/`. Inspect it, back it up, sync it however you want.
- **Distinctive UI** — refined dark theme, custom red accent, Geist typography, no Inter slop.

## Screenshots

> Add screenshots here once you've built and run the app.

## Quick Start

### Prerequisites

- macOS 13 or newer
- [Node.js](https://nodejs.org) 20+
- [pnpm](https://pnpm.io/installation)

### Run from source

```bash
git clone https://github.com/asim266/macvis.git
cd macvis
pnpm install
pnpm dev
```

The app will open. Go to **Settings → API Keys**, paste your Anthropic key, click **Test**, and you're live.

### First steps

1. Add your Anthropic key in `Settings → API Keys → Anthropic` and click **Test**
2. (Optional) Add OpenAI / OpenRouter / Gemini / Groq / Ollama keys
3. Open `Settings → Models` and pick your default model
4. Go back to Chat and ask MacVis to do something:
   - *"List my Downloads folder"*
   - *"Create a Next.js todo app called my-todo"*
   - *"What's the disk space on this machine?"*

Code projects land in `~/.macvis/workspace/projects/` and show up automatically in the **Projects** tab.

## Tech Stack

| Layer | Choice |
|---|---|
| **Runtime** | Electron 41 |
| **Bundler** | electron-vite 5 + Vite 8 |
| **UI** | React 18 + TypeScript |
| **Styling** | Tailwind v4, OKLCH-based design tokens |
| **Typography** | Geist Sans + Geist Mono |
| **State** | Zustand |
| **Config store** | `conf` → `~/Library/Application Support/macvis/config.json` |
| **AI SDK** | `@anthropic-ai/sdk` (more providers coming) |
| **Package manager** | pnpm |

## Architecture

```
~/.macvis/                       ← user data (BYOK home)
├── sessions/                    ← persisted chat history
│   └── <session-id>.json
├── workspace/projects/          ← projects the agent creates
│   └── <project-name>/
└── skills/                      ← installed skill packs (Phase 6)

macvis/                          ← this repo
├── electron/                    ← Node.js main process
│   ├── core/
│   │   ├── agent/               ← AgentLoop, ToolBuilder, ProviderValidator
│   │   ├── tools/               ← bash, filesystem, web search
│   │   ├── sessions/            ← persistent chat history
│   │   ├── projects/            ← project scanner / runner
│   │   ├── config/              ← conf wrapper
│   │   ├── mcp/                 ← MCP client manager (Phase 4)
│   │   ├── skills/              ← skill loader (Phase 6)
│   │   └── telegram/            ← Telegraf bot (Phase 7)
│   ├── ipc/                     ← IPC handlers (one per domain)
│   ├── main.ts                  ← BrowserWindow + app boot
│   └── preload.ts               ← contextBridge → window.macvis.*
└── src/                         ← React renderer
    ├── pages/                   ← Chat, Settings, Projects, MCPs
    ├── components/              ← layout, chat, settings, ui
    ├── stores/                  ← Zustand state
    └── App.tsx                  ← root + routing
```

The main process owns all I/O, AI calls, and tool execution. The renderer is pure UI and talks to the main process exclusively over a typed IPC bridge (`window.macvis.*`).

## Roadmap

| Phase | Status |
|---|---|
| 1. Electron shell + chat + Anthropic streaming | ✅ |
| 2. Full settings with multi-provider BYOK + validation | ✅ |
| 3. Tool system: bash, filesystem, web search, projects | ✅ partial |
| 3b. Browser automation (Playwright) | ⏳ |
| 4. MCP manager — spawn & route to MCP servers | ⏳ |
| 5. Platform integrations: GitHub, Vercel, Supabase, Railway | ⏳ |
| 6. Skills loader + Web Builder skill | ⏳ |
| 7. Telegram remote control | ⏳ |
| 8. DMG packaging + auto-updater | ⏳ |

## Privacy

- All conversation data stays on your Mac.
- API keys are stored locally in `~/Library/Application Support/macvis/config.json`.
- No analytics, no telemetry, no remote logging.
- Provider validation hits the providers directly from your machine.

## Contributing

PRs welcome. The code is organized phase-by-phase — pick something off the roadmap or open an issue first to discuss bigger changes.

```bash
pnpm dev          # run in dev mode
pnpm typecheck    # tsc --noEmit
pnpm build        # build a .dmg (macOS only)
```

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

Built by [@asim266](https://github.com/asim266) · Inspired by Claude Desktop, Linear, Raycast, and OpenClaw

</div>
