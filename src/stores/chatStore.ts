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
  // Tool result messages from persistence — not displayed
  isToolResult?: boolean
}

export interface Session {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt?: number
}

let idCounter = 0
const uid = () => `${Date.now()}-${++idCounter}`

interface ChatStore {
  sessions: Session[]
  activeSessionId: string
  isStreaming: boolean
  streamingMessageId: string | null
  sessionsLoaded: boolean

  loadSessions: () => Promise<void>
  createSession: () => string
  setActiveSession: (id: string) => void
  deleteSession: (id: string) => Promise<void>
  addMessage: (sessionId: string, msg: Omit<Message, 'id' | 'timestamp'>) => string
  appendStream: (sessionId: string, messageId: string, text: string) => void
  resetMessageContent: (sessionId: string, messageId: string) => void
  addOrUpdateToolCall: (sessionId: string, messageId: string, toolCall: Omit<ToolCall, 'id'> & { id?: string }) => void
  updateSessionTitle: (sessionId: string, title: string) => void
  setStreaming: (v: boolean) => void
  setStreamingMessageId: (id: string | null) => void
}

declare global {
  interface Window {
    macvis: any
  }
}

function persistedToSession(p: any): Session {
  // Filter out tool result synthetic user messages from display
  const messages: Message[] = (p.messages || [])
    .filter((m: any) => !(m.role === 'user' && m.toolResults))
    .map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content || '',
      toolCalls: m.toolCalls || [],
      timestamp: m.timestamp,
    }))
  return {
    id: p.id,
    title: p.title || 'New chat',
    messages,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

export const useChatStore = create<ChatStore>((set, get) => ({
  sessions: [],
  activeSessionId: '',
  isStreaming: false,
  streamingMessageId: null,
  sessionsLoaded: false,

  loadSessions: async () => {
    try {
      const persisted = await window.macvis.sessions.list()
      const sessions = (persisted || []).map(persistedToSession)
      set(s => ({
        sessions,
        sessionsLoaded: true,
        // Pick first session as active if none selected
        activeSessionId: s.activeSessionId || sessions[0]?.id || '',
      }))
    } catch (err) {
      console.error('Failed to load sessions:', err)
      set({ sessionsLoaded: true })
    }
  },

  createSession: () => {
    const id = `sess_${Date.now()}_${++idCounter}`
    const session: Session = {
      id,
      title: 'New chat',
      messages: [],
      createdAt: Date.now(),
    }
    set(s => ({ sessions: [session, ...s.sessions], activeSessionId: id }))
    return id
  },

  setActiveSession: id => set({ activeSessionId: id }),

  deleteSession: async id => {
    await window.macvis.sessions.delete(id)
    set(s => {
      const remaining = s.sessions.filter(sess => sess.id !== id)
      return {
        sessions: remaining,
        activeSessionId: s.activeSessionId === id ? (remaining[0]?.id || '') : s.activeSessionId,
      }
    })
  },

  addMessage: (sessionId, msg) => {
    const id = uid()
    set(s => ({
      sessions: s.sessions.map(session =>
        session.id === sessionId
          ? {
              ...session,
              messages: [...session.messages, { ...msg, id, timestamp: Date.now() }],
              title: session.messages.length === 0 && msg.role === 'user'
                ? msg.content.slice(0, 50)
                : session.title,
              updatedAt: Date.now(),
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

  resetMessageContent: (sessionId, messageId) => {
    set(s => ({
      sessions: s.sessions.map(session =>
        session.id === sessionId
          ? {
              ...session,
              messages: session.messages.map(m =>
                m.id === messageId ? { ...m, content: '', toolCalls: [] } : m
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
            const idx = toolCall.id
              ? existing.findIndex(t => t.id === toolCall.id)
              : existing.findIndex(t => t.name === toolCall.name && t.status === 'running')
            const full: ToolCall = { id: toolCall.id || uid(), ...toolCall }
            const updated = idx >= 0 ? existing.map((t, i) => i === idx ? full : t) : [...existing, full]
            return { ...m, toolCalls: updated }
          }),
        }
      }),
    }))
  },

  updateSessionTitle: (sessionId, title) => {
    set(s => ({
      sessions: s.sessions.map(session =>
        session.id === sessionId ? { ...session, title } : session
      ),
    }))
  },

  setStreaming: v => set({ isStreaming: v }),
  setStreamingMessageId: id => set({ streamingMessageId: id }),
}))
