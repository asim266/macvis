import fs from 'fs/promises'
import path from 'path'
import { imageResult, type ToolReturn } from './types'

const IMAGE_EXT: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
}

const MAX_LINES = 2000
const MAX_LINE_LEN = 2000

function resolve(p: string): string {
  return p.startsWith('~') ? p.replace('~', process.env.HOME || '') : p
}

export const ReadFileTool = {
  definition: {
    name: 'read_file',
    description:
      'Read a file from disk. Returns text with line numbers (like `cat -n`). ' +
      'Use offset/limit for large files. Images (png/jpg/gif/webp) are returned visually so you can see them. ' +
      'Prefer this over `bash cat` for reading files.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path (or ~ for home)' },
        offset: { type: 'number', description: '1-based line to start from (text only)' },
        limit: { type: 'number', description: 'Max lines to read (default 2000)' },
      },
      required: ['path'],
    },
  },

  async execute({ path: filePath, offset, limit }: any): Promise<ToolReturn> {
    const resolved = resolve(filePath)
    const ext = path.extname(resolved).toLowerCase()

    // Image → return as a visual block
    if (IMAGE_EXT[ext]) {
      const buf = await fs.readFile(resolved)
      return imageResult(buf.toString('base64'), IMAGE_EXT[ext], `[image: ${resolved}]`)
    }

    const raw = await fs.readFile(resolved, 'utf-8')
    const lines = raw.split('\n')
    const start = Math.max(0, (offset ? offset - 1 : 0))
    const count = Math.min(limit || MAX_LINES, MAX_LINES)
    const slice = lines.slice(start, start + count)

    if (slice.length === 0) return '(file is empty or offset is past end of file)'

    const numbered = slice
      .map((line, i) => {
        const n = start + i + 1
        const text = line.length > MAX_LINE_LEN ? line.slice(0, MAX_LINE_LEN) + '… [truncated]' : line
        return `${String(n).padStart(6)}\t${text}`
      })
      .join('\n')

    const more = lines.length > start + count
      ? `\n\n… ${lines.length - (start + count)} more lines. Use offset=${start + count + 1} to continue.`
      : ''
    return numbered + more
  },
}
