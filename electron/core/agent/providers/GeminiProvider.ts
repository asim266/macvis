import { GoogleGenerativeAI, type Tool as GeminiTool } from '@google/generative-ai'
import type { ChatProvider, StreamOptions, StreamHandlers, FinalMessage, ContentBlock, CommonMessage, ToolUseResult } from './types'

// Gemini's function-declaration parameter schema is a SUBSET of JSON Schema.
// Anything outside the supported set causes 400 Bad Request. Use a strict allowlist.
// Reference: https://ai.google.dev/api/caching#Schema
const ALLOWED_SCHEMA_FIELDS = new Set([
  'type', 'description', 'enum', 'properties', 'required', 'items', 'nullable',
  'format',   // limited — accepted for 'string' (enum-like), 'integer' (int32/int64), 'number' (float/double)
  'title',
  // anyOf is supported on recent versions; ignore oneOf/allOf which are not
  'anyOf',
])

const GEMINI_TYPES = new Set(['string', 'number', 'integer', 'boolean', 'array', 'object'])

function sanitizeSchema(schema: any): any {
  if (schema === null || schema === undefined) return undefined
  if (typeof schema !== 'object') return schema
  if (Array.isArray(schema)) return schema.map(sanitizeSchema).filter(v => v !== undefined)

  const out: any = {}

  for (const [k, v] of Object.entries(schema)) {
    if (!ALLOWED_SCHEMA_FIELDS.has(k)) continue   // drop unknown / unsupported fields

    if (k === 'type') {
      // Handle JSON Schema's `type: ['string', 'null']` array form.
      if (Array.isArray(v)) {
        const types = (v as string[]).filter(t => t !== 'null')
        if ((v as string[]).includes('null')) out.nullable = true
        const t = types[0]
        if (t && GEMINI_TYPES.has(t)) out.type = t
      } else if (typeof v === 'string') {
        if (v === 'null') out.nullable = true
        else if (GEMINI_TYPES.has(v)) out.type = v
        // unknown types silently dropped
      }
    } else if (k === 'properties' && typeof v === 'object' && v) {
      const propsIn = v as Record<string, any>
      const propsOut: Record<string, any> = {}
      for (const [pk, pv] of Object.entries(propsIn)) {
        const cleaned = sanitizeSchema(pv)
        if (cleaned !== undefined) propsOut[pk] = cleaned
      }
      out.properties = propsOut
    } else if (k === 'items') {
      out.items = sanitizeSchema(v)
    } else if (k === 'anyOf' && Array.isArray(v)) {
      // Only keep if at least one variant survives sanitization
      const variants = v.map(sanitizeSchema).filter(x => x && typeof x === 'object')
      if (variants.length > 0) out.anyOf = variants
    } else if (k === 'enum' && Array.isArray(v)) {
      // Gemini supports enum only for type: string. Coerce values to strings.
      out.enum = (v as any[]).map(x => x === null ? null : String(x))
    } else if (k === 'required' && Array.isArray(v)) {
      out.required = (v as any[]).filter(x => typeof x === 'string')
    } else if (k === 'description' || k === 'title') {
      if (typeof v === 'string') out[k] = v.slice(0, 1024)   // cap length
    } else if (k === 'format' && typeof v === 'string') {
      // Pass through only the formats Gemini accepts
      if (['enum', 'int32', 'int64', 'float', 'double'].includes(v)) out.format = v
    } else if (k === 'nullable' && typeof v === 'boolean') {
      out.nullable = v
    }
  }

  // Gemini requires `type` on every schema node. If it was dropped (because it
  // was an unsupported type or missing), infer it.
  if (out.properties && !out.type) out.type = 'object'
  if (out.items && !out.type) out.type = 'array'

  // A schema with no type AND no properties/items is meaningless to Gemini — drop it
  if (!out.type) return undefined

  // Gemini requires `items` on every `type: 'array'`. Some MCP servers emit
  // arrays without an items spec (e.g. GitHub MCP's `comments` param). Default
  // to `{ type: 'string' }` so the call doesn't 400.
  if (out.type === 'array' && (!out.items || typeof out.items !== 'object')) {
    out.items = { type: 'string' }
  }

  return out
}

// Validate that a top-level function-declaration parameters object is non-empty.
// Gemini rejects empty parameter objects on tools that have no inputs.
function ensureValidParams(schema: any): any {
  const cleaned = sanitizeSchema(schema)
  if (!cleaned || cleaned.type !== 'object') {
    return { type: 'object', properties: {} }
  }
  if (!cleaned.properties) cleaned.properties = {}
  return cleaned
}

