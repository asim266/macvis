import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const BashTool = {
  definition: {
    name: 'bash',
    description: 'Execute a bash command on the Mac. Use for any system operations, running scripts, installing packages, git operations, etc.',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The bash command to run' },
        cwd: { type: 'string', description: 'Working directory (optional)' },
        timeout: { type: 'number', description: 'Timeout in ms (default 30000)' },
      },
      required: ['command'],
    },
  },

  async execute({ command, cwd, timeout = 30000 }: any) {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: cwd || process.env.HOME,
        timeout,
        maxBuffer: 1024 * 1024 * 10,
      })
      return stdout + (stderr ? `\nSTDERR: ${stderr}` : '')
    } catch (err: any) {
      return `Error: ${err.message}\n${err.stderr || ''}`
    }
  },
}
