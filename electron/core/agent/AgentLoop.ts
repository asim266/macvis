import { getMainWindow } from '../../main'
import { ConfigStore } from '../config/ConfigStore'
import { ToolBuilder } from './ToolBuilder'
import { executeTool } from '../tools'
import { SessionStore, type PersistedMessage } from '../sessions/SessionStore'
import { ProjectManager } from '../projects/ProjectManager'
import { getProvider, parseProviderModel, type ProviderName } from './providers'
import type { CommonMessage, ContentBlock, FinalMessage } from './providers/types'
import os from 'os'

const DEFAULT_CHAIN_FALLBACK = 'anthropic:claude-opus-4-5'

const PROVIDER_KEY_PATH: Record<ProviderName, string> = {
  anthropic: 'apiKeys.anthropic',
  openai: 'apiKeys.openai',
  openrouter: 'apiKeys.openrouter',
  gemini: 'apiKeys.gemini',
  groq: 'apiKeys.groq',
  ollama: 'apiKeys.ollama',
}

function buildSystemPrompt(connectedMCPs: string[] = []): string {
  const home = os.homedir()
  const mcpSection = connectedMCPs.length > 0
    ? `# Active MCP integrations

The following MCP servers are connected and authenticated. Their tools are available to you with the naming convention \`<service>__<action>\` (double underscore). These are NOT generic API stubs — they route through live, authenticated MCP servers that the user has already configured with their tokens.

Connected: ${connectedMCPs.map(m => `**${m}**`).join(', ')}

**When the user asks about a service that's connected via MCP, ALWAYS prefer the \`<service>__*\` tools over running bash with a CLI (\`gh\`, \`vercel\`, \`supabase\`, etc.).** The MCP tools are already authenticated; bash CLIs may not be installed or signed in.

For example, if GitHub is connected:
- ✅ Use \`github__search_repositories\`, \`github__create_issue\`, \`github__push_files\`
- ❌ Don't fall back to \`gh repo list\` or \`gh issue create\` via bash

Only fall back to bash for a connected service if the specific MCP tool you need doesn't exist.

## Identifying the user on an MCP service

**The macOS system username is NOT the same as the user authenticated to an MCP service.** Don't ever assume \`whoami\` (e.g. the macOS login name) equals the GitHub/Vercel/Supabase/etc. account username.

When the user says "my repos", "my deployments", "my projects", or anything that implies "the account I'm signed in to on this service":

1. **Look at your actual tool list** for the connected service. Find a tool that returns identity info without requiring a username parameter. Different MCP servers use different names:
   - It might be \`<service>__get_me\`, \`<service>__whoami\`, \`<service>__current_user\`, \`<service>__list_teams\`, \`<service>__list_my_repositories\`, etc.
   - Do NOT call a tool name unless it's actually in your available tool list.
2. **If a no-arg "list mine" tool exists** (e.g. \`<service>__list_deployments\`, \`<service>__list_projects\`), call it directly — it implicitly uses the auth context.
3. **If neither exists**, ASK the user for their username/account on that service. Don't guess based on the macOS login.
4. Once you know the username, use it for the actual query.

Examples:
- GitHub: many GitHub MCP variants don't expose a get-me tool. If you see one, use it. Otherwise ask the user for their GitHub login, then call \`github__search_repositories\` with \`query: "user:<login>"\`.
- Vercel: \`vercel__list_projects\` works without a username because it uses the OAuth token's account.
- Supabase: \`supabase__list_projects\` returns the auth'd org's projects.
`
    : ''

  return `You are MacVis — a local-first AI assistant running natively on the user's macOS machine. You have full access to bash, the filesystem, web search, and any MCP servers the user has connected. Be concise and direct.

# Workspace conventions

When the user asks you to create a code project, ALWAYS create it inside:
${ProjectManager.projectsDir}/<project-name>/

Never create code projects in the home directory or arbitrary locations. The user has a Projects view in the app that scans this directory — projects placed there will appear automatically with run/open/delete controls.

For one-off scripts or experiments, you may use ${home} or /tmp.

${mcpSection}# Memory

You have access to the full conversation history in this session. Reference what you've already done — files you created, commands you ran, decisions made. Do not say "I haven't created anything yet" if you can see prior tool calls in the conversation.

# Style

- Use markdown for formatting
- Keep responses tight; expand only when asked
- When you create files, mention the absolute path
- When you run commands, briefly explain what they do
- Never refuse a task without trying first
`
}

