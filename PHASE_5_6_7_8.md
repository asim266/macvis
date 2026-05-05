# Phase 5 — Platform MCPs (GitHub, Supabase, Vercel, Railway)

## Goal
All major developer platform integrations working end-to-end via MCP.
The agent should be able to do full deployment workflows autonomously.

## Full workflow example: "Build and deploy a Next.js app"

The agent should autonomously:
1. Create project files via FilesystemTool
2. Run `npx create-next-app` via BashTool
3. Create GitHub repo via GitHub MCP
4. `git init && git push` via BashTool
5. Link to Vercel via Vercel MCP
6. Trigger deployment via Vercel MCP
7. Return the live URL

## MCP-specific setup notes

### GitHub MCP
```
Token needs scopes: repo, workflow, read:org
Env var: GITHUB_PERSONAL_ACCESS_TOKEN
Tools available:
  - create_repository, list_repositories, get_repository
  - create_pull_request, list_pull_requests, merge_pull_request
  - create_issue, list_issues, close_issue
  - push_files, create_branch, list_branches
  - get_file_contents, create_or_update_file
  - list_commits, get_commit
  - trigger_workflow, list_workflow_runs
```

### Supabase MCP
```
Token: Supabase access token (not anon key — service key)
Env var: SUPABASE_ACCESS_TOKEN
Tools available:
  - list_projects, get_project
  - execute_sql (run any SQL query)
  - list_tables, create_table
  - list_edge_functions, deploy_edge_function
  - list_storage_buckets, create_bucket
  - get_project_url, get_anon_key
```

### Vercel MCP
```
Token: Vercel access token
Env var: VERCEL_TOKEN
Tools available:
  - list_projects, create_project, delete_project
  - list_deployments, get_deployment
  - create_deployment (trigger new deploy)
  - list_domains, add_domain
  - list_env_vars, create_env_var, delete_env_var
  - get_project_logs
```

### Railway MCP
```
Token: Railway API token
Env var: RAILWAY_TOKEN
Tools available:
  - list_projects, create_project
  - list_services, create_service
  - list_deployments, trigger_deployment
  - list_variables, set_variable
  - get_project_domains
```

## System prompt to inject for deployment workflows

Add to `AGENTS.md` in workspace:

```markdown
# Deployment assistant guidelines

When the user asks to build and deploy something:
1. Always create the project locally in ~/macvis/workspace/projects/<name>/
2. Initialize git immediately after creating files
3. Create GitHub repo before deploying anywhere
4. For Vercel: connect GitHub repo rather than uploading directly
5. Always report the final URL when deployment completes
6. Store project info in a local README.md

Available platforms:
- Vercel: best for Next.js, React, static sites
- Railway: best for Node.js APIs, databases, background workers
- Netlify: alternative to Vercel for static sites
- Cloudflare Pages: edge-deployed sites and Workers
```

## Testing Phase 5

Test each MCP individually before combined workflows:

1. GitHub: "Create a GitHub repo called test-macvis"
2. Supabase: "List my Supabase projects"
3. Vercel: "List my Vercel deployments"
4. Railway: "List my Railway projects"
5. Combined: "Create a simple HTML landing page, push to GitHub, deploy to Vercel"

---

# Phase 6 — Skills Loader + Web Builder

## Goal
A plugin system where skills are markdown files that inject
instructions into the agent. Built-in web builder skill included.

## electron/core/skills/SkillsLoader.ts

```typescript
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const SKILLS_DIR = path.join(os.homedir(), '.macvis', 'skills')
const BUILTIN_DIR = path.join(__dirname, '../../../skills')

export interface Skill {
  name: string
  description: string
  content: string  // Full SKILL.md content
  source: 'builtin' | 'installed'
}

export class SkillsLoader {
  private static instance: SkillsLoader
  private skills = new Map<string, Skill>()

  static getInstance() {
    if (!SkillsLoader.instance) SkillsLoader.instance = new SkillsLoader()
    return SkillsLoader.instance
  }

  async loadAll(): Promise<void> {
    // Load built-in skills
    try {
      const builtins = await fs.readdir(BUILTIN_DIR)
      for (const name of builtins) {
        await this.loadSkill(name, BUILTIN_DIR, 'builtin')
      }
    } catch {}

    // Load user-installed skills
    try {
      await fs.mkdir(SKILLS_DIR, { recursive: true })
      const installed = await fs.readdir(SKILLS_DIR)
      for (const name of installed) {
        await this.loadSkill(name, SKILLS_DIR, 'installed')
      }
    } catch {}
  }

  private async loadSkill(name: string, dir: string, source: Skill['source']) {
    try {
      const skillPath = path.join(dir, name, 'SKILL.md')
      const content = await fs.readFile(skillPath, 'utf-8')
      // Extract description from first line comment or heading
      const desc = content.split('\n').find(l => l.startsWith('#'))?.replace('#', '').trim() || name
      this.skills.set(name, { name, description: desc, content, source })
    } catch {}
  }

  async install(urlOrPath: string, name: string): Promise<void> {
    const skillDir = path.join(SKILLS_DIR, name)
    await fs.mkdir(skillDir, { recursive: true })

    if (urlOrPath.startsWith('http')) {
      const res = await fetch(urlOrPath)
      const content = await res.text()
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), content)
    } else {
      await fs.copyFile(urlOrPath, path.join(skillDir, 'SKILL.md'))
    }

    await this.loadSkill(name, SKILLS_DIR, 'installed')
  }

  async uninstall(name: string): Promise<void> {
    const skillDir = path.join(SKILLS_DIR, name)
    await fs.rm(skillDir, { recursive: true, force: true })
    this.skills.delete(name)
  }

  getEnabledContent(enabledNames: string[]): string {
    return enabledNames
      .map(name => this.skills.get(name)?.content)
      .filter(Boolean)
      .join('\n\n---\n\n')
  }

  list(): Skill[] {
    return Array.from(this.skills.values())
  }
}
```

