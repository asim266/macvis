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

export interface ContentBlockToolUse {
  type: 'tool_use'
  id: string
  name: string
  input: any
}

export interface ContentBlockToolResult {
  type: 'tool_result'
  tool_use_id: string
  content: string
}

export type ContentBlock = ContentBlockText | ContentBlockToolUse | ContentBlockToolResult

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

export interface FinalMessage {
  /** All assistant content blocks (text, tool_use) in order */
  content: ContentBlock[]
  /** Just the tool-use blocks */
  toolUses: ToolUseResult[]
  /** Concatenated text content */
  text: string
  /** Why the model stopped */
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'error'
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
