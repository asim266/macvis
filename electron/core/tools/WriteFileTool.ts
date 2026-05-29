import fs from 'fs/promises'
import path from 'path'

function resolve(p: string): string {
  return p.startsWith('~') ? p.replace('~', process.env.HOME || '') : p
}

export const WriteFileTool = {
  definition: {
    name: 'write_file',
    description:
      'Write a file to disk, creating parent directories as needed and overwriting any existing file. ' +
      'Use `edit_file` for targeted changes to an existing file instead of rewriting it whole.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path (or ~ for home)' },
        content: { type: 'string', description: 'Full file contents to write' },
      },
      required: ['path', 'content'],
    },
  },

  async execute({ path: filePath, content }: any) {
    const resolved = resolve(filePath)
    await fs.mkdir(path.dirname(resolved), { recursive: true })
    await fs.writeFile(resolved, content ?? '')
    const bytes = Buffer.byteLength(content ?? '')
    return `Wrote ${bytes} bytes to ${resolved}`
  },
}