## Built-in skill: Web Builder

Create `skills/web-builder/SKILL.md`:

```markdown
# Web Builder

You are an expert web developer. When the user asks you to build a website or web app:

## Process
1. Ask clarifying questions if the request is vague (type of site, colors, content)
2. Create files in ~/macvis/workspace/projects/<project-name>/
3. Use modern HTML5, CSS3, and vanilla JS unless user specifies a framework
4. For React/Next.js projects, use `npx create-next-app` via bash tool
5. Always create: index.html, styles.css, README.md at minimum
6. Preview the site locally using `python3 -m http.server 8080` in the project dir
7. Offer to deploy when done (Vercel for React, Netlify for static)

## File structure for static sites
```
project-name/
├── index.html
├── styles.css
├── script.js
├── assets/
│   └── images/
└── README.md
```

## Quality standards
- Mobile-first responsive design
- Semantic HTML (header, nav, main, section, footer)
- CSS custom properties for theming
- Accessible (alt text, ARIA labels, keyboard nav)
- Fast loading (no unnecessary libraries)

## Deployment
- Static sites → Netlify or Vercel
- React/Next.js → Vercel (preferred)
- Always set up GitHub repo first, then connect to deployment platform
```

## src/pages/WebBuilder.tsx

Build a dedicated Web Builder page with:
- Project name input
- Site type selector (Landing page, Portfolio, E-commerce, Blog, Web app)
- Framework selector (Plain HTML, React, Next.js, Vue)
- Description textarea
- "Build it" button → sends structured prompt to agent
- Live preview iframe (shows local dev server)
- Deploy buttons (Vercel, Netlify, Railway)

The structured prompt format:
```
Build a [type] website called "[name]" using [framework].

Description: [description]

Requirements:
- Create all files in ~/macvis/workspace/projects/[name]/
- Start a local preview server on port 8080
- Tell me when it's ready to preview
```

---

# Phase 7 — Telegram Bot Remote Control

## Goal
A Telegram bot that gives full agent access from any device.
Securely gated to one user ID. Runs as a background daemon in the Electron app.

## Dependencies
```bash
pnpm add telegraf
```

## electron/core/telegram/TelegramBot.ts

```typescript
import { Telegraf, Context } from 'telegraf'
import { message } from 'telegraf/filters'
import { agentLoop } from '../agent/AgentLoop'
import { ConfigStore } from '../config/ConfigStore'
import { getMainWindow } from '../../main'
import { nanoid } from 'nanoid'

let bot: Telegraf | null = null

export async function startTelegramBot(): Promise<void> {
  const config = ConfigStore.getInstance()
  const token = config.get('apiKeys.telegram.botToken') as string
  const allowedId = config.get('apiKeys.telegram.allowedUserId') as string

  if (!token) throw new Error('No Telegram bot token configured')
  if (!allowedId) throw new Error('No allowed user ID configured')

  bot = new Telegraf(token)

  // Security middleware — reject everyone except allowed user
  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id?.toString()
    if (userId !== allowedId) {
      await ctx.reply('🚫 Unauthorized. This is a private assistant.')
      return
    }
    return next()
  })

  // /start command
  bot.command('start', async (ctx) => {
    await ctx.reply(
      '🦞 MacVis is online.\n\n' +
      'I have full access to your Mac. Send any message to get started.\n\n' +
      'Commands:\n' +
      '/status — check agent status\n' +
      '/stop — stop current task\n' +
      '/clear — clear session'
    )
  })

  // /status command
  bot.command('status', async (ctx) => {
    const mcpList = ['GitHub', 'Vercel', 'Supabase'].join(', ')  // TODO: real list
    await ctx.reply(`✅ MacVis online\n🔌 MCPs: ${mcpList}`)
  })

  // Handle regular messages — run full agent
  bot.on(message('text'), async (ctx) => {
    const userMessage = ctx.message.text
    const sessionId = `telegram-${ctx.from.id}`

    let thinkingMsg: any
    try {
      thinkingMsg = await ctx.reply('⏳ Working on it...')
    } catch {}

    let fullResponse = ''
    const toolsUsed: string[] = []

    // Collect streamed response
    const unsubText = (global as any).__macvisIPC?.onStream?.((data: any) => {
      if (data.sessionId === sessionId && data.type === 'text') {
        fullResponse += data.content
      }
    })

    const unsubTool = (global as any).__macvisIPC?.onTool?.((data: any) => {
      if (data.sessionId === sessionId && data.status === 'running') {
        toolsUsed.push(data.name)
      }
    })

    await agentLoop.run(userMessage, sessionId)

    // Send response (Telegram has 4096 char limit — split if needed)
    const toolSummary = toolsUsed.length > 0 ? `\n\n🔧 Tools used: ${[...new Set(toolsUsed)].join(', ')}` : ''
    const reply = (fullResponse || 'Done.') + toolSummary

    // Split long messages
    if (reply.length > 4000) {
      const chunks = reply.match(/.{1,4000}/gs) || []
      for (const chunk of chunks) {
        await ctx.reply(chunk, { parse_mode: 'Markdown' })
      }
    } else {
      await ctx.reply(reply, { parse_mode: 'Markdown' })
    }

    // Notify desktop
    getMainWindow()?.webContents.send('telegram:message', {
      from: ctx.from.username || ctx.from.first_name,
      message: userMessage,
      response: fullResponse,
    })

    unsubText?.()
    unsubTool?.()
  })

  // Handle document/file uploads
  bot.on(message('document'), async (ctx) => {
    const file = ctx.message.document
    await ctx.reply(`📎 File received: ${file.file_name}. I'll process it when you give me instructions.`)
  })

  bot.launch()

  // Notify renderer
  getMainWindow()?.webContents.send('telegram:status', { running: true })
  console.log('Telegram bot started')
}

