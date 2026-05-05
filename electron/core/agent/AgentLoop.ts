import Anthropic from '@anthropic-ai/sdk'
import { getMainWindow } from '../../main'
import { ConfigStore } from '../config/ConfigStore'
import { ToolBuilder } from './ToolBuilder'
import { executeTool } from '../tools'

export class AgentLoop {
  private running = new Map<string, boolean>()

  async run(message: string, sessionId: string) {
    const config = ConfigStore.getInstance()
    const apiKey = config.get('apiKeys.anthropic') as string

    if (!apiKey) {
      this.emit('agent:error', { error: 'No Anthropic API key set. Go to Settings.', sessionId })
      return
    }

    this.running.set(sessionId, true)
    const client = new Anthropic({ apiKey })
    const tools = await ToolBuilder.buildAll(config)
    let messages: any[] = [{ role: 'user', content: message }]

    try {
      while (this.running.get(sessionId)) {
        const stream = await client.messages.stream({
          model: (config.get('models.default') as string) || 'claude-opus-4-5',
          max_tokens: 8096,
          tools,
          messages,
        })

        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            this.emit('agent:stream', { type: 'text', content: chunk.delta.text, sessionId })
          }
          if (chunk.type === 'content_block_start' && chunk.content_block.type === 'tool_use') {
            this.emit('agent:tool', { name: chunk.content_block.name, status: 'running', sessionId })
          }
        }

        const finalMessage = await stream.finalMessage()

        if (finalMessage.stop_reason !== 'tool_use') {
          break
        }

        const toolUseBlocks = finalMessage.content.filter(b => b.type === 'tool_use') as any[]
        const toolResults = []

        for (const toolUse of toolUseBlocks) {
          this.emit('agent:tool', { name: toolUse.name, input: toolUse.input, status: 'running', sessionId })

          const result = await executeTool(toolUse.name, toolUse.input, config)

          this.emit('agent:tool', { name: toolUse.name, result, status: 'done', sessionId })

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: typeof result === 'string' ? result : JSON.stringify(result),
          })
        }

        messages = [
          ...messages,
          { role: 'assistant', content: finalMessage.content },
          { role: 'user', content: toolResults },
        ]
      }
    } catch (err: any) {
      this.emit('agent:error', { error: err.message, sessionId })
    } finally {
      this.running.delete(sessionId)
      this.emit('agent:done', { sessionId })
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