function toGeminiContents(messages: CommonMessage[]): any[] {
  const out: any[] = []
  // Gemini's functionResponse.name must match the original functionCall.name.
  // Our common format only carries tool_use_id on tool_result blocks, so we
  // walk forward building an id → name map from prior tool_use blocks.
  const idToName = new Map<string, string>()

  for (const m of messages) {
    const role = m.role === 'assistant' ? 'model' : 'user'
    if (typeof m.content === 'string') {
      out.push({ role, parts: [{ text: m.content }] })
      continue
    }
    const parts: any[] = []
    for (const b of m.content) {
      if (b.type === 'text') {
        parts.push({ text: b.text })
      } else if (b.type === 'tool_use') {
        // Sanitize the name the same way we did when registering the tool —
        // otherwise Gemini sees a mismatch.
        const safeName = b.name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64)
        idToName.set(b.id, safeName)
        parts.push({ functionCall: { name: safeName, args: b.input || {} } })
      } else if (b.type === 'tool_result') {
        const name = idToName.get(b.tool_use_id) || b.tool_use_id
        let parsed: any
        try { parsed = JSON.parse(b.content) } catch { parsed = { result: b.content } }
        parts.push({ functionResponse: { name, response: parsed } })
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
        // Gemini caps function names at 64 chars and only allows [a-zA-Z0-9_-]
        name: t.name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64),
        // Description capped at ~1024 to avoid bloat
        description: (t.description || '').slice(0, 1024),
        parameters: ensureValidParams(t.input_schema),
      })),
    }] : []

    const model = client.getGenerativeModel({
      model: opts.model,
      systemInstruction: opts.system,
      tools: tools.length > 0 ? tools : undefined,
    })

    const contents = toGeminiContents(opts.messages)

    // IMPORTANT: We do NOT use generateContentStream here. The @google/generative-ai
    // SDK has long-standing bugs with streaming + tool use — function calls often
    // don't appear in any stream chunk, leading to empty assistant bubbles. The
    // non-streaming generateContent reliably returns both text AND functionCall
    // parts in a single response payload. We trade typing-animation UX for
    // correctness; the AgentLoop is fine with whole-string text deltas.
    const result = await model.generateContent({ contents })

    const response = result.response
    const candidate = response.candidates?.[0]
    const finishReason = candidate?.finishReason
    const parts = candidate?.content?.parts || []

    let text = ''
    const toolUses: ToolUseResult[] = []
    const content: ContentBlock[] = []
    const seenFunctionCalls = new Set<string>()  // dedup by name+args signature
    let toolUseCount = 0

    for (const p of parts) {
      if (p.text) {
        text += p.text
      }
      if ((p as any).functionCall) {
        const fc = (p as any).functionCall
        const sig = `${fc.name}::${JSON.stringify(fc.args || {})}`
        if (seenFunctionCalls.has(sig)) continue
        seenFunctionCalls.add(sig)
        const id = `gemini_${Date.now()}_${++toolUseCount}`
        handlers.onToolStart(id, fc.name, fc.args || {})
        content.push({ type: 'tool_use', id, name: fc.name, input: fc.args || {} })
        toolUses.push({ id, name: fc.name, input: fc.args || {} })
      }
    }

    // Emit the whole text at once (no streaming animation for Gemini, but reliable)
    if (text) {
      handlers.onText(text)
      content.unshift({ type: 'text', text })
    }

    // If Gemini returned ZERO content (no text, no tool call), surface a
    // diagnostic so the user sees WHY the bubble is empty instead of nothing.
    if (content.length === 0) {
      const blockReason = response.promptFeedback?.blockReason
      const safetyRatings = (candidate?.safetyRatings || [])
        .filter((r: any) => r.blocked || r.probability === 'HIGH')
        .map((r: any) => r.category)
      let reason = ''
      if (blockReason) reason = `prompt blocked: ${blockReason}`
      else if (finishReason === 'SAFETY') reason = `safety filter: ${safetyRatings.join(', ') || 'unknown'}`
      else if (finishReason === 'RECITATION') reason = 'recitation filter'
      else if (finishReason === 'OTHER') reason = 'unspecified Gemini error'
      else if (finishReason === 'MAX_TOKENS') reason = 'hit max_tokens before any output'
      else reason = `empty response (finishReason=${finishReason || 'unknown'}). Try rephrasing or switch to a different model in Settings → Chat API Keys → Fallback Chain.`

      const note = `_Gemini returned an empty response — ${reason}_`
      handlers.onText(note)
      text = note
      content.push({ type: 'text', text: note })
    }

    return {
      content,
      toolUses,
      text,
      stopReason: toolUses.length > 0 ? 'tool_use' :
                  finishReason === 'MAX_TOKENS' ? 'max_tokens' : 'end_turn',
      raw: { finishReason, blockReason: response.promptFeedback?.blockReason },
    }
  }
}
