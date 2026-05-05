import fs from 'fs/promises'
import path from 'path'

export const FilesystemTool = {
  definition: {
    name: 'filesystem',
    description: 'Read, write, list, delete, and manage files and directories on the Mac.',
    input_schema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['read', 'write', 'append', 'delete', 'list', 'exists', 'mkdir'],
        },
        path: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['operation', 'path'],
    },
  },

  async execute({ operation, path: filePath, content }: any) {
    const resolved = filePath.replace('~', process.env.HOME || '')

    switch (operation) {
      case 'read':
        return await fs.readFile(resolved, 'utf-8')
      case 'write':
        await fs.mkdir(path.dirname(resolved), { recursive: true })
        await fs.writeFile(resolved, content || '')
        return `Written: ${resolved}`
      case 'append':
        await fs.appendFile(resolved, content || '')
        return `Appended to: ${resolved}`
      case 'delete':
        await fs.rm(resolved, { recursive: true, force: true })
        return `Deleted: ${resolved}`
      case 'list': {
        const entries = await fs.readdir(resolved, { withFileTypes: true })
        return entries.map(e => `${e.isDirectory() ? '[DIR]' : '[FILE]'} ${e.name}`).join('\n')
      }
      case 'exists':
        try { await fs.access(resolved); return 'true' } catch { return 'false' }
      case 'mkdir':
        await fs.mkdir(resolved, { recursive: true })
        return `Created: ${resolved}`
      default:
        return `Unknown operation: ${operation}`
    }
  },
}
