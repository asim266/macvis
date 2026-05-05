# Phase 2 — Config System + BYOK Settings Screen

## Goal
Full settings UI where users can enter ALL their API keys,
choose models, configure MCPs, and manage the app.

## Dependencies
```bash
pnpm add conf zod nanoid
```

## electron/core/config/ConfigStore.ts

```typescript
import Conf from 'conf'
import { z } from 'zod'
import { defaultConfig } from './ConfigSchema'

export class ConfigStore {
  private static instance: ConfigStore
  private store: Conf

  private constructor() {
    this.store = new Conf({
      projectName: 'macvis',
      defaults: defaultConfig,
    })
  }

  static getInstance(): ConfigStore {
    if (!ConfigStore.instance) {
      ConfigStore.instance = new ConfigStore()
    }
    return ConfigStore.instance
  }

  get(key?: string): any {
    if (!key) return this.store.store
    // Support dot notation: 'apiKeys.anthropic'
    return key.split('.').reduce((obj: any, k) => obj?.[k], this.store.store)
  }

  set(key: string, value: any): void {
    this.store.set(key, value)
  }

  getAll() {
    return this.store.store
  }
}
```

## electron/core/config/ConfigSchema.ts

```typescript
export const defaultConfig = {
  version: '1.0.0',
  apiKeys: {
    anthropic: '',
    openai: '',
    gemini: '',
    groq: '',
    ollama: 'http://localhost:11434',
    elevenlabs: '',
    tavily: '',
    serper: '',
    brave: '',
    firecrawl: '',
    nanobrowser: '',
    telegram: { botToken: '', allowedUserId: '' },
  },
  models: {
    default: 'claude-opus-4-5',
    provider: 'anthropic',
    fallback: 'gpt-4o',
    fallbackProvider: 'openai',
  },
  mcps: {
    github: { enabled: false, token: '' },
    supabase: { enabled: false, url: '', serviceKey: '' },
    vercel: { enabled: false, token: '' },
    railway: { enabled: false, token: '' },
    slack: { enabled: false, botToken: '', teamId: '' },
    gmail: { enabled: false },
    cloudflare: { enabled: false, apiToken: '', accountId: '' },
    netlify: { enabled: false, token: '' },
    stripe: { enabled: false, secretKey: '' },
    custom: [] as any[],
  },
  skills: { installed: [] as string[], enabled: [] as string[] },
  ui: { theme: 'system', fontSize: 'medium', sidebarOpen: true },
  telegram: { enabled: false, runOnStartup: false },
}
```

## src/pages/Settings.tsx structure

Build a tabbed settings page with these tabs:

### Tab 1: API Keys
- Section "AI Models": Anthropic, OpenAI, Gemini, Groq, Ollama URL
- Section "Search": Tavily, Serper, Brave, Firecrawl
- Section "Other": ElevenLabs, NanoBrowser
- Each key: label + password input + test button + status badge

### Tab 2: Models
- Default model dropdown (grouped by provider)
- Fallback model dropdown
- Temperature slider (0.0 → 1.0)
- Max tokens input

### Tab 3: Integrations (MCPs)
- Card per MCP (GitHub, Supabase, Vercel, Railway, Slack, Gmail, Cloudflare, Netlify, Stripe)
- Each card: toggle enable, API key input, connect button, status dot

### Tab 4: Telegram
- Bot token input
- Allowed user ID input
- Start/stop bot toggle
- Status indicator (running / stopped)
- Instructions link to BotFather

### Tab 5: Appearance
- Theme: System / Light / Dark
- Font size: Small / Medium / Large
- Sidebar default open/closed

## Testing Phase 2
1. All API key fields save on blur
2. Keys persist after app restart
3. Test button shows green tick / red error
4. Model dropdown shows all available models
5. Config file at `~/Library/Application Support/macvis/config.json` exists and is correct

---

# Phase 3 — Tool System (Computer Use)

## Goal
Give the agent full access to the Mac:
bash execution, filesystem, browser automation, web search, and screen capture.

## Dependencies
```bash
pnpm add playwright node-pty
pnpm add @playwright/browser-chromium
```

## Tools to implement

### electron/core/tools/BashTool.ts

```typescript
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const BashTool = {
  definition: {
    name: 'bash',
    description: 'Execute a bash command on the Mac. Use for any system operations, running scripts, installing packages, git operations, etc.',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The bash command to run' },
        cwd: { type: 'string', description: 'Working directory (optional)' },
        timeout: { type: 'number', description: 'Timeout in ms (default 30000)' },
      },
      required: ['command'],
    },
  },

  async execute({ command, cwd, timeout = 30000 }: any) {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: cwd || process.env.HOME,
        timeout,
        maxBuffer: 1024 * 1024 * 10, // 10MB
      })
      return stdout + (stderr ? `\nSTDERR: ${stderr}` : '')
    } catch (err: any) {
      return `Error: ${err.message}\n${err.stderr || ''}`
    }
  },
}
```