// Build the fallback chain — list of [provider, model] to try in order.
function resolveChain(config: ConfigStore): Array<{ provider: ProviderName; model: string }> {
  const chain: string[] = (config.get('models.chain') as string[]) || []
  const resolved: Array<{ provider: ProviderName; model: string }> = []

  for (const slot of chain) {
    if (!slot) continue
    const parsed = parseProviderModel(slot)
    if (parsed) resolved.push(parsed)
  }

  // Fallback: use the legacy models.default + models.provider
  if (resolved.length === 0) {
    const provider = (config.get('models.provider') as ProviderName) || 'anthropic'
    const model = (config.get('models.default') as string) || 'claude-opus-4-5'
    const parsed = parseProviderModel(`${provider}:${model}`) || parseProviderModel(DEFAULT_CHAIN_FALLBACK)!
    resolved.push(parsed)
  }

  return resolved
}

export class AgentLoop {
  private running = new Map<string, boolean>()

  async run(message: string, sessionId: string) {
    const config = ConfigStore.getInstance()
    const chain = resolveChain(config)

    // Verify at least one provider has a key set
    const usableChain = chain.filter(c => {
      if (c.provider === 'ollama') return true
      const key = config.get(PROVIDER_KEY_PATH[c.provider]) as string
      return !!key
    })

    if (usableChain.length === 0) {
      this.emit('agent:error', {
        error: 'No API keys configured for any model in your fallback chain. Go to Settings → Chat API Keys.',
        sessionId,
      })
      this.emit('agent:done', { sessionId })
      return
    }

    this.running.set(sessionId, true)

    // Load or create persisted session
    let session = await SessionStore.load(sessionId)
    if (!session) {
      session = {
        id: sessionId,
        title: message.slice(0, 50),
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    }
    if (!session.title || session.title === 'New chat') {
      session.title = message.slice(0, 50)
    }

    const userMsg: PersistedMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: message,
      timestamp: Date.now(),
    }
    session.messages.push(userMsg)
    session.updatedAt = Date.now()
    SessionStore.save(session)

    // Build common-format messages from session history
    const apiMessages: CommonMessage[] = []
    for (const m of session.messages) {
      if (m.role === 'user' && !m.toolResults) {
        apiMessages.push({ role: 'user', content: m.content })
      } else if (m.role === 'user' && m.toolResults) {
        // Synthetic tool-result user message
        const content: ContentBlock[] = m.toolResults.map(tr => ({
          type: 'tool_result' as const,
          tool_use_id: tr.tool_use_id,
          content: tr.content,
        }))
        apiMessages.push({ role: 'user', content })
      } else if (m.role === 'assistant' && m.apiBlocks) {
        // Replay assistant blocks (text + tool_use)
        const content: ContentBlock[] = []
        for (const block of m.apiBlocks) {
          if (block.type === 'text') content.push({ type: 'text', text: block.text })
          else if (block.type === 'tool_use') {
            content.push({ type: 'tool_use', id: block.id, name: block.name, input: block.input })
          }
        }
        apiMessages.push({ role: 'assistant', content })
      } else if (m.role === 'assistant') {
        apiMessages.push({ role: 'assistant', content: m.content || ' ' })
      }
    }

    const tools = await ToolBuilder.buildAll(config)

    // Discover which MCPs are connected so we can mention them in the system prompt
    const { MCPManager } = await import('../mcp/MCPManager')
    const connectedMCPs = MCPManager.getInstance()
      .list()
      .filter(m => m.status === 'connected')
      .map(m => m.name)

    const systemPrompt = buildSystemPrompt(connectedMCPs)

    let assistantMsg: PersistedMessage | null = null

    try {
      while (this.running.get(sessionId)) {
        assistantMsg = {
          id: `msg_${Date.now()}_a`,
          role: 'assistant',
          content: '',
          toolCalls: [],
          apiBlocks: [],
          timestamp: Date.now(),
        }
        session.messages.push(assistantMsg)
        session.updatedAt = Date.now()
        SessionStore.save(session)

        // Try providers in fallback chain order
        let finalMsg: FinalMessage | null = null
        let lastErr: any = null
        let usedProvider: ProviderName | null = null
        let usedModel: string | null = null

        for (const slot of usableChain) {
          const apiKey = config.get(PROVIDER_KEY_PATH[slot.provider]) as string
          try {
            this.emit('agent:status', {
              sessionId,
              status: 'thinking',
              provider: slot.provider,
              model: slot.model,
            })

            const provider = getProvider(slot.provider)
            finalMsg = await provider.stream({
              apiKey: apiKey || '',
              model: slot.model,
              system: systemPrompt,
              messages: apiMessages,
              tools,
            }, {
              onText: (t) => {
                this.emit('agent:stream', { type: 'text', content: t, sessionId })
                assistantMsg!.content += t
                SessionStore.save(session!)
              },
              onToolStart: (id, name, input) => {
                this.emit('agent:tool', { id, name, input, status: 'running', sessionId })
              },
            })
            usedProvider = slot.provider
            usedModel = slot.model
            break  // success — exit fallback loop
          } catch (err: any) {
            lastErr = err
            console.error(`Provider ${slot.provider}/${slot.model} failed:`, err.message)
            // Clear any partial streamed text so the fallback gets a clean slate
            if (assistantMsg!.content) {
              this.emit('agent:stream', { type: 'reset', sessionId })
              assistantMsg!.content = ''
            }
            this.emit('agent:status', {
              sessionId,
              status: 'fallback',
              provider: slot.provider,
              model: slot.model,
              error: err.message,
            })
            // Try next provider in chain
            continue
          }
        }

        if (!finalMsg) {
          throw lastErr || new Error('All providers in the fallback chain failed.')
        }

        assistantMsg.apiBlocks = finalMsg.content
        assistantMsg.content = finalMsg.text

        // Emit which provider/model actually answered (for status bar)
        this.emit('agent:provider', { sessionId, provider: usedProvider, model: usedModel })

        // Push to API messages array for next iteration
        apiMessages.push({ role: 'assistant', content: finalMsg.content })

        if (finalMsg.stopReason !== 'tool_use' || finalMsg.toolUses.length === 0) {
          await SessionStore.saveNow(session)
          break
        }

        // Execute tools
        const toolResults: { type: 'tool_result'; tool_use_id: string; content: string }[] = []

        for (const toolUse of finalMsg.toolUses) {
          assistantMsg.toolCalls!.push({
            id: toolUse.id,
            name: toolUse.name,
            input: toolUse.input,
            status: 'running',
          })
          this.emit('agent:tool', {
            id: toolUse.id,
            name: toolUse.name,
            input: toolUse.input,
            status: 'running',
            sessionId,
          })

          let result: any
          try {
            result = await executeTool(toolUse.name, toolUse.input, config)
          } catch (err: any) {
            result = `Error: ${err.message || String(err)}`
          }

          const resultStr = typeof result === 'string' ? result : JSON.stringify(result)
          const tc = assistantMsg.toolCalls!.find(t => t.id === toolUse.id)
          if (tc) { tc.result = resultStr; tc.status = 'done' }

          this.emit('agent:tool', {
            id: toolUse.id,
            name: toolUse.name,
            input: toolUse.input,
            result: resultStr,
            status: 'done',
            sessionId,
          })

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: resultStr,
          })
        }

        SessionStore.save(session)

        const toolResultMsg: PersistedMessage = {
          id: `msg_${Date.now()}_tr`,
          role: 'user',
          content: '',
          toolResults,
          timestamp: Date.now(),
        }
        session.messages.push(toolResultMsg)

        // Add to apiMessages for next iteration
        const resultBlocks: ContentBlock[] = toolResults.map(tr => ({
          type: 'tool_result' as const,
          tool_use_id: tr.tool_use_id,
          content: tr.content,
        }))
        apiMessages.push({ role: 'user', content: resultBlocks })

        SessionStore.save(session)
      }
    } catch (err: any) {
      this.emit('agent:error', { error: err.message || String(err), sessionId })
      if (assistantMsg) {
        assistantMsg.content += `\n\n**Error:** ${err.message || String(err)}`
      }
      await SessionStore.saveNow(session)
    } finally {
      this.running.delete(sessionId)
      await SessionStore.saveNow(session)
      this.emit('agent:done', { sessionId, title: session.title })
    }
  }

  stop(sessionId: string) {
    this.running.set(sessionId, false)
  }

  private emit(channel: string, data: any) {
    getMainWindow()?.webContents.send(channel, data)
  }
}

export const agentLoop = new AgentLoop()
