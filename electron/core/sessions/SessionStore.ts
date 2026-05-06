import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'
import os from 'os'

export interface PersistedToolCall {
  id: string
  name: string
  input?: any
  result?: string
  status: 'running' | 'done' | 'error'
}

export interface PersistedMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: PersistedToolCall[]
  // Anthropic message format blocks (for accurate replay to API)
  apiBlocks?: any[]
  toolResults?: { type: 'tool_result'; tool_use_id: string; content: string }[]
  timestamp: number
}

export interface PersistedSession {
  id: string
  title: string
  messages: PersistedMessage[]
  createdAt: number
  updatedAt: number
}

const ROOT = path.join(os.homedir(), '.macvis')
const SESSIONS_DIR = path.join(ROOT, 'sessions')

function ensureDirs() {
  if (!fsSync.existsSync(SESSIONS_DIR)) {
    fsSync.mkdirSync(SESSIONS_DIR, { recursive: true })
  }
}

// Debounced writes per session
const pendingWrites = new Map<string, NodeJS.Timeout>()

export const SessionStore = {
  async list(): Promise<PersistedSession[]> {
    ensureDirs()
    try {
      const files = await fs.readdir(SESSIONS_DIR)
      const sessions: PersistedSession[] = []
      for (const f of files) {
        if (!f.endsWith('.json')) continue
        try {
          const data = await fs.readFile(path.join(SESSIONS_DIR, f), 'utf-8')
          sessions.push(JSON.parse(data))
        } catch {}
      }
      sessions.sort((a, b) => b.updatedAt - a.updatedAt)
      return sessions
    } catch {
      return []
    }
  },

  async load(id: string): Promise<PersistedSession | null> {
    ensureDirs()
    try {
      const data = await fs.readFile(path.join(SESSIONS_DIR, `${id}.json`), 'utf-8')
      return JSON.parse(data)
    } catch {
      return null
    }
  },

  // Immediate write (used when an agent run finishes — must be durable)
  async saveNow(session: PersistedSession): Promise<void> {
    ensureDirs()
    const filepath = path.join(SESSIONS_DIR, `${session.id}.json`)
    const tmp = filepath + '.tmp'
    await fs.writeFile(tmp, JSON.stringify(session, null, 2))
    await fs.rename(tmp, filepath)
  },

  // Debounced save (used during streaming to avoid hammering disk)
  save(session: PersistedSession): void {
    const existing = pendingWrites.get(session.id)
    if (existing) clearTimeout(existing)
    pendingWrites.set(
      session.id,
      setTimeout(async () => {
        pendingWrites.delete(session.id)
        try {
          await this.saveNow(session)
        } catch (err) {
          console.error('SessionStore save failed:', err)
        }
      }, 400)
    )
  },

  async delete(id: string): Promise<void> {
    ensureDirs()
    try {
      await fs.unlink(path.join(SESSIONS_DIR, `${id}.json`))
    } catch {}
  },
}