export async function stopTelegramBot(): Promise<void> {
  if (bot) {
    bot.stop('USER_STOPPED')
    bot = null
    getMainWindow()?.webContents.send('telegram:status', { running: false })
  }
}
```

## Security notes

- The `allowedUserId` is your Telegram numeric user ID (get it from @userinfobot)
- Bot token is created via @BotFather
- All other users get rejected at middleware level before any processing
- Never expose the bot token publicly

## src/components/settings/TelegramTab.tsx

Build a settings tab with:
- Instructions section: "1. Create a bot via @BotFather, 2. Get your user ID via @userinfobot"
- Bot token input field (password type)
- Allowed user ID input
- Start/stop toggle with green/red status indicator
- "Test connection" button (sends a test message to your Telegram)
- Option: "Start bot automatically when MacVis opens"

---

# Phase 8 — DMG Packaging + Auto-updater

## Goal
Package the app as a distributable .dmg file.
Add auto-update so users get new versions automatically.

## Dependencies
```bash
pnpm add electron-updater
```

## electron-builder.yml (complete)

```yaml
appId: ai.macvis.app
productName: MacVis
copyright: Copyright © 2025

mac:
  target:
    - target: dmg
    - target: zip
  icon: assets/icon.icns
  hardenedRuntime: false
  gatekeeperAssess: false
  extendInfo:
    NSMicrophoneUsageDescription: MacVis uses the microphone for voice input
    NSCameraUsageDescription: MacVis may access camera for node features
    NSAppleEventsUsageDescription: MacVis needs automation access to control apps
    NSSystemAdministrationUsageDescription: MacVis needs admin access for some operations

dmg:
  background: assets/dmg-background.png
  window:
    width: 540
    height: 380
  contents:
    - x: 130
      y: 220
    - x: 410
      y: 220
      type: link
      path: /Applications
  title: MacVis

publish:
  provider: github
  owner: YOUR_GITHUB_USERNAME
  repo: macvis

directories:
  output: dist
  buildResources: assets

files:
  - dist-electron/**/*
  - dist/**/*
  - skills/**/*
  - package.json
```

## Auto-updater setup

```typescript
// In electron/main.ts, add after app.whenReady():
import { autoUpdater } from 'electron-updater'

autoUpdater.checkForUpdatesAndNotify()

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    buttons: ['Restart', 'Later'],
    title: 'Update ready',
    message: 'A new version of MacVis has been downloaded. Restart to apply.',
  }).then(({ response }) => {
    if (response === 0) autoUpdater.quitAndInstall()
  })
})
```

## Build commands

```bash
# Development
pnpm dev

# Build DMG (must run on macOS)
pnpm build

# Output: dist/MacVis-0.1.0.dmg
```

## App icon requirements

Create `assets/icon.icns` from a 1024×1024 PNG:

```bash
# Using iconutil (built into macOS)
mkdir icon.iconset
sips -z 16 16   icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32   icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32   icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64   icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128 icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256 icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256 icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512 icon.png --out icon.iconset/icon_256x256@2x.png
cp icon.png icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset
mv icon.icns assets/icon.icns
```

## Testing Phase 8

1. `pnpm build` completes without errors
2. `dist/MacVis-x.x.x.dmg` file exists
3. Double-click DMG → drag to Applications works
4. App opens from Applications folder
5. App icon shows in dock
6. All features work in production build (not just dev)
7. Auto-updater connects to GitHub releases
