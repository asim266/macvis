import fs from 'fs/promises'

function resolve(p: string): string {
  return p.startsWith('~') ? p.replace('~', process.env.HOME || '') : p
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

  async execute({ path: filePath, edits }: any) {
    const resolved = resolve(filePath)
    let content = await fs.readFile(resolved, 'utf-8')

    for (let i = 0; i < edits.length; i++) {
      const { old_string, new_string, replace_all } = edits[i]
      if (old_string === new_string) return `Error: edit #${i + 1} has identical old/new strings.`
      if (!content.includes(old_string)) {
        return `Error: edit #${i + 1} — old_string not found (after applying ${i} prior edit${i === 1 ? '' : 's'}). No changes written.`
      }
      const occurrences = content.split(old_string).length - 1
      if (occurrences > 1 && !replace_all) {
        return `Error: edit #${i + 1} — old_string appears ${occurrences} times. Add context or set replace_all. No changes written.`
      }
      content = replace_all
        ? content.split(old_string).join(new_string)
        : content.replace(old_string, new_string)
    }

    await fs.writeFile(resolved, content)
    return `Applied ${edits.length} edit${edits.length === 1 ? '' : 's'} to ${resolved}.`
  },
}