### electron/core/tools/FilesystemTool.ts

```typescript
import fs from 'fs/promises'
import path from 'path'
import { glob } from 'glob'

export const FilesystemTool = {
  definition: {
    name: 'filesystem',
    description: 'Read, write, list, delete, and manage files and directories on the Mac.',
    input_schema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['read', 'write', 'append', 'delete', 'list', 'exists', 'mkdir', 'glob'],
        },
        path: { type: 'string' },
        content: { type: 'string' },
        pattern: { type: 'string' },
      },
      required: ['operation', 'path'],
    },
  },

  async execute({ operation, path: filePath, content, pattern }: any) {
    const resolved = filePath.replace('~', process.env.HOME || '')

    switch (operation) {
      case 'read':
        return await fs.readFile(resolved, 'utf-8')
      case 'write':
        await fs.mkdir(path.dirname(resolved), { recursive: true })
        await fs.writeFile(resolved, content || '')
        return `Written: ${resolved}`
      case 'append':
        await fs.appendFile(resolved, content || '')
        return `Appended to: ${resolved}`
      case 'delete':
        await fs.rm(resolved, { recursive: true, force: true })
        return `Deleted: ${resolved}`
      case 'list':
        const entries = await fs.readdir(resolved, { withFileTypes: true })
        return entries.map(e => `${e.isDirectory() ? '[DIR]' : '[FILE]'} ${e.name}`).join('\n')
      case 'exists':
        try { await fs.access(resolved); return 'true' } catch { return 'false' }
      case 'mkdir':
        await fs.mkdir(resolved, { recursive: true })
        return `Created: ${resolved}`
      case 'glob':
        const files = await glob(pattern || '**/*', { cwd: resolved })
        return files.join('\n')
    }
  },
}
```

### electron/core/tools/BrowserTool.ts

```typescript
import { chromium, Browser, Page } from 'playwright'

let browser: Browser | null = null
let page: Page | null = null

export const BrowserTool = {
  definition: {
    name: 'browser',
    description: 'Control a web browser. Navigate, click, fill forms, take screenshots, scrape content.',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['navigate', 'click', 'fill', 'screenshot', 'content', 'close', 'evaluate'],
        },
        url: { type: 'string' },
        selector: { type: 'string' },
        value: { type: 'string' },
        script: { type: 'string' },
      },
      required: ['action'],
    },
  },

  async execute({ action, url, selector, value, script }: any) {
    if (!browser) {
      browser = await chromium.launch({ headless: false })
    }
    if (!page) {
      page = await browser.newPage()
    }

    switch (action) {
      case 'navigate':
        await page.goto(url, { waitUntil: 'domcontentloaded' })
        return `Navigated to: ${url}`
      case 'click':
        await page.click(selector)
        return `Clicked: ${selector}`
      case 'fill':
        await page.fill(selector, value)
        return `Filled: ${selector}`
      case 'content':
        return await page.content()
      case 'screenshot':
        const buf = await page.screenshot({ type: 'png', fullPage: true })
        return `data:image/png;base64,${buf.toString('base64')}`
      case 'evaluate':
        const result = await page.evaluate(script)
        return JSON.stringify(result)
      case 'close':
        await browser.close()
        browser = null
        page = null
        return 'Browser closed'
    }
  },
}
```

### electron/core/tools/WebSearchTool.ts

```typescript
export const WebSearchTool = {
  definition: {
    name: 'web_search',
    description: 'Search the web for current information.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        num_results: { type: 'number', description: 'Number of results (default 5)' },
      },
      required: ['query'],
    },
  },

  async execute({ query, num_results = 5 }: any, config: any) {
    const tavilyKey = config.get('apiKeys.tavily')
    const serperKey = config.get('apiKeys.serper')
    const braveKey = config.get('apiKeys.brave')

    // Try Tavily first, then Serper, then Brave
    if (tavilyKey) {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: tavilyKey, query, max_results: num_results }),
      })
      const data = await res.json() as any
      return data.results?.map((r: any) => `${r.title}\n${r.url}\n${r.content}`).join('\n\n')
    }

    if (serperKey) {
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-KEY': serperKey },
        body: JSON.stringify({ q: query, num: num_results }),
      })
      const data = await res.json() as any
      return data.organic?.map((r: any) => `${r.title}\n${r.link}\n${r.snippet}`).join('\n\n')
    }

    return 'No search API key configured. Add Tavily, Serper, or Brave key in Settings.'
  },
}
```

### electron/core/tools/index.ts

