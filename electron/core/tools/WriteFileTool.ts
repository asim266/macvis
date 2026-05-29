import fs from 'fs/promises'
import path from 'path'
import { unifiedDiff, newFileDiff } from './diff'

function resolve(p: string): string {
  return p.startsWith('~') ? p.replace('~', process.env.HOME || '') : p
}

async function diffFor(resolved: string, content: string): Promise<string> {
  try {
    const existing = await fs.readFile(resolved, 'utf-8')
    return unifiedDiff(existing, content ?? '', resolved)
  } catch {
    return newFileDiff(content ?? '', resolved)
  }
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

  async preview({ path: filePath, content }: any) {
    const resolved = resolve(filePath)
    return { diff: await diffFor(resolved, content ?? ''), summary: `Write ${Buffer.byteLength(content ?? '')} bytes to ${resolved}` }
  },

  async execute({ path: filePath, content }: any) {
    const resolved = resolve(filePath)
    const diff = await diffFor(resolved, content ?? '')
    await fs.mkdir(path.dirname(resolved), { recursive: true })
    await fs.writeFile(resolved, content ?? '')
    const bytes = Buffer.byteLength(content ?? '')
    return `Wrote ${bytes} bytes to ${resolved}\n\n${diff}`
  },
}
