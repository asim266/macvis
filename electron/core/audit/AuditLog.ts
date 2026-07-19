import fs from 'fs'
import path from 'path'
import os from 'os'
import { redactSecrets, redactValues } from '../security/redact'

const LOG_DIR = path.join(os.homedir(), '.macvis', 'logs')
const LOG_FILE = path.join(LOG_DIR, 'audit.log')

// Collect every configured secret value so we can mask it by exact match,
// independent of key format. Best-effort; never throws.
function configuredSecrets(): string[] {
  try {
    const { ConfigStore } = require('../config/ConfigStore')
    const all = ConfigStore.getInstance().getAll() || {}
    const out: string[] = []
    const walk = (o: any) => {
      if (!o || typeof o !== 'object') return
      for (const v of Object.values(o)) {
        if (typeof v === 'string' && v.length >= 12) out.push(v)
        else if (v && typeof v === 'object') walk(v)
      }
    }
    walk(all.apiKeys); walk(all.mcps); walk(all.webhooks); walk(all.telegram)
    return out
  } catch { return [] }
}

function summarize(input: any): string {
  try {
    const s = typeof input === 'string' ? input : JSON.stringify(input)
    const clipped = s.length > 300 ? s.slice(0, 300) + '…' : s
    return redactValues(redactSecrets(clipped), configuredSecrets())
  } catch { return '' }
}

// Cap the audit log so it can't grow without bound on a long-running install.
// At the limit the current file becomes audit.log.1 (replacing any previous
// rotation) and a fresh log starts — one generation of history is retained.
const MAX_LOG_BYTES = 5 * 1024 * 1024

function rotateIfNeeded() {
  try {
    if (fs.statSync(LOG_FILE).size > MAX_LOG_BYTES) {
      fs.renameSync(LOG_FILE, `${LOG_FILE}.1`)
    }
  } catch { /* missing file (nothing to rotate) or rotation failed — keep logging */ }
}

export const AuditLog = {
  /** Append a single tool-invocation record (JSON line). Never throws. */
  record(entry: { sessionId: string; tool: string; input?: any; ok: boolean; ms?: number; denied?: boolean }) {
    try {
      fs.mkdirSync(LOG_DIR, { recursive: true })
      rotateIfNeeded()
      const line = JSON.stringify({
        ts: new Date().toISOString(),
        sessionId: entry.sessionId,
        tool: entry.tool,
        input: summarize(entry.input),
        ok: entry.ok,
        denied: entry.denied || false,
        ms: entry.ms,
      })
      fs.appendFileSync(LOG_FILE, line + '\n')
    } catch { /* auditing must never break the agent */ }
  },

  /** Return the most recent N audit entries (newest last), parsed. */
  tail(n = 100): any[] {
    try {
      const lines = fs.readFileSync(LOG_FILE, 'utf-8').trim().split('\n')
      return lines.slice(-n).map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
    } catch { return [] }
  },

  path: LOG_FILE,
}
