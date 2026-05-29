import fs from 'fs/promises'

function resolve(p: string): string {
  return p.startsWith('~') ? p.replace('~', process.env.HOME || '') : p
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

  async execute({ path: filePath, old_string, new_string, replace_all }: any) {
    const resolved = resolve(filePath)
    const content = await fs.readFile(resolved, 'utf-8')

    if (old_string === new_string) return 'Error: old_string and new_string are identical.'

    const occurrences = countOccurrences(content, old_string)
    if (occurrences === 0) {
      return `Error: old_string not found in ${resolved}. It must match exactly, including whitespace and indentation.`
    }
    if (occurrences > 1 && !replace_all) {
      return `Error: old_string appears ${occurrences} times in ${resolved}. Provide more surrounding context to make it unique, or set replace_all: true.`
    }

    const updated = replace_all
      ? content.split(old_string).join(new_string)
      : content.replace(old_string, new_string)

    await fs.writeFile(resolved, updated)
    return `Edited ${resolved} (${replace_all ? occurrences : 1} replacement${(replace_all ? occurrences : 1) === 1 ? '' : 's'}).`
  },
}
