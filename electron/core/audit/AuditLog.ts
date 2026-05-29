import fs from 'fs'
import path from 'path'
import os from 'os'
import { redactSecrets } from '../security/redact'

const LOG_DIR = path.join(os.homedir(), '.macvis', 'logs')
const LOG_FILE = path.join(LOG_DIR, 'audit.log')

function summarize(input: any): string {
  try {
    const s = typeof input === 'string' ? input : JSON.stringify(input)
    const clipped = s.length > 300 ? s.slice(0, 300) + '…' : s
    return redactSecrets(clipped)
  } catch { return '' }
}

export const AuditLog = {
  /** Append a single tool-invocation record (JSON line). Never throws. */
  record(entry: { sessionId: string; tool: string; input?: any; ok: boolean; ms?: number; denied?: boolean }) {
    try {
      fs.mkdirSync(LOG_DIR, { recursive: true })
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

  path: LOG_FILE,
}
