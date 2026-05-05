# MacVis — Claude Code Master Brief

## What you are building

MacVis is a macOS desktop app built with Electron + React + TypeScript.
It is a local-first, fully agentic AI assistant that can control the entire Mac,
connect to every major developer platform via MCP servers, build and deploy websites,
and be operated remotely via Telegram.

It is inspired by OpenClaw but built as a native macOS Electron app with a beautiful UI.

## Core principles

- **No database** — all config and state stored in flat JSON files under `~/.macvis/`
- **BYOK** — user provides all API keys, stored locally in `~/.macvis/config.json`
- **Local-first** — everything runs on the user's machine, no cloud backend
- **Full Mac access** — bash, filesystem, browser automation, screen access
- **MCP-first** — every integration (GitHub, Supabase, Vercel, Railway etc) is via MCP
- **Skills system** — installable skill packs loaded from `~/.macvis/skills/`
- **Telegram remote** — full agent access via a Telegram bot when away from Mac

## Documents in this repo

Read ALL of these before writing any code:

| File | Purpose |
|---|---|
| `CLAUDE.md` | This file — master brief |
| `ARCHITECTURE.md` | Full system architecture and data flow |
| `FOLDER_STRUCTURE.md` | Exact folder and file layout to create |
| `PHASE_1.md` | Electron shell + React UI + Claude chat |
| `PHASE_2.md` | Config system + BYOK settings screen |
| `PHASE_3.md` | Tool system — bash, filesystem, browser |
| `PHASE_4.md` | MCP manager — spawn, connect, manage |
| `PHASE_5.md` | Platform MCPs — GitHub, Supabase, Vercel, Railway |
| `PHASE_6.md` | Skills loader + web builder |
| `PHASE_7.md` | Telegram bot remote control |
| `PHASE_8.md` | DMG packaging + auto-updater |
| `UI_SPEC.md` | UI design spec, layout, components |
| `MCP_REGISTRY.md` | Full list of all MCPs with install commands |
| `API_KEYS.md` | All supported API keys and what they do |

## Build order

Always follow the phases in order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8.
Each phase builds on the previous. Do not skip ahead.

## Tech stack (do not deviate)

```
Runtime:        Node.js 24
Framework:      Electron 30
UI:             React 18 + TypeScript
Bundler:        Vite + electron-vite
Styling:        Tailwind CSS v4
State:          Zustand
Config store:   conf (npm) — writes to ~/Library/Application Support/macvis/
Package mgr:    pnpm
Process mgr:    electron-builder (for DMG)
Telegram:       telegraf v4
Browser auto:   playwright
Terminal:       node-pty
MCP:            @modelcontextprotocol/sdk
AI SDK:         @anthropic-ai/sdk, openai
```

## Naming conventions

- App name: `MacVis`
- Bundle ID: `ai.macvis.app`
- Config dir: `~/.macvis/`
- Skills dir: `~/.macvis/skills/`
- Workspace: `~/.macvis/workspace/`
- Log dir: `~/.macvis/logs/`

## What Claude Code should do first

1. Read all `.md` files in this folder
2. Run `pnpm init` and install all dependencies from `PHASE_1.md`
3. Build phase by phase, testing each before moving on
4. Never hardcode API keys — always read from the config store
5. Never use a database — use flat JSON files only
