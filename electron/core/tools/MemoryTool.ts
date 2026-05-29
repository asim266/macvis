import { MemoryStore } from '../memory/MemoryStore'

export const MemoryTool = {
  definition: {
    name: 'memory',
    description:
      'Your long-term memory across all conversations. Use `remember` to persist durable facts about the user, their ' +
      'projects, preferences, accounts, and decisions (NOT transient task details). Use `recall` to look something up, ' +
      '`list` to see recent memories, `forget` to delete one. Recent memories are also shown in your system prompt.',
    input_schema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['remember', 'recall', 'list', 'forget'] },
        text: { type: 'string', description: 'Fact to remember (remember) or query (recall)' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags (remember)' },
        id: { type: 'string', description: 'Memory id to forget' },
      },
      required: ['operation'],
    },
  },

  async execute({ operation, text, tags, id }: any) {
    switch (operation) {
      case 'remember': {
        if (!text) return 'Provide text to remember.'
        const e = MemoryStore.add(text, Array.isArray(tags) ? tags : [])
        return `Remembered (id ${e.id}): ${e.text}`
      }
      case 'recall': {
        const hits = MemoryStore.search(text || '')
        if (hits.length === 0) return 'No matching memories.'
        return hits.map(h => `- (${h.id}) ${h.text}`).join('\n')
      }
      case 'list': {
        const all = MemoryStore.all()
        if (all.length === 0) return 'No memories stored yet.'
        return all.slice(-30).reverse().map(h => `- (${h.id}) ${h.text}`).join('\n')
      }
      case 'forget':
        return MemoryStore.remove(id) ? `Forgot ${id}.` : `No memory with id ${id}.`
      default:
        return `Unknown memory operation: ${operation}`
    }
  },
}
