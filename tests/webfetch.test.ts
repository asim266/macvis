import { describe, it, expect, afterAll } from 'vitest'
import http from 'http'
import { WebFetchTool } from '../electron/core/tools/WebFetchTool'

// Functional test of the SSRF guard: web_fetch must refuse loopback / private /
// link-local / metadata destinations *before* connecting, and honor scheme
// restrictions. Blocked cases need no external network.

describe('web_fetch SSRF guard', () => {
  it('blocks loopback by hostname', async () => {
    const out = await WebFetchTool.execute({ url: 'http://localhost:8787/run' })
    expect(out.toLowerCase()).toMatch(/blocked|private/)
  })

  it('blocks 127.0.0.1', async () => {
    const out = await WebFetchTool.execute({ url: 'http://127.0.0.1:8787/run' })
    expect(out.toLowerCase()).toMatch(/blocked|private/)
  })

  it('blocks the cloud metadata address 169.254.169.254', async () => {
    const out = await WebFetchTool.execute({ url: 'http://169.254.169.254/latest/meta-data/' })
    expect(out.toLowerCase()).toMatch(/blocked|private/)
  })

  it('blocks RFC1918 private ranges', async () => {
    const out = await WebFetchTool.execute({ url: 'http://10.0.0.5/' })
    expect(out.toLowerCase()).toMatch(/blocked|private/)
    const out2 = await WebFetchTool.execute({ url: 'http://192.168.1.1/admin' })
    expect(out2.toLowerCase()).toMatch(/blocked|private/)
  })

  it('blocks non-http(s) schemes (file://)', async () => {
    // scheme coercion only prefixes bare hosts; explicit file:// stays file://
    const out = await WebFetchTool.execute({ url: 'file:///etc/passwd' })
    expect(out.toLowerCase()).toMatch(/blocked|error/)
    expect(out).not.toContain('root:')
  })

  it('does not actually reach a live localhost server', async () => {
    let hit = false
    const server = http.createServer((_req, res) => { hit = true; res.end('SECRET') })
    await new Promise<void>(r => server.listen(0, '127.0.0.1', () => r()))
    const port = (server.address() as any).port
    try {
      const out = await WebFetchTool.execute({ url: `http://127.0.0.1:${port}/` })
      expect(out).not.toContain('SECRET')
      expect(hit).toBe(false) // guard rejects before the socket is opened
    } finally {
      await new Promise<void>(r => server.close(() => r()))
    }
  })
})
