// Common cross-provider types for chat + tool-use.
// Each ChatProvider implements stream() and converts to/from its native format.

export interface CommonTool {
  name: string
  description: string
  input_schema: any  // JSON Schema
}

export interface ContentBlockText {
  type: 'text'
  text: string
}

export interface ContentBlockImage {
  type: 'image'
  /** base64-encoded image data (no data: URI prefix) */
  data: string
  /** e.g. 'image/png', 'image/jpeg' */
  mimeType: string
}

export interface ContentBlockToolUse {
  type: 'tool_use'
  id: string
  name: string
  input: any
}

/** Rich tool-result content — a string, or a mix of text + image blocks (for vision/computer-use). */
export type ToolResultContent = string | Array<ContentBlockText | ContentBlockImage>

export interface ContentBlockToolResult {
  type: 'tool_result'
  tool_use_id: string
  content: ToolResultContent
}

export type ContentBlock = ContentBlockText | ContentBlockImage | ContentBlockToolUse | ContentBlockToolResult

export interface CommonMessage {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
}

export interface StreamOptions {
  apiKey: string
  baseURL?: string
  model: string
  system: string
  messages: CommonMessage[]
  tools: CommonTool[]
  maxTokens?: number
  signal?: AbortSignal
}

export interface ToolUseResult {
  id: string
  name: string
  input: any
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
}

export interface FinalMessage {
  /** All assistant content blocks (text, tool_use) in order */
  content: ContentBlock[]
  /** Just the tool-use blocks */
  toolUses: ToolUseResult[]
  /** Concatenated text content */
  text: string
  /** Why the model stopped */
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'error'
  /** Token usage for this turn, if the provider reports it */
  usage?: TokenUsage
  /** Provider-native raw response (for debugging) */
  raw?: any
}

export interface StreamHandlers {
  onText: (text: string) => void
  onToolStart: (id: string, name: string, input: any) => void
}

export interface ChatProvider {
  /** Provider name identifier ('anthropic', 'openai', etc.) */
  readonly name: string
  /** Run a single streaming completion turn. Returns the final assistant message. */
  stream(opts: StreamOptions, handlers: StreamHandlers): Promise<FinalMessage>
}
