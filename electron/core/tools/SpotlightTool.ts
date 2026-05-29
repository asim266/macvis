import { execFile } from 'child_process'
import { promisify } from 'util'

const exec = promisify(execFile)

export const SpotlightTool = {
  definition: {
    name: 'spotlight',
    description:
      'Search the Mac with Spotlight (mdfind) — find files by name or content anywhere on disk, fast. ' +
      'Use for "find my invoice PDF", "where is that screenshot", "files about X". Returns matching paths.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search text (matches name + content)' },
        only_in: { type: 'string', description: 'Limit to a directory (optional)' },
        name_only: { type: 'boolean', description: 'Match filename only (-name)' },
        limit: { type: 'number', description: 'Max results (default 40)' },
      },
      required: ['query'],
    },
  },

  async execute({ query, only_in, name_only, limit = 40 }: any) {
    const args: string[] = []
    if (only_in) args.push('-onlyin', String(only_in).replace('~', process.env.HOME || ''))
    if (name_only) args.push('-name', query)
    else args.push(query)
    try {
      const { stdout } = await exec('mdfind', args, { maxBuffer: 1024 * 1024 * 8, timeout: 20000 })
      const lines = stdout.split('\n').filter(Boolean)
      if (lines.length === 0) return `No Spotlight results for "${query}".`
      return lines.slice(0, limit).join('\n') + (lines.length > limit ? `\n… ${lines.length - limit} more` : '')
    } catch (e: any) {
      return `Error: ${e.stderr?.trim() || e.message}`
    }
  },
}
