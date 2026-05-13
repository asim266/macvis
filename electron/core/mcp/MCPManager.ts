import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { ConfigStore } from '../config/ConfigStore'
import { getMainWindow } from '../../main'
import { MCP_REGISTRY, findServer, type MCPServerDef } from './MCPRegistry'

export interface CustomMCP {
  id: string
  name: string
  command: string
  args: string[]
  env?: Record<string, string>
}

export interface ActiveMCP {
  id: string
  name: string
  client: Client
  transport: StdioClientTransport
  tools: any[]  // MCP tool definitions
  status: 'connecting' | 'connected' | 'error'
  error?: string
}

export interface MCPStatusInfo {
  id: string
  name: string
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  toolCount: number
  error?: string
}

const RESERVED_ENV_KEYS = new Set([
  'PATH', 'HOME', 'USER', 'SHELL', 'PWD',
])

// Substitute {{configKey}} in args and env with actual config values
function substitute(value: string, config: ConfigStore, def: MCPServerDef): string {
  return value.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    // If a placeholder exists, look it up in def.inputs to find the corresponding configKey
    const input = (def.inputs || []).find(i =>
      i.configKey.endsWith(`.${key}`) || i.label.toLowerCase().replace(/\s+/g, '') === key.toLowerCase()
    )
    if (input) {
      const v = config.get(input.configKey)
      return v ? String(v) : ''
    }
    // Otherwise treat the placeholder itself as a config path
    const v = config.get(key)
    return v ? String(v) : ''
  })
}

function buildEnv(def: MCPServerDef, config: ConfigStore): Record<string, string> {
  const env: Record<string, string> = {}
  // Inherit useful parent env (PATH especially — for npx, uvx, etc.)
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string') env[k] = v
  }
  // Apply per-server env mappings
  if (def.env) {
    for (const [envKey, configKey] of Object.entries(def.env)) {
      const val = config.get(configKey)
      if (val) env[envKey] = String(val)
    }
  }
  return env
}

export class MCPManager {
  private static instance: MCPManager
  private active = new Map<string, ActiveMCP>()

  static getInstance(): MCPManager {
    if (!MCPManager.instance) MCPManager.instance = new MCPManager()
    return MCPManager.instance
  }

  /** List all known servers (registry + custom) with their current status */
  list(): MCPStatusInfo[] {
    const config = ConfigStore.getInstance()
    const customs = (config.get('mcps.custom') as CustomMCP[]) || []
    const result: MCPStatusInfo[] = []

    for (const def of MCP_REGISTRY) {
      const active = this.active.get(def.id)
      result.push({
        id: def.id,
        name: def.name,
        status: active?.status || 'disconnected',
        toolCount: active?.tools.length || 0,
        error: active?.error,
      })
    }

    for (const c of customs) {
      const active = this.active.get(c.id)
      result.push({
        id: c.id,
        name: c.name,
        status: active?.status || 'disconnected',
        toolCount: active?.tools.length || 0,
        error: active?.error,
      })
    }

    return result
  }

  isConnected(id: string): boolean {
    return this.active.get(id)?.status === 'connected'
  }