```typescript
import { BashTool } from './BashTool'
import { FilesystemTool } from './FilesystemTool'
import { BrowserTool } from './BrowserTool'
import { WebSearchTool } from './WebSearchTool'
import { ConfigStore } from '../config/ConfigStore'

const TOOLS = [BashTool, FilesystemTool, BrowserTool, WebSearchTool]

export function getToolDefinitions() {
  return TOOLS.map(t => t.definition)
}

export async function executeTool(name: string, input: any, config: ConfigStore) {
  const tool = TOOLS.find(t => t.definition.name === name)
  if (!tool) return `Unknown tool: ${name}`
  return await (tool.execute as any)(input, config)
}
```

## Testing Phase 3
1. Agent can run `ls ~/Desktop` via bash tool
2. Agent can read and write files
3. Agent can open a browser and navigate to google.com
4. Agent can search the web (requires at least one search key)
5. Tool call cards in UI show tool name, input, and result

---

# Phase 4 — MCP Manager

## Goal
Spawn, manage, and communicate with MCP servers as child processes.
Each MCP becomes a set of additional tools available to the agent.

## Dependencies
```bash
pnpm add @modelcontextprotocol/sdk
```

## electron/core/mcp/MCPRegistry.ts

```typescript
export interface MCPDefinition {
  name: string
  displayName: string
  description: string
  command: string
  args: string[]
  envKeys: string[]  // config keys needed as env vars
  category: 'deployment' | 'database' | 'comms' | 'payments' | 'custom'
}

export const MCP_REGISTRY: MCPDefinition[] = [
  {
    name: 'github',
    displayName: 'GitHub',
    description: 'Manage repos, PRs, issues, actions',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    envKeys: ['GITHUB_PERSONAL_ACCESS_TOKEN'],
    category: 'deployment',
  },
  {
    name: 'supabase',
    displayName: 'Supabase',
    description: 'Database, auth, storage, edge functions',
    command: 'npx',
    args: ['-y', '@supabase/mcp-server-supabase', '--access-token', '{{token}}'],
    envKeys: ['SUPABASE_ACCESS_TOKEN'],
    category: 'database',
  },
  {
    name: 'vercel',
    displayName: 'Vercel',
    description: 'Deploy projects, manage domains and env vars',
    command: 'npx',
    args: ['-y', '@vercel/mcp-adapter'],
    envKeys: ['VERCEL_TOKEN'],
    category: 'deployment',
  },
  {
    name: 'railway',
    displayName: 'Railway',
    description: 'Deploy services, manage databases',
    command: 'npx',
    args: ['-y', 'mcp-server-railway'],
    envKeys: ['RAILWAY_TOKEN'],
    category: 'deployment',
  },
  {
    name: 'cloudflare',
    displayName: 'Cloudflare',
    description: 'DNS, Workers, Pages, R2 storage',
    command: 'npx',
    args: ['-y', '@cloudflare/mcp-server-cloudflare'],
    envKeys: ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'],
    category: 'deployment',
  },
  {
    name: 'netlify',
    displayName: 'Netlify',
    description: 'Deploy sites, manage forms and functions',
    command: 'npx',
    args: ['-y', 'netlify-mcp'],
    envKeys: ['NETLIFY_AUTH_TOKEN'],
    category: 'deployment',
  },
  {
    name: 'slack',
    displayName: 'Slack',
    description: 'Send messages, read channels, manage workspace',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-slack'],
    envKeys: ['SLACK_BOT_TOKEN', 'SLACK_TEAM_ID'],
    category: 'comms',
  },
  {
    name: 'gmail',
    displayName: 'Gmail + Calendar',
    description: 'Read/send email, manage calendar events',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-gmail'],
    envKeys: [],
    category: 'comms',
  },
  {
    name: 'stripe',
    displayName: 'Stripe',
    description: 'Manage payments, customers, subscriptions',
    command: 'npx',
    args: ['-y', 'stripe-mcp', '--tools=all'],
    envKeys: ['STRIPE_SECRET_KEY'],
    category: 'payments',
  },
  {
    name: 'postgres',
    displayName: 'PostgreSQL',
    description: 'Query any Postgres database directly',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres', '{{connectionString}}'],
    envKeys: ['POSTGRES_CONNECTION_STRING'],
    category: 'database',
  },
  {
    name: 'filesystem',
    displayName: 'Filesystem (extended)',
    description: 'Extended file operations via MCP protocol',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/'],
    envKeys: [],
    category: 'custom',
  },
]
```

## electron/core/mcp/MCPManager.ts

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { MCP_REGISTRY, MCPDefinition } from './MCPRegistry'
import { ConfigStore } from '../config/ConfigStore'
import { getMainWindow } from '../../main'

interface ActiveMCP {
  client: Client
  transport: StdioClientTransport
  tools: any[]
  definition: MCPDefinition
}

export class MCPManager {
  private static instance: MCPManager
  private active = new Map<string, ActiveMCP>()

