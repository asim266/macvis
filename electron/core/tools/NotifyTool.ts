import { execFile } from 'child_process'

function esc(s: string): string {
  return (s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export const NotifyTool = {
  definition: {
    name: 'notify',
    description:
      'Show a native macOS notification (or speak aloud). Use to tell the user something finished or needs attention, ' +
      'especially during long tasks or when MacVis is in the background.',
    input_schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Notification body' },
        title: { type: 'string', description: 'Notification title (default: MacVis)' },
        subtitle: { type: 'string' },
        sound: { type: 'boolean', description: 'Play the default notification sound' },
        speak: { type: 'boolean', description: 'Also speak the message aloud via say' },
      },
      required: ['message'],
    },
  },

  async execute({ message, title = 'MacVis', subtitle, sound, speak }: any) {
    const parts = [`display notification "${esc(message)}"`, `with title "${esc(title)}"`]
    if (subtitle) parts.push(`subtitle "${esc(subtitle)}"`)
    if (sound) parts.push(`sound name "Glass"`)
    await new Promise<void>((resolve) => {
      execFile('osascript', ['-e', parts.join(' ')], () => resolve())
    })
    if (speak) {
      await new Promise<void>((resolve) => execFile('say', [message], () => resolve()))
    }
    return `Notified: "${message}"`
  },
}
