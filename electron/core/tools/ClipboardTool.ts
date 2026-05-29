import { execFile } from 'child_process'

function pbpaste(): Promise<string> {
  return new Promise((resolve) => {
    execFile('pbpaste', (err, stdout) => resolve(err ? `Error reading clipboard: ${err.message}` : stdout))
  })
}

function pbcopy(text: string): Promise<string> {
  return new Promise((resolve) => {
    const child = execFile('pbcopy', (err) => resolve(err ? `Error writing clipboard: ${err.message}` : `Copied ${text.length} chars to the clipboard.`))
    child.stdin?.write(text)
    child.stdin?.end()
  })
}

export const ClipboardTool = {
  definition: {
    name: 'clipboard',
    description:
      'Read from or write to the macOS clipboard. Use to grab text the user copied, or to put a result where they can paste it.',
    input_schema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['read', 'write'] },
        text: { type: 'string', description: 'Text to copy (operation=write)' },
      },
      required: ['operation'],
    },
  },

  async execute({ operation, text }: any) {
    if (operation === 'read') return await pbpaste()
    if (operation === 'write') return await pbcopy(text ?? '')
    return `Unknown clipboard operation: ${operation}`
  },
}
