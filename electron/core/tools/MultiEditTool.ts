import fs from 'fs/promises'
import { unifiedDiff } from './diff'

function resolve(p: string): string {
  return p.startsWith('~') ? p.replace('~', process.env.HOME || '') : p
}

function applyEdits(content: string, edits: any[]): { ok: boolean; updated?: string; error?: string } {
  let cur = content
  for (let i = 0; i < edits.length; i++) {
    const { old_string, new_string, replace_all } = edits[i]
    if (old_string === new_string) return { ok: false, error: `edit #${i + 1} has identical old/new strings.` }
    if (!cur.includes(old_string)) return { ok: false, error: `edit #${i + 1} — old_string not found (after ${i} prior edit(s)). No changes written.` }
    const occurrences = cur.split(old_string).length - 1
    if (occurrences > 1 && !replace_all) return { ok: false, error: `edit #${i + 1} — old_string appears ${occurrences} times. Add context or set replace_all. No changes written.` }
    cur = replace_all ? cur.split(old_string).join(new_string) : cur.replace(old_string, new_string)
  }
  return { ok: true, updated: cur }
}

export const MultiEditTool = {
  definition: {
    name: 'multi_edit',
    description:
      'Apply multiple exact string replacements to a single file in one atomic operation. ' +
      'Edits are applied sequentially in order. If any edit fails (not found / ambiguous), nothing is written.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path (or ~ for home)' },
        edits: {
          type: 'array',
          description: 'Edits applied in order',
          items: {
            type: 'object',
            properties: {
              old_string: { type: 'string' },
              new_string: { type: 'string' },
              replace_all: { type: 'boolean' },
            },
            required: ['old_string', 'new_string'],
          },
        },
      },
      required: ['path', 'edits'],
    },
  },

  async preview({ path: filePath, edits }: any) {
    const resolved = resolve(filePath)
    try {
      const content = await fs.readFile(resolved, 'utf-8')
      const r = applyEdits(content, edits)
      if (!r.ok) return { error: r.error }
      return { diff: unifiedDiff(content, r.updated!, resolved), summary: `${edits.length} edit(s) in ${resolved}` }
    } catch (err: any) { return { error: err.message } }
  },

  async execute({ path: filePath, edits }: any) {
    const resolved = resolve(filePath)
    const content = await fs.readFile(resolved, 'utf-8')
    const r = applyEdits(content, edits)
    if (!r.ok) return `Error: ${r.error}`
    await fs.writeFile(resolved, r.updated!)
    return `Applied ${edits.length} edit${edits.length === 1 ? '' : 's'} to ${resolved}.\n\n${unifiedDiff(content, r.updated!, resolved)}`
  },
}
