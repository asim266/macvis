import { GoogleGenerativeAI, type Tool as GeminiTool } from '@google/generative-ai'
import type { ChatProvider, StreamOptions, StreamHandlers, FinalMessage, ContentBlock, CommonMessage, ToolUseResult } from './types'

// Strip JSON Schema fields Gemini doesn't accept ($schema, additionalProperties, etc.)
function sanitizeSchema(schema: any): any {
  if (!schema || typeof schema !== 'object') return schema
  if (Array.isArray(schema)) return schema.map(sanitizeSchema)
  const out: any = {}
  for (const [k, v] of Object.entries(schema)) {
    if (k === '$schema' || k === 'additionalProperties' || k === '$ref') continue
    out[k] = sanitizeSchema(v)
  }
  return out
}

function toGeminiContents(messages: CommonMessage[]): any[] {
  const out: any[] = []
  for (const m of messages) {
    const role = m.role === 'assistant' ? 'model' : 'user'
    if (typeof m.content === 'string') {
      out.push({ role, parts: [{ text: m.content }] })
      continue
    }
    const parts: any[] = []
    for (const b of m.content) {
      if (b.type === 'text') parts.push({ text: b.text })
      else if (b.type === 'tool_use') {
        parts.push({ functionCall: { name: b.name, args: b.input } })
      } else if (b.type === 'tool_result') {
        // Tool result needs the original tool name — Gemini uses functionResponse with the function name as id
        // Convention: encode the name in tool_use_id (or store mapping). For now we strip.
        let parsed: any
        try { parsed = JSON.parse(b.content) } catch { parsed = { result: b.content } }
        parts.push({ functionResponse: { name: b.tool_use_id, response: parsed } })
      }
    }
    if (parts.length) out.push({ role, parts })
  }
  return out
}

export class GeminiProvider implements ChatProvider {
  readonly name = 'gemini'

  async stream(opts: StreamOptions, handlers: StreamHandlers): Promise<FinalMessage> {
    const client = new GoogleGenerativeAI(opts.apiKey)
    const tools: GeminiTool[] = opts.tools.length > 0 ? [{
      functionDeclarations: opts.tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: sanitizeSchema(t.input_schema),
      })),
    }] : []

    const model = client.getGenerativeModel({
      model: opts.model,
      systemInstruction: opts.system,
      tools: tools.length > 0 ? tools : undefined,
    })

    const contents = toGeminiContents(opts.messages)

    const result = await model.generateContentStream({ contents })

    let text = ''
    const toolUses: ToolUseResult[] = []
    const content: ContentBlock[] = []
    const fired = new Set<string>()
    let toolUseCount = 0

    for await (const chunk of result.stream) {
      const candidates = chunk.candidates || []
      for (const cand of candidates) {
        const parts = cand.content?.parts || []
        for (const p of parts) {
          if (p.text) {
            handlers.onText(p.text)
            text += p.text
          }
          if ((p as any).functionCall) {
            const fc = (p as any).functionCall
            // Gemini doesn't give us an id, synthesize one
            const id = `gemini_${Date.now()}_${++toolUseCount}`
            if (!fired.has(id)) {
              fired.add(id)
              handlers.onToolStart(id, fc.name, fc.args || {})
              content.push({ type: 'tool_use', id, name: fc.name, input: fc.args || {} })
              toolUses.push({ id, name: fc.name, input: fc.args || {} })
            }
          }
        }
      }
    }

    if (text) content.unshift({ type: 'text', text })

    const final = await result.response
    const finishReason = final.candidates?.[0]?.finishReason

    return {
      content,
      toolUses,
      text,
      stopReason: toolUses.length > 0 ? 'tool_use' :
                  finishReason === 'MAX_TOKENS' ? 'max_tokens' : 'end_turn',
      raw: { finishReason },
    }
  }
}
