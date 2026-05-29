import { execFile } from 'child_process'

function run(args: string[], stdin: string): Promise<string> {
  return new Promise((resolve) => {
    const child = execFile('osascript', args, { timeout: 120000, maxBuffer: 1024 * 1024 * 8 }, (err: any, stdout, stderr) => {
      if (err) {
        resolve(`Error: ${stderr?.trim() || err.message}`)
        return
      }
      resolve((stdout || '').trim() || (stderr || '').trim() || 'OK (no output)')
    })
    child.stdin?.write(stdin)
    child.stdin?.end()
  })
}

export const AppleScriptTool = {
  definition: {
    name: 'applescript',
    description:
      'Run AppleScript or JavaScript-for-Automation (JXA) on macOS via osascript. Use to automate native apps ' +
      '(Notes, Mail, Calendar, Reminders, Finder, Music, Safari, System Events, etc.), set system state, and read app data. ' +
      'Powerful for macOS automation. The script\'s return value (or last expression) is returned.',
    input_schema: {
      type: 'object',
      properties: {
        script: { type: 'string', description: 'The AppleScript (or JXA) source to run' },
        language: { type: 'string', enum: ['applescript', 'jxa'], description: 'Default: applescript' },
      },
      required: ['script'],
    },
  },

  async execute({ script, language = 'applescript' }: any) {
    const args = language === 'jxa' ? ['-l', 'JavaScript'] : []
    return await run(args, script)
  },
}
