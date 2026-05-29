import OpenAI from 'openai'
import type { ChatProvider, StreamOptions, StreamHandlers, FinalMessage, ContentBlock, CommonMessage, ToolUseResult } from './types'

interface ProviderConfig {
  name: string
  baseURL?: string
  /** OpenRouter requires a `HTTP-Referer` header to attribute usage */
  defaultHeaders?: Record<string, string>
}

const PROVIDERS: Record<string, ProviderConfig> = {
  openai: { name: 'openai' },
  openrouter: {
    name: 'openrouter',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://github.com/asim266/macvis',
      'X-Title': 'MacVis',
    },
  },
  groq: { name: 'groq', baseURL: 'https://api.groq.com/openai/v1' },
  ollama: { name: 'ollama', baseURL: 'http://localhost:11434/v1' },
}

// Convert our common message format → OpenAI Chat Completions messages array
function toOpenAIMessages(system: string, messages: CommonMessage[]) {
  const out: any[] = [{ role: 'system', content: system }]
  for (const m of messages) {
    if (typeof m.content === 'string') {
      out.push({ role: m.role, content: m.content })
      continue
    }
    if (m.role === 'assistant') {
      // Assistant message may contain text + tool_use blocks
      let text = ''
      const toolCalls: any[] = []
      for (const block of m.content) {
        if (block.type === 'text') text += block.text
        else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            type: 'function',
            function: { name: block.name, arguments: JSON.stringify(block.input) },
          })
        }
      }
      const msg: any = { role: 'assistant' }
      if (text) msg.content = text
      if (toolCalls.length) msg.tool_calls = toolCalls
      out.push(msg)
    } else {
      // user message — may be text or tool_results (one per tool_result block becomes a `tool` message)
      const toolResults = m.content.filter(b => b.type === 'tool_result') as any[]
      if (toolResults.length) {
        // OpenAI `tool` messages only accept string content. Images returned by a
        // tool (e.g. screenshots) are sent as a follow-up user message with an
        // image_url part — the documented workaround for vision after tool use.
        const trailingImages: any[] = []
        for (const tr of toolResults) {
          if (typeof tr.content === 'string') {
            out.push({ role: 'tool', tool_call_id: tr.tool_use_id, content: tr.content })
            continue
          }
          const textParts = tr.content.filter((c: any) => c.type === 'text').map((c: any) => c.text)
          const imageParts = tr.content.filter((c: any) => c.type === 'image')
          out.push({
            role: 'tool',
            tool_call_id: tr.tool_use_id,
            content: textParts.join('\n') || (imageParts.length ? '[image returned — see below]' : ''),
          })
          for (const img of imageParts) {
            trailingImages.push({
              type: 'image_url',
              image_url: { url: `data:${img.mimeType};base64,${img.data}` },
            })
          }
        }
        if (trailingImages.length) {
          out.push({ role: 'user', content: trailingImages })
        }
      } else {
        // Plain user message — may carry text + image blocks (attachments / vision)
        const parts: any[] = []
        for (const b of m.content) {
          if (b.type === 'text') parts.push({ type: 'text', text: b.text })
          else if ((b as any).type === 'image') parts.push({ type: 'image_url', image_url: { url: `data:${(b as any).mimeType};base64,${(b as any).data}` } })
        }
        if (parts.length === 1 && parts[0].type === 'text') out.push({ role: 'user', content: parts[0].text })
        else if (parts.length) out.push({ role: 'user', content: parts })
      }
    }
  }
  return out
}

export class OpenAIProvider implements ChatProvider {
  readonly name: string
  private cfg: ProviderConfig

  constructor(providerName: 'openai' | 'openrouter' | 'groq' | 'ollama' = 'openai') {
    this.cfg = PROVIDERS[providerName]
    this.name = providerName
  }

  async stream(opts: StreamOptions, handlers: StreamHandlers): Promise<FinalMessage> {
    const client = new OpenAI({
      apiKey: opts.apiKey || 'no-key-needed', // Ollama
      baseURL: this.cfg.baseURL,
      defaultHeaders: this.cfg.defaultHeaders,
    })

    const messages = toOpenAIMessages(opts.system, opts.messages)
    const tools = opts.tools.length > 0 ? opts.tools.map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      },
    })) : undefined

    const stream = await client.chat.completions.create({
      model: opts.model,
      messages,
      tools,
      stream: true,
      stream_options: { include_usage: true },
      max_tokens: opts.maxTokens || 8192,
    })
    let usage: { inputTokens: number; outputTokens: number } | undefined

    // Accumulate streamed deltas into a final message
    let text = ''
    const toolCallsAccum: Record<number, { id?: string; name?: string; args: string }> = {}
    const seenToolStarts = new Set<number>()
    let finishReason: string | null = null

    for await (const chunk of stream) {
      if ((chunk as any).usage) {
        const u = (chunk as any).usage
        usage = { inputTokens: u.prompt_tokens || 0, outputTokens: u.completion_tokens || 0 }
      }
      const choice = chunk.choices?.[0]
      if (!choice) continue
      const delta = choice.delta

      if (delta?.content) {
        handlers.onText(delta.content)
        text += delta.content
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0
          if (!toolCallsAccum[idx]) toolCallsAccum[idx] = { args: '' }
          if (tc.id) toolCallsAccum[idx].id = tc.id
          if (tc.function?.name) toolCallsAccum[idx].name = tc.function.name
          if (tc.function?.arguments) toolCallsAccum[idx].args += tc.function.arguments

          // Fire onToolStart once per tool call (when we have both id and name)
          if (toolCallsAccum[idx].id && toolCallsAccum[idx].name && !seenToolStarts.has(idx)) {
            seenToolStarts.add(idx)
            handlers.onToolStart(toolCallsAccum[idx].id!, toolCallsAccum[idx].name!, {})
          }
        }
      }

      if (choice.finish_reason) finishReason = choice.finish_reason
    }

    // Build final content array
    const content: ContentBlock[] = []
    const toolUses: ToolUseResult[] = []

    if (text) content.push({ type: 'text', text })
    for (const idx of Object.keys(toolCallsAccum)) {
      const tc = toolCallsAccum[Number(idx)]
      if (!tc.id || !tc.name) continue
      let input: any = {}
      try { input = tc.args ? JSON.parse(tc.args) : {} } catch { input = { _raw: tc.args } }
      content.push({ type: 'tool_use', id: tc.id, name: tc.name, input })
      toolUses.push({ id: tc.id, name: tc.name, input })
    }

    return {
      content,
      toolUses,
      text,
      stopReason: finishReason === 'tool_calls' ? 'tool_use' :
                  finishReason === 'length' ? 'max_tokens' : 'end_turn',
      usage,
      raw: { finishReason },
    }
  }
}
