import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'
import os from 'os'
import { atomicWriteFile } from '../util/atomicWrite'

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

// Debounced writes per session (timer + the session to persist when it fires,
// so a shutdown flush can still write the latest state instead of dropping it).
const pendingWrites = new Map<string, { timer: NodeJS.Timeout; session: PersistedSession }>()

// Per-session write chain. A session can be written concurrently by the UI, a
// Telegram turn, the scheduler and a webhook run; serializing per id means those
// writes queue instead of interleaving.
const writeChains = new Map<string, Promise<void>>()

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

  // Immediate write (used when an agent run finishes — must be durable).
  // Serialized per session id and written atomically (unique tmp + rename).
  async saveNow(session: PersistedSession): Promise<void> {
    ensureDirs()
    const id = session.id
    const filepath = path.join(SESSIONS_DIR, `${id}.json`)
    // Snapshot synchronously so we persist the state as of *this* call, even if
    // the caller keeps mutating `session` while the write is queued.
    const data = JSON.stringify(session, null, 2)

    const prev = writeChains.get(id) || Promise.resolve()
    const next = prev.catch(() => {}).then(() => atomicWriteFile(filepath, data))
    writeChains.set(id, next)
    try {
      await next
    } finally {
      if (writeChains.get(id) === next) writeChains.delete(id)
    }
  },

  // Debounced save (used during streaming to avoid hammering disk)
  save(session: PersistedSession): void {
    const existing = pendingWrites.get(session.id)
    if (existing) clearTimeout(existing.timer)
    const timer = setTimeout(async () => {
      pendingWrites.delete(session.id)
      try {
        await this.saveNow(session)
      } catch (err) {
        console.error('SessionStore save failed:', err)
      }
    }, 400)
    pendingWrites.set(session.id, { timer, session })
  },

  /** Write any debounced state immediately and wait for in-flight writes.
   *  Called on app quit so a pending session isn't lost. */
  async flushAll(): Promise<void> {
    const entries = [...pendingWrites.values()]
    pendingWrites.clear()
    for (const e of entries) clearTimeout(e.timer)
    await Promise.allSettled(entries.map(e => this.saveNow(e.session)))
    await Promise.allSettled([...writeChains.values()])
  },

  async delete(id: string): Promise<void> {
    ensureDirs()
    try {
      await fs.unlink(path.join(SESSIONS_DIR, `${id}.json`))
    } catch {}
  },
}
