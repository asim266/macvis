import { readBackgroundShell, killBackgroundShell, listBackgroundShells } from './shells'

export const BashOutputTool = {
  definition: {
    name: 'bash_output',
    description:
      'Read new output from a background shell started with bash(run_in_background:true). ' +
      'Returns only output produced since the last read, plus the shell\'s status.',
    input_schema: {
      type: 'object',
      properties: {
        shell_id: { type: 'string', description: 'The id returned by bash(run_in_background:true)' },
      },
      required: ['shell_id'],
    },
  },
  async execute({ shell_id }: any) {
    return readBackgroundShell(shell_id)
  },
}

export const KillShellTool = {
  definition: {
    name: 'kill_shell',
    description: 'Terminate a background shell by id. Pass no id (or "all") to list running shells.',
    input_schema: {
      type: 'object',
      properties: {
        shell_id: { type: 'string', description: 'The id to kill, or "all"/empty to list running shells' },
      },
    },
  },
  async execute({ shell_id }: any) {
    if (!shell_id || shell_id === 'all') return listBackgroundShells()
    return killBackgroundShell(shell_id)
  },
}
