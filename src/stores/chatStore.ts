import { create } from 'zustand'

export interface ToolCall {
  id: string
  name: string
  input?: any
  result?: string
  status: 'running' | 'done' | 'error'
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
  timestamp: number
}

export interface Session {
  id: string
  title: string
  messages: Message[]
  createdAt: number
}

let idCounter = 0
const uid = () => `${Date.now()}-${++idCounter}`

interface ChatStore {
  sessions: Session[]
  activeSessionId: string
  isStreaming: boolean
  streamingMessageId: string | null

  createSession: () => string
  setActiveSession: (id: string) => void
  addMessage: (sessionId: string, msg: Omit<Message, 'id' | 'timestamp'>) => string
  appendStream: (sessionId: string, messageId: string, text: string) => void
  addOrUpdateToolCall: (sessionId: string, messageId: string, toolCall: Omit<ToolCall, 'id'> & { id?: string }) => void
  setStreaming: (v: boolean) => void
  setStreamingMessageId: (id: string | null) => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  sessions: [],
  activeSessionId: '',
  isStreaming: false,
  streamingMessageId: null,

  createSession: () => {
    const id = uid()
    const session: Session = {
      id,
      title: 'New chat',
      messages: [],
      createdAt: Date.now(),
    }
    set(s => ({ sessions: [...s.sessions, session], activeSessionId: id }))
    return id
  },

  setActiveSession: id => set({ activeSessionId: id }),

  addMessage: (sessionId, msg) => {
    const id = uid()
    set(s => ({
      sessions: s.sessions.map(session =>
        session.id === sessionId
          ? {
              ...session,
              messages: [...session.messages, { ...msg, id, timestamp: Date.now() }],
              title: session.messages.length === 0 && msg.role === 'user'
                ? msg.content.slice(0, 40)
                : session.title,
            }
          : session
      ),
    }))
    return id
  },

  appendStream: (sessionId, messageId, text) => {
    set(s => ({
      sessions: s.sessions.map(session =>
        session.id === sessionId
          ? {
              ...session,
              messages: session.messages.map(m =>
                m.id === messageId ? { ...m, content: m.content + text } : m
              ),
            }
          : session
      ),
    }))
  },

  addOrUpdateToolCall: (sessionId, messageId, toolCall) => {
    set(s => ({
      sessions: s.sessions.map(session => {
        if (session.id !== sessionId) return session
        return {
          ...session,
          messages: session.messages.map(m => {
            if (m.id !== messageId) return m
            const existing = m.toolCalls || []
            const idx = toolCall.id ? existing.findIndex(t => t.id === toolCall.id) : existing.findIndex(t => t.name === toolCall.name && t.status === 'running')
            const full: ToolCall = { id: toolCall.id || uid(), ...toolCall }
            const updated = idx >= 0 ? existing.map((t, i) => i === idx ? full : t) : [...existing, full]
            return { ...m, toolCalls: updated }
          }),
        }
      }),
    }))
  },

  setStreaming: v => set({ isStreaming: v }),
  setStreamingMessageId: id => set({ streamingMessageId: id }),
}))
