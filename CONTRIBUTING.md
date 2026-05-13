# Contributing to MacVis

Thanks for considering a contribution! MacVis is a community project — bug reports, fixes, features, docs, tests, design feedback are all welcome.

## TL;DR

1. Run it locally (`pnpm install && pnpm dev`) and try to break it
2. File an issue describing the bug or the feature
3. Open a PR — small focused PRs get merged faster than large ones

## Ways to help

**No coding required:**
- 🐛 **Test the app** and file bugs — see [Finding bugs](#finding-bugs) below
- 📸 **Take screenshots** of unusual states (errors, edge cases) and attach to issues
- ✍️ **Improve the README / CONTRIBUTING / docs/screenshots/README.md**
- 💬 **Triage existing issues** — comment with repro steps, edge cases, workarounds

**With code:**
- ✅ Pick up a [good first issue](https://github.com/asim266/macvis/labels/good%20first%20issue)
- ✅ Pick up a [help wanted](https://github.com/asim266/macvis/labels/help%20wanted) issue
- 🚧 Build out a [phase from the roadmap](README.md#roadmap) (skills loader, auto-updater, etc.)
- 🔌 Add a new MCP integration to [`MCPRegistry.ts`](electron/core/mcp/MCPRegistry.ts)
- 🤖 Add a new chat provider (extend `ChatProvider` in [`electron/core/agent/providers/`](electron/core/agent/providers/))

## Development setup

```bash
git clone https://github.com/asim266/macvis.git
cd macvis
pnpm install
pnpm dev          # opens Electron with HMR
pnpm typecheck    # tsc --noEmit (run before pushing)
pnpm build        # produces dist/MacVis-0.1.0-{arm64,x64}.dmg
```

### Repo layout

```
electron/                ← Node.js main process
├── core/
│   ├── agent/           ← AgentLoop, ModelRouter, ProviderValidator, providers/
│   ├── tools/           ← BashTool, FilesystemTool, WebSearchTool
│   ├── mcp/             ← MCPManager, MCPRegistry, MCPClient
│   ├── sessions/        ← SessionStore (chat persistence)
│   ├── projects/        ← ProjectManager
│   ├── telegram/        ← TelegramBot (Telegraf)
│   └── config/          ← ConfigStore (conf wrapper)
├── ipc/                 ← One IPC handler module per domain
├── main.ts              ← BrowserWindow + app boot
└── preload.ts           ← contextBridge → window.macvis.*

src/                     ← React renderer
├── pages/               ← Chat, Settings, Projects, MCPs
├── components/          ← layout, chat, settings
├── stores/              ← Zustand state
└── App.tsx              ← root + routing
```

Renderer never imports from `electron/` — all communication goes through `window.macvis.*` (typed bridge defined in `electron/preload.ts`).

## Finding bugs

The agent has full Mac access and routes through multiple providers, MCP servers, and a Telegram bot — there are *many* surfaces. Things to try:

### Chat & memory
- Send a very long prompt (>100k tokens)
- Send a message in a language other than English
- Interrupt a streaming response (click Stop)
- Open the same session in two windows simultaneously
- Delete a session while the agent is running in it
- Switch providers mid-conversation
- Force a provider failure (use a fake key for Primary) and verify fallback works

### MCP
- Connect every official MCP in the registry — note any that fail to spawn
- Disconnect a MCP while a tool call from it is in flight
- Install a custom MCP with a bad command — does the error surface cleanly?
- Enable an MCP, kill the bot's child process via `kill -9`, see if the UI recovers

### Telegram
- Send a `/start`, then a long task, then `/stop`
- Send a sticker, photo, voice note — does it crash?
- Send messages from a user that's NOT the allowed ID — verify rejection
- Bot running while you delete the session from MacVis sidebar

### Projects
- Have the agent create a project, then delete it from Finder while MacVis is open
- Click Run on a project that has no entry file
- Create a project with a name containing special characters

### Edge cases
- No internet
- No API keys configured anywhere
- Wrong key format (random string)
- Run on a Mac without Node.js installed (DMG build)
- Run on Intel Mac (we ship a separate build but it's untested)

**File a bug:** [Open an issue](https://github.com/asim266/macvis/issues/new) with:
1. macOS version (`sw_vers`)
2. Apple Silicon or Intel
3. What you did
4. What you expected
5. What happened (with screenshot if visual)
6. Stack trace from DevTools console (open with **View → Toggle DevTools**)

## Code style

- TypeScript strict mode is on — don't disable it
- No comments unless the *why* is non-obvious — well-named identifiers carry their own meaning
- Prefer editing existing files over creating new ones
- Don't add error-handling for impossible states. Trust internal code; only validate at boundaries
- Run `pnpm typecheck` before pushing — CI doesn't exist yet, so type errors will land in main

## Pull requests

- One concern per PR — bug fix OR feature OR refactor, not all three
- If you change the agent loop, providers, or MCP layer, test the chain by actually running the app and sending a message
- Update README / CONTRIBUTING if you change behavior users see
- Commits get squashed on merge; PR title becomes the squash commit message — write it well

## Adding a new MCP integration

Two files to touch — almost mechanical:

1. Add an entry to [`electron/core/mcp/MCPRegistry.ts`](electron/core/mcp/MCPRegistry.ts) with:
   - `id`, `name`, `description`, `category`, `source`, `icon`
   - `command` and `args` (the `npx -y ...` or `uvx ...` spawn line)
   - `env` mapping env-var-name → config key for any tokens
   - `inputs` array describing the UI inputs (label, configKey, placeholder, type)
   - `docsUrl` linking to where the user gets a token
2. (Optional) Mark `featured: true` + add a `brandColor` to put it in the Quick Connect row

Test:
```bash
pnpm dev
# Settings → Telegram tab (or sidebar Integrations)
# Find your new entry, click Connect
# Verify tools appear (toolCount > 0)
# In chat: ask the agent to use one of the tools
```

## Adding a new chat provider

The abstraction is in [`electron/core/agent/providers/types.ts`](electron/core/agent/providers/types.ts). Three files:

1. Create `electron/core/agent/providers/MyProvider.ts` implementing `ChatProvider`
   - Convert `CommonMessage[]` → provider's native format
   - Stream and emit `onText` / `onToolStart`
   - Return a `FinalMessage` with content blocks + tool uses + stopReason
2. Register in `electron/core/agent/providers/index.ts` — add to `REGISTRY` map
3. Add validation in `electron/core/agent/ProviderValidator.ts`
4. Add a `ProviderKeyInput` in `src/pages/Settings.tsx` chat section

The OpenAI provider already handles OpenAI / OpenRouter / Groq / Ollama — anything OpenAI-compatible just needs a new entry in its `PROVIDERS` constant.

## Releasing

Maintainer-only:
1. Bump version in `package.json`
2. `pnpm build` — produces `dist/MacVis-{version}-{arch}.dmg` for both architectures
3. `gh release create v{version} dist/*.dmg --title "..." --notes "..."`
4. Update README download link if needed

## License

By contributing, you agree your contributions are licensed under [MIT](LICENSE).
