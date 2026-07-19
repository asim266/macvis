import http from 'http'
import { ConfigStore } from '../config/ConfigStore'
import { getMainWindow } from '../../main'
import { safeEqual, createRateLimiter } from '../security/http'

// Cap inbound trigger attempts so a local process can't brute-force the token
// or spam agent runs. Localhost-only, so the key is effectively a single client.
const isLimited = createRateLimiter(30, 60_000)

// A tiny localhost-only HTTP endpoint that fires an agent run when it receives
// an authorized POST. Lets external automations (Shortcuts, curl, cron, other
// apps) trigger MacVis. Bound to 127.0.0.1 and gated by a shared secret token.
let server: http.Server | null = null

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', c => { data += c; if (data.length > 1_000_000) req.destroy() })
    req.on('end', () => resolve(data))
  })
}

export const WebhookServer = {
  isRunning() { return !!server },

  async start(): Promise<{ ok: boolean; port?: number; error?: string }> {
    const config = ConfigStore.getInstance()
    const port = Number(config.get('webhooks.port')) || 8787
    const secret = (config.get('webhooks.secret') as string) || ''
    if (!secret) return { ok: false, error: 'Set a webhook secret token in Settings first.' }
    if (server) return { ok: true, port }

    server = http.createServer(async (req, res) => {
      const token = req.headers['x-macvis-token']
      if (req.method !== 'POST' || (req.url || '') !== '/run') { res.writeHead(404); res.end('not found'); return }
      if (isLimited(req.socket.remoteAddress || 'local')) { res.writeHead(429); res.end('too many requests'); return }
      // Constant-time compare — `!==` leaks the secret byte-by-byte via timing.
      if (!safeEqual(token, secret)) { res.writeHead(401); res.end('unauthorized'); return }
      try {
        const body = await readBody(req)
        const json = body ? JSON.parse(body) : {}
        const prompt = json.prompt || json.message
        if (!prompt) { res.writeHead(400); res.end('missing prompt'); return }
        const { agentLoop } = await import('../agent/AgentLoop')
        const sessionId = `hook_${Date.now().toString(36)}`
        agentLoop.run(`[Triggered via webhook]\n\n${prompt}`, sessionId)
        getMainWindow()?.webContents.send('webhook:fired', { prompt: String(prompt).slice(0, 120) })
        res.writeHead(202, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, sessionId }))
      } catch (err: any) {
        res.writeHead(500); res.end(`error: ${err.message || err}`)
      }
    })

    return await new Promise((resolve) => {
      server!.on('error', (err: any) => { server = null; resolve({ ok: false, error: err.message }) })
      server!.listen(port, '127.0.0.1', () => resolve({ ok: true, port }))
    })
  },

  stop(): { ok: boolean } {
    if (server) { server.close(); server = null }
    return { ok: true }
  },
}
