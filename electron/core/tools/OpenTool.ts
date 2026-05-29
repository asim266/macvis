import { execFile } from 'child_process'

function run(args: string[]): Promise<string> {
  return new Promise((resolve) => {
    execFile('open', args, (err, _stdout, stderr) => {
      resolve(err ? `Error: ${stderr?.trim() || err.message}` : `Opened: ${args.join(' ')}`)
    })
  })
}

export const OpenTool = {
  definition: {
    name: 'open',
    description:
      'Open a file, folder, URL, or launch/activate an app using macOS `open`. ' +
      'Examples: open a URL in the browser, reveal a folder in Finder, launch an app by name. ' +
      'Do NOT open links from untrusted emails/messages without the user confirming.',
    input_schema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'A file/folder path, a URL, or (with app=true) an app name' },
        app: { type: 'boolean', description: 'Treat target as an application name to launch (open -a)' },
        reveal: { type: 'boolean', description: 'Reveal the file in Finder instead of opening it (open -R)' },
      },
      required: ['target'],
    },
  },

  async execute({ target, app, reveal }: any) {
    const t = String(target).replace('~', process.env.HOME || '')
    if (app) return await run(['-a', t])
    if (reveal) return await run(['-R', t])
    return await run([t])
  },
}
