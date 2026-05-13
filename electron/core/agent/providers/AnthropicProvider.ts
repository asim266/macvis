import Anthropic from '@anthropic-ai/sdk'
import type { ChatProvider, StreamOptions, StreamHandlers, FinalMessage, ContentBlock, ToolUseResult } from './types'

export class AnthropicProvider implements ChatProvider {
  readonly name = 'anthropic'

  async stream(opts: StreamOptions, handlers: StreamHandlers): Promise<FinalMessage> {
    const client = new Anthropic({ apiKey: opts.apiKey })

    // Anthropic messages already match our common format — just need to convert content arrays
    const messages = opts.messages.map(m => {
      if (typeof m.content === 'string') {
        return { role: m.role, content: m.content }
      }
      // Map content blocks to Anthropic's format (they're already compatible)
      return { role: m.role, content: m.content as any }
    })

    const stream = await client.messages.stream({
      model: opts.model,
      max_tokens: opts.maxTokens || 8192,
      system: opts.system,
      tools: opts.tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema,
      })),
      messages: messages as any,
    })

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        handlers.onText(chunk.delta.text)
      }
      if (chunk.type === 'content_block_start' && chunk.content_block.type === 'tool_use') {
        const tb = chunk.content_block
        handlers.onToolStart(tb.id, tb.name, {})
      }
    }

    const final = await stream.finalMessage()
    const content: ContentBlock[] = []
    const toolUses: ToolUseResult[] = []
    let text = ''

    for (const block of final.content) {
      if (block.type === 'text') {
        content.push({ type: 'text', text: block.text })
        text += block.text
      } else if (block.type === 'tool_use') {
        content.push({ type: 'tool_use', id: block.id, name: block.name, input: block.input })
        toolUses.push({ id: block.id, name: block.name, input: block.input })
      }
    }

    return {
      content,
      toolUses,
      text,
      stopReason: final.stop_reason === 'tool_use' ? 'tool_use' :
                  final.stop_reason === 'max_tokens' ? 'max_tokens' : 'end_turn',
      raw: final,
    }
  }
}
