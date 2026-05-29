import { exec } from 'child_process'
import { promisify } from 'util'
import { startBackgroundShell } from './shells'

const execAsync = promisify(exec)

export const BashTool = {
  definition: {
    name: 'bash',
    description:
      'Execute a bash command on the Mac. Use for system operations, running scripts, installing packages, git, etc. ' +
      'Set run_in_background:true for long-running processes (dev servers, watchers) — it returns a shell id you can ' +
      'poll with bash_output and stop with kill_shell. Prefer read_file/edit_file/grep/glob over cat/sed/grep/find.',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The bash command to run' },
        cwd: { type: 'string', description: 'Working directory (optional)' },
        timeout: { type: 'number', description: 'Timeout in ms (default 30000, foreground only)' },
        run_in_background: { type: 'boolean', description: 'Run detached and return a shell id instead of blocking' },
      },
      required: ['command'],
    },
  },

  async execute({ command, cwd, timeout = 30000, run_in_background }: any) {
    if (run_in_background) {
      const { id } = startBackgroundShell(command, cwd)
      return `Started background shell ${id}. Use bash_output("${id}") to read output and kill_shell("${id}") to stop it.`
    }
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