  static getInstance() {
    if (!MCPManager.instance) MCPManager.instance = new MCPManager()
    return MCPManager.instance
  }

  async connect(name: string): Promise<void> {
    const config = ConfigStore.getInstance()
    const def = MCP_REGISTRY.find(m => m.name === name)
    if (!def) throw new Error(`Unknown MCP: ${name}`)

    // Build env from config keys
    const env: Record<string, string> = { ...process.env } as any
    for (const envKey of def.envKeys) {
      const configKey = this.envKeyToConfigKey(name, envKey)
      const val = config.get(configKey)
      if (val) env[envKey] = val
    }

    const transport = new StdioClientTransport({
      command: def.command,
      args: def.args,
      env,
    })

    const client = new Client({ name: 'macvis', version: '1.0.0' }, { capabilities: {} })

    await client.connect(transport)

    // Fetch available tools from this MCP
    const { tools } = await client.listTools()

    this.active.set(name, { client, transport, tools, definition: def })

    this.emitStatus(name, 'connected')
    console.log(`MCP connected: ${name} (${tools.length} tools)`)
  }

  async disconnect(name: string): Promise<void> {
    const mcp = this.active.get(name)
    if (!mcp) return
    await mcp.transport.close()
    this.active.delete(name)
    this.emitStatus(name, 'disconnected')
  }

  async callTool(mcpName: string, toolName: string, args: any): Promise<any> {
    const mcp = this.active.get(mcpName)
    if (!mcp) throw new Error(`MCP not connected: ${mcpName}`)
    const result = await mcp.client.callTool({ name: toolName, arguments: args })
    return result.content
  }

  getAllTools(): any[] {
    const tools: any[] = []
    for (const [name, mcp] of this.active) {
      for (const tool of mcp.tools) {
        tools.push({
          name: `${name}__${tool.name}`,
          description: `[${mcp.definition.displayName}] ${tool.description}`,
          input_schema: tool.inputSchema,
        })
      }
    }
    return tools
  }

  listConnected(): string[] {
    return Array.from(this.active.keys())
  }

  async connectAllEnabled(): Promise<void> {
    const config = ConfigStore.getInstance()
    for (const def of MCP_REGISTRY) {
      const enabled = config.get(`mcps.${def.name}.enabled`)
      if (enabled) {
        try {
          await this.connect(def.name)
        } catch (err) {
          console.error(`Failed to connect MCP ${def.name}:`, err)
        }
      }
    }
  }

  private envKeyToConfigKey(mcpName: string, envKey: string): string {
    const map: Record<string, string> = {
      GITHUB_PERSONAL_ACCESS_TOKEN: `mcps.github.token`,
      SUPABASE_ACCESS_TOKEN: `mcps.supabase.serviceKey`,
      VERCEL_TOKEN: `mcps.vercel.token`,
      RAILWAY_TOKEN: `mcps.railway.token`,
      SLACK_BOT_TOKEN: `mcps.slack.botToken`,
      SLACK_TEAM_ID: `mcps.slack.teamId`,
      CLOUDFLARE_API_TOKEN: `mcps.cloudflare.apiToken`,
      CLOUDFLARE_ACCOUNT_ID: `mcps.cloudflare.accountId`,
      NETLIFY_AUTH_TOKEN: `mcps.netlify.token`,
      STRIPE_SECRET_KEY: `mcps.stripe.secretKey`,
    }
    return map[envKey] || `mcps.${mcpName}.token`
  }

  private emitStatus(name: string, status: string) {
    getMainWindow()?.webContents.send('mcp:status', { name, status })
  }
}
```

## electron/core/agent/ToolBuilder.ts

```typescript
import { getToolDefinitions } from '../tools'
import { MCPManager } from '../mcp/MCPManager'

export class ToolBuilder {
  static async buildAll(config: any): Promise<any[]> {
    // Native tools (bash, filesystem, browser, search)
    const native = getToolDefinitions()

    // MCP tools (all connected MCPs)
    const mcpTools = MCPManager.getInstance().getAllTools()

    return [...native, ...mcpTools]
  }
}
```

## Update AgentLoop to handle MCP tool calls

In `AgentLoop.ts`, update `executeTool` call to handle MCP tools:

```typescript
// In the tool execution loop, check if it's an MCP tool
if (toolUse.name.includes('__')) {
  const [mcpName, toolName] = toolUse.name.split('__')
  result = await MCPManager.getInstance().callTool(mcpName, toolName, toolUse.input)
} else {
  result = await executeTool(toolUse.name, toolUse.input, config)
}
```

## Testing Phase 4
1. Enable GitHub MCP in settings with a token
2. Ask agent: "list my GitHub repos"
3. Agent should call the GitHub MCP tool and return repos
4. Enable Vercel MCP and ask: "list my Vercel projects"
5. MCP status dots show green/red in settings
