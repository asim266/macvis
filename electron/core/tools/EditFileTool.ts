import fs from 'fs/promises'
import { unifiedDiff } from './diff'

function resolve(p: string): string {
  return p.startsWith('~') ? p.replace('~', process.env.HOME || '') : p
}

function computeEdit(content: string, old_string: string, new_string: string, replace_all?: boolean): { ok: boolean; updated?: string; error?: string; count?: number } {
  if (old_string === new_string) return { ok: false, error: 'old_string and new_string are identical.' }
  const occurrences = countOccurrences(content, old_string)
  if (occurrences === 0) return { ok: false, error: 'old_string not found. It must match exactly, including whitespace and indentation.' }
  if (occurrences > 1 && !replace_all) return { ok: false, error: `old_string appears ${occurrences} times. Add surrounding context to make it unique, or set replace_all: true.` }
  const updated = replace_all ? content.split(old_string).join(new_string) : content.replace(old_string, new_string)
  return { ok: true, updated, count: replace_all ? occurrences : 1 }
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0
  let count = 0
  let idx = haystack.indexOf(needle)
  while (idx !== -1) {
    count++
    idx = haystack.indexOf(needle, idx + needle.length)
  }
  return count
}

export const EditFileTool = {
  definition: {
    name: 'edit_file',
    description:
      'Make an exact string replacement in a file. `old_string` must match the file exactly (including whitespace) ' +
      'and be unique unless replace_all is true. Fails if not found or ambiguous. Prefer this over rewriting whole files.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path (or ~ for home)' },
        old_string: { type: 'string', description: 'Exact text to find' },
        new_string: { type: 'string', description: 'Replacement text' },
        replace_all: { type: 'boolean', description: 'Replace every occurrence (default false)' },
      },
      required: ['path', 'old_string', 'new_string'],
    },
  },

  // Dry-run for the approval/diff UI — computes the diff without writing.
  async preview({ path: filePath, old_string, new_string, replace_all }: any) {
    const resolved = resolve(filePath)
    try {
      const content = await fs.readFile(resolved, 'utf-8')
      const r = computeEdit(content, old_string, new_string, replace_all)
      if (!r.ok) return { error: r.error }
      return { diff: unifiedDiff(content, r.updated!, resolved), summary: `${r.count} replacement(s) in ${resolved}` }
    } catch (err: any) {
      return { error: err.message }
    }
  },

  async execute({ path: filePath, old_string, new_string, replace_all }: any) {
    const resolved = resolve(filePath)
    const content = await fs.readFile(resolved, 'utf-8')
    const r = computeEdit(content, old_string, new_string, replace_all)
    if (!r.ok) return `Error: ${r.error}`
    await fs.writeFile(resolved, r.updated!)
    return `Edited ${resolved} (${r.count} replacement${r.count === 1 ? '' : 's'}).\n\n${unifiedDiff(content, r.updated!, resolved)}`
  },
}
