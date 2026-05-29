import { RagStore } from '../rag/RagStore'

export const RagTool = {
  definition: {
    name: 'rag',
    description:
      'Index local files/folders into a searchable knowledge base and retrieve relevant passages ("chat with your files"). ' +
      'operations: index (build/refresh an index from a folder or file), search (get the most relevant chunks for a query), ' +
      'list, remove. Indexes PDFs, Word, Excel, and text/code. Uses embeddings when an OpenAI key is set, else keyword search. ' +
      'Use search to ground answers about the user\'s documents before responding.',
    input_schema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['index', 'search', 'list', 'remove'] },
        name: { type: 'string', description: 'Index name (index/search/remove)' },
        path: { type: 'string', description: 'Folder or file to index (index)' },
        query: { type: 'string', description: 'Search query (search)' },
        k: { type: 'number', description: 'How many chunks to return (search, default 6)' },
      },
      required: ['operation'],
    },
  },

  async execute({ operation, name, path: target, query, k }: any) {
    switch (operation) {
      case 'index': {
        if (!name || !target) return 'Provide name and path to index.'
        const r = await RagStore.index(name, target)
        if (!r.ok) return `Index failed: ${r.error}`
        return `Indexed "${name}": ${r.files} files, ${r.chunks} chunks${r.embedded ? ' (embedded)' : ' (keyword search — add an OpenAI key for semantic search)'}.`
      }
      case 'search': {
        if (!query) return 'Provide a query.'
        const hits = await RagStore.search(query, name, k || 6)
        if (hits.length === 0) return 'No relevant passages found. Has the folder been indexed yet (operation: index)?'
        return hits.map((h, i) => `### Result ${i + 1} — ${h.file}\n${h.text}`).join('\n\n')
      }
      case 'list': {
        const idx = RagStore.list()
        if (idx.length === 0) return 'No knowledge indexes yet. Use operation: index to create one.'
        return idx.map(i => `- ${i.name}: ${i.files} files, ${i.chunks} chunks${i.embedded ? ' (embedded)' : ''}`).join('\n')
      }
      case 'remove':
        return RagStore.remove(name) ? `Removed index "${name}".` : `No index named "${name}".`
      default:
        return `Unknown rag operation: ${operation}`
    }
  },
}
