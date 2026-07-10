// Fetch a URL and return readable text/markdown. No API key required.
import dns from 'dns/promises'
import net from 'net'

// Block SSRF: reject loopback / private / link-local / reserved destinations so
// the LLM can't reach localhost services, the LAN, or cloud metadata endpoints.
function isPrivateIP(ip: string): boolean {
  const v = net.isIP(ip)
  if (v === 4) {
    const o = ip.split('.').map(Number)
    return (
      o[0] === 127 || o[0] === 10 || o[0] === 0 ||
      (o[0] === 172 && o[1] >= 16 && o[1] <= 31) ||
      (o[0] === 192 && o[1] === 168) ||
      (o[0] === 169 && o[1] === 254) ||           // link-local (incl. 169.254.169.254)
      (o[0] === 100 && o[1] >= 64 && o[1] <= 127) // CGNAT
    )
  }
  if (v === 6) {
    const l = ip.toLowerCase()
    return l === '::1' || l === '::' || l.startsWith('fe80') || l.startsWith('fc') || l.startsWith('fd') ||
      l.startsWith('::ffff:127.') || l.startsWith('::ffff:10.') || l.startsWith('::ffff:192.168.') || l.startsWith('::ffff:169.254.')
  }
  return false
}

async function assertPublicUrl(raw: string): Promise<URL> {
  let u: URL
  try { u = new URL(raw) } catch { throw new Error(`invalid URL: ${raw}`) }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error(`blocked scheme: ${u.protocol}`)
  const host = u.hostname.replace(/^\[|\]$/g, '')
  if (/^(localhost|.*\.local)$/i.test(host)) throw new Error(`blocked host: ${host}`)
  if (net.isIP(host)) {
    if (isPrivateIP(host)) throw new Error(`blocked private address: ${host}`)
  } else {
    const addrs = await dns.lookup(host, { all: true })
    if (addrs.some(a => isPrivateIP(a.address))) throw new Error(`host ${host} resolves to a private address`)
  }
  return u
}

// Fetch with manual redirect handling, re-validating each hop (so a public URL
// can't 302 into an internal one).
async function safeFetch(raw: string, headers: Record<string, string>): Promise<Response> {
  let target = raw
  for (let hop = 0; hop < 5; hop++) {
    await assertPublicUrl(target)
    const res = await fetch(target, { headers, redirect: 'manual' })
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      target = new URL(res.headers.get('location')!, target).toString()
      continue
    }
    return res
  }
  throw new Error('too many redirects')
}

function htmlToText(html: string): string {
  return html
    // drop scripts/styles/noscript/svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    // headings & block elements → newlines
    .replace(/<\/(p|div|section|article|h[1-6]|li|tr|br|header|footer|nav)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<h[1-6][^>]*>/gi, '\n\n')
    // links → keep text + href
    .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href, txt) => `${txt.replace(/<[^>]+>/g, '')} (${href})`)
    // strip remaining tags
    .replace(/<[^>]+>/g, '')
    // decode common entities
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const WebFetchTool = {
  definition: {
    name: 'web_fetch',
    description:
      'Fetch a URL and return its readable text content (HTML stripped to markdown-ish text, JSON returned as-is). ' +
      'Use for reading documentation, articles, or APIs. For broad discovery use web_search first.',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The URL to fetch (http/https)' },
        max_chars: { type: 'number', description: 'Truncate output to this many chars (default 20000)' },
      },
      required: ['url'],
    },
  },

  async execute({ url, max_chars = 20000 }: any) {
    let target = url
    if (!/^https?:\/\//i.test(target)) target = 'https://' + target
    try {
      const res = await safeFetch(target, {
        'User-Agent': 'Mozilla/5.0 (Macintosh) MacVis/0.1 (+https://github.com/asim266/macvis)',
      })
      const ctype = res.headers.get('content-type') || ''
      const body = await res.text()
      if (!res.ok) return `HTTP ${res.status} ${res.statusText} fetching ${target}\n${body.slice(0, 1000)}`

      let out: string
      if (ctype.includes('application/json')) {
        try { out = JSON.stringify(JSON.parse(body), null, 2) } catch { out = body }
      } else if (ctype.includes('text/html')) {
        out = htmlToText(body)
      } else {
        out = body
      }
      out = out.slice(0, max_chars)
      return `# ${target}\n\n${out}${out.length >= max_chars ? '\n\n… [truncated]' : ''}`
    } catch (err: any) {
      return `Error fetching ${target}: ${err.message || String(err)}`
    }
  },
}