  async connect(id: string): Promise<{ ok: boolean; toolCount?: number; error?: string }> {
    if (this.active.has(id)) {
      const a = this.active.get(id)!
      if (a.status === 'connected') return { ok: true, toolCount: a.tools.length }
    }

    const config = ConfigStore.getInstance()
    const def = findServer(id)
    let command: string
    let args: string[]
    let env: Record<string, string>
    let displayName: string

    if (def) {
      command = def.command
      args = def.args.map(a => substitute(a, config, def))
      env = buildEnv(def, config)
      displayName = def.name
    } else {
      // Custom MCP from config
      const customs = (config.get('mcps.custom') as CustomMCP[]) || []
      const custom = customs.find(c => c.id === id)
      if (!custom) return { ok: false, error: `MCP not found: ${id}` }
      command = custom.command
      args = custom.args
      env = { ...(process.env as any), ...(custom.env || {}) }
      displayName = custom.name
    }

    this.emitStatus(id, displayName, 'connecting', 0)

    try {
      const transport = new StdioClientTransport({
        command,
        args,
        env,
      })

      const client = new Client(
        { name: 'macvis', version: '0.1.0' },
        { capabilities: {} }
      )

      // Add a generous timeout so a hanging MCP doesn't lock us up forever
      const connectPromise = client.connect(transport)
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out (30s)')), 30_000)
      )
      await Promise.race([connectPromise, timeout])

      const { tools } = await client.listTools()

      this.active.set(id, {
        id,
        name: displayName,
        client,
        transport,
        tools,
        status: 'connected',
      })

      this.emitStatus(id, displayName, 'connected', tools.length)
      // Persist enabled state
      config.set(`mcps.${id}.enabled`, true)
      return { ok: true, toolCount: tools.length }
    } catch (err: any) {
      const msg = err.message || String(err)
      console.error(`MCP connect failed (${id}):`, msg)
      this.active.set(id, {
        id,
        name: displayName,
        client: null as any,
        transport: null as any,
        tools: [],
        status: 'error',
        error: msg,
      })
      this.emitStatus(id, displayName, 'error', 0, msg)
      return { ok: false, error: msg }
    }
  }

  async disconnect(id: string): Promise<{ ok: boolean; error?: string }> {
    const mcp = this.active.get(id)
    if (!mcp) return { ok: true }
    try {
      if (mcp.transport) await mcp.transport.close()
    } catch (err) {
      console.error(`MCP disconnect error (${id}):`, err)
    }
    this.active.delete(id)
    const config = ConfigStore.getInstance()
    config.set(`mcps.${id}.enabled`, false)

    const def = findServer(id) || { name: id }
    this.emitStatus(id, (def as any).name || id, 'disconnected', 0)
    return { ok: true }
  }

  /** Auto-connect all MCPs marked enabled in config at app start */
  async connectAllEnabled(): Promise<void> {
    const config = ConfigStore.getInstance()
    for (const def of MCP_REGISTRY) {
      if (config.get(`mcps.${def.id}.enabled`)) {
        try {
          await this.connect(def.id)
        } catch (err) {
          console.error(`Auto-connect failed for ${def.id}:`, err)
        }
      }
    }
    const customs = (config.get('mcps.custom') as CustomMCP[]) || []
    for (const c of customs) {
      if (config.get(`mcps.${c.id}.enabled`)) {
        try {
          await this.connect(c.id)
        } catch (err) {
          console.error(`Auto-connect failed for ${c.id}:`, err)
        }
      }
    }
  }

  /** All tools from all connected MCPs, in our common tool format */
  getAllTools(): Array<{ name: string; description: string; input_schema: any }> {
    const tools: Array<{ name: string; description: string; input_schema: any }> = []
    for (const [mcpId, mcp] of this.active) {
      if (mcp.status !== 'connected') continue
      for (const t of mcp.tools) {
        tools.push({
          // Namespace tool names so we know which MCP owns them
          name: `${mcpId}__${t.name}`,
          description: `[${mcp.name}] ${t.description || ''}`.slice(0, 1024),
          input_schema: t.inputSchema || { type: 'object', properties: {} },
        })
      }
    }
    return tools
  }

  /** Execute a tool call against the right MCP */
  async callTool(namespacedName: string, args: any): Promise<string> {
    const sep = namespacedName.indexOf('__')
    if (sep < 0) throw new Error(`Tool name missing MCP namespace: ${namespacedName}`)
    const mcpId = namespacedName.slice(0, sep)
    const toolName = namespacedName.slice(sep + 2)

    const mcp = this.active.get(mcpId)
    if (!mcp || mcp.status !== 'connected') {
      throw new Error(`MCP not connected: ${mcpId}`)
    }

    const result = await mcp.client.callTool({ name: toolName, arguments: args })
    // result.content is an array of content blocks (text, image, etc.) — flatten to string
    if (Array.isArray(result.content)) {
      return result.content
        .map((c: any) => {
          if (c.type === 'text') return c.text
          if (c.type === 'image') return '[image]'
          return JSON.stringify(c)
        })
        .join('\n')
    }
    return JSON.stringify(result)
  }

  /** Install a custom MCP from a free-form command */
  async installCustom(opts: { name: string; command: string; args: string[]; env?: Record<string, string> }): Promise<{ id: string }> {
    const config = ConfigStore.getInstance()
    const id = `custom-${opts.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString(36)}`
    const customs = (config.get('mcps.custom') as CustomMCP[]) || []
    customs.push({ id, name: opts.name, command: opts.command, args: opts.args, env: opts.env })
    config.set('mcps.custom', customs)
    return { id }
  }

  async uninstallCustom(id: string): Promise<void> {
    await this.disconnect(id)
    const config = ConfigStore.getInstance()
    const customs = (config.get('mcps.custom') as CustomMCP[]) || []
    config.set('mcps.custom', customs.filter(c => c.id !== id))
    config.set(`mcps.${id}.enabled`, false)
  }

  private emitStatus(id: string, name: string, status: MCPStatusInfo['status'], toolCount: number, error?: string) {
    getMainWindow()?.webContents.send('mcp:status', { id, name, status, toolCount, error })
  }
}

// Helper used by RESERVED_ENV_KEYS - reference it to avoid unused-export warning
void RESERVED_ENV_KEYS
