export const WebSearchTool = {
  definition: {
    name: 'web_search',
    description: 'Search the web for current information.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        num_results: { type: 'number', description: 'Number of results (default 5)' },
      },
      required: ['query'],
    },
  },

  async execute({ query, num_results = 5 }: any, config: any) {
    const tavilyKey = config.get('apiKeys.tavily')
    const serperKey = config.get('apiKeys.serper')

    if (tavilyKey) {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: tavilyKey, query, max_results: num_results }),
      })
      const data = await res.json() as any
      return data.results?.map((r: any) => `${r.title}\n${r.url}\n${r.content}`).join('\n\n')
    }

    if (serperKey) {
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-KEY': serperKey },
        body: JSON.stringify({ q: query, num: num_results }),
      })
      const data = await res.json() as any
      return data.organic?.map((r: any) => `${r.title}\n${r.link}\n${r.snippet}`).join('\n\n')
    }

    return 'No search API key configured. Add Tavily or Serper key in Settings.'
  },
}
