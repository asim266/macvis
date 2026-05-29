// Fetch a URL and return readable text/markdown. No API key required.
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
      const res = await fetch(target, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh) MacVis/0.1 (+https://github.com/asim266/macvis)' },
        redirect: 'follow',
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
