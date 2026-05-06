import Anthropic from '@anthropic-ai/sdk'
import { getMainWindow } from '../../main'
import { ConfigStore } from '../config/ConfigStore'
import { ToolBuilder } from './ToolBuilder'
import { executeTool } from '../tools'
import { SessionStore, type PersistedMessage, type PersistedSession } from '../sessions/SessionStore'
import { ProjectManager } from '../projects/ProjectManager'
import os from 'os'

const DEFAULT_MODEL = 'claude-opus-4-5'

function buildSystemPrompt(): string {
  const home = os.homedir()
  return `You are MacVis — a local-first AI assistant running natively on the user's macOS machine. You have full access to bash, the filesystem, and web search. Be concise and direct.

# Workspace conventions

When the user asks you to create a code project, ALWAYS create it inside:
${ProjectManager.projectsDir}/<project-name>/

Never create code projects in the home directory or arbitrary locations. The user has a Projects view in the app that scans this directory — projects placed there will appear automatically with run/open/delete controls.

For one-off scripts or experiments, you may use ${home} or /tmp.

# Memory

You have access to the full conversation history in this session. Reference what you've already done — files you created, commands you ran, decisions made. Do not say "I haven't created anything yet" if you can see prior tool calls in the conversation.

# Style

- Use markdown for formatting
- Keep responses tight; expand only when asked
- When you create files, mention the absolute path
- When you run commands, briefly explain what they do
- Never refuse a task without trying first
`
}

export class AgentLoop {
  private running = new Map<string, boolean>()

  async run(message: string, sessionId: string) {
    const config = ConfigStore.getInstance()
    const apiKey = config.get('apiKeys.anthropic') as string

    if (!apiKey) {
      this.emit('agent:error', { error: 'No Anthropic API key set. Go to Settings.', sessionId })
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

    // Append user message to session
    const userMsg: PersistedMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: message,
      timestamp: Date.now(),
    }
    session.messages.push(userMsg)
    session.updatedAt = Date.now()
    SessionStore.save(session)

    // Build messages for the API from full session history
    const apiMessages: any[] = []
    for (const m of session.messages) {
      if (m.role === 'user' && !m.toolResults) {
        apiMessages.push({ role: 'user', content: m.content })
      } else if (m.role === 'user' && m.toolResults) {
        // synthetic tool-result user message
        apiMessages.push({ role: 'user', content: m.toolResults })
      } else if (m.role === 'assistant' && m.apiBlocks) {
        apiMessages.push({ role: 'assistant', content: m.apiBlocks })
      } else if (m.role === 'assistant') {
        apiMessages.push({ role: 'assistant', content: m.content || ' ' })
      }
    }

    const client = new Anthropic({ apiKey })
    const tools = await ToolBuilder.buildAll(config)
    const systemPrompt = buildSystemPrompt()

    let assistantMsg: PersistedMessage | null = null

    try {
      while (this.running.get(sessionId)) {
        // Create the assistant message slot for this turn (one per loop iteration)
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

        const stream = await client.messages.stream({
          model: (config.get('models.default') as string) || DEFAULT_MODEL,
          max_tokens: 8096,
          system: systemPrompt,
          tools,
          messages: apiMessages,
        })

        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            this.emit('agent:stream', { type: 'text', content: chunk.delta.text, sessionId })
            assistantMsg!.content += chunk.delta.text
            SessionStore.save(session)
          }
        }

        const finalMessage = await stream.finalMessage()
        assistantMsg.apiBlocks = finalMessage.content
        // Re-derive content from text blocks (more accurate)
        assistantMsg.content = finalMessage.content
          .filter((b: any) => b.type === 'text')
          .map((b: any) => b.text)
          .join('')

        // Push to API messages array for next iteration
        apiMessages.push({ role: 'assistant', content: finalMessage.content })

        if (finalMessage.stop_reason !== 'tool_use') {
          await SessionStore.saveNow(session)
          break
        }

        // Execute tool calls
        const toolUseBlocks = finalMessage.content.filter((b: any) => b.type === 'tool_use') as any[]
        const toolResults: { type: 'tool_result'; tool_use_id: string; content: string }[] = []

        for (const toolUse of toolUseBlocks) {
          // Add to assistant message's toolCalls list (for UI)
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

          // Update tool call in session
          const tc = assistantMsg.toolCalls!.find(t => t.id === toolUse.id)
          if (tc) {
            tc.result = resultStr
            tc.status = 'done'
          }

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

        // Append tool results as a synthetic user message in session and api array
        const toolResultMsg: PersistedMessage = {
          id: `msg_${Date.now()}_tr`,
          role: 'user',
          content: '',
          toolResults,
          timestamp: Date.now(),
        }
        session.messages.push(toolResultMsg)
        apiMessages.push({ role: 'user', content: toolResults })
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
