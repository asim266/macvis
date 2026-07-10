import Anthropic from '@anthropic-ai/sdk'
import type { ChatProvider, StreamOptions, StreamHandlers, FinalMessage, ContentBlock, ToolUseResult } from './types'
import { modelSupportsEffort, normalizeEffort } from '../effort'

export class AnthropicProvider implements ChatProvider {
  readonly name = 'anthropic'

  async stream(opts: StreamOptions, handlers: StreamHandlers): Promise<FinalMessage> {
    const client = new Anthropic({ apiKey: opts.apiKey })

    // Anthropic messages already match our common format — just need to convert content arrays
    const messages = opts.messages.map(m => {
      if (typeof m.content === 'string') {
        return { role: m.role, content: m.content }
      }
      const blocks = m.content.map(b => {
        if (b.type === 'tool_result') {
          // tool_result.content may be a string or an array of text/image blocks
          if (typeof b.content === 'string') return b
          const inner = b.content.map(c =>
            c.type === 'image'
              ? { type: 'image', source: { type: 'base64', media_type: c.mimeType, data: c.data } }
              : { type: 'text', text: c.text }
          )
          return { type: 'tool_result', tool_use_id: b.tool_use_id, content: inner }
        }
        if (b.type === 'image') {
          return { type: 'image', source: { type: 'base64', media_type: (b as any).mimeType, data: (b as any).data } }
        }
        return b
      })
      return { role: m.role, content: blocks as any }
    })

    // Prompt caching: cache the (large) system prompt + tool definitions so the
    // stable prefix isn't re-billed/re-processed every turn. cache_control on the
    // last tool covers the whole tools array; system is sent as a cached block.
    const toolDefs = opts.tools.map((t, i) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
      ...(i === opts.tools.length - 1 ? { cache_control: { type: 'ephemeral' as const } } : {}),
    }))

    const params: any = {
      model: opts.model,
      max_tokens: opts.maxTokens || 8192,
      system: [{ type: 'text', text: opts.system, cache_control: { type: 'ephemeral' } }],
      tools: toolDefs,
      messages,
    }

    // Effort (output_config.effort) controls reasoning/agentic depth and token spend.
    // Only send it to models that accept it — Haiku 4.5 / Sonnet 4.5 / older 400 on it,
    // and Haiku is commonly the fast-route model, so gate strictly.
    if (opts.effort && modelSupportsEffort(opts.model)) {
      params.output_config = { effort: normalizeEffort(opts.effort) }
    }

    const stream = await client.messages.stream(params)

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

    const u = final.usage as any
    return {
      content,
      toolUses,
      text,
      stopReason: final.stop_reason === 'tool_use' ? 'tool_use' :
                  final.stop_reason === 'max_tokens' ? 'max_tokens' : 'end_turn',
      usage: u ? {
        inputTokens: u.input_tokens || 0,
        outputTokens: u.output_tokens || 0,
        cacheReadTokens: u.cache_read_input_tokens || 0,
        cacheWriteTokens: u.cache_creation_input_tokens || 0,
      } : undefined,
      raw: final,
    }
  }
}
