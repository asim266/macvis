import { execFile } from 'child_process'

function resolve(p: string): string {
  return p.startsWith('~') ? p.replace('~', process.env.HOME || '') : p
}

function run(cmd: string, args: string[], cwd: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((res) => {
    execFile(cmd, args, { cwd, maxBuffer: 1024 * 1024 * 16, timeout: 30000 }, (err: any, stdout, stderr) => {
      res({ code: err?.code ?? 0, stdout: stdout || '', stderr: stderr || '' })
    })
  })
}

let rgChecked = false
let hasRg = false
async function ripgrepAvailable(cwd: string): Promise<boolean> {
  if (rgChecked) return hasRg
  rgChecked = true
  const { code } = await run('rg', ['--version'], cwd)
  hasRg = code === 0
  return hasRg
}

export const GrepTool = {
  definition: {
    name: 'grep',
    description:
      'Search file contents with a regular expression (ripgrep when available, grep fallback). ' +
      'Returns matching lines as `file:line:text`. Prefer this over `bash grep` for code search.',
    input_schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Regex pattern to search for' },
        path: { type: 'string', description: 'File or directory to search (default: cwd / home)' },
        glob: { type: 'string', description: 'Only search files matching this glob, e.g. "*.ts"' },
        ignore_case: { type: 'boolean', description: 'Case-insensitive search' },
        context: { type: 'number', description: 'Lines of context around each match (-C)' },
        output_mode: { type: 'string', enum: ['content', 'files_with_matches', 'count'], description: 'Default: content' },
      },
      required: ['pattern'],
    },
  },

  async execute({ pattern, path: searchPath, glob, ignore_case, context, output_mode = 'content' }: any) {
    const cwd = resolve(searchPath || process.cwd() || process.env.HOME || '.')
    const target = searchPath ? resolve(searchPath) : '.'

    if (await ripgrepAvailable(cwd)) {
      const args = ['--no-heading', '--line-number', '--color=never']
      if (ignore_case) args.push('-i')
      if (glob) args.push('-g', glob)
      if (output_mode === 'files_with_matches') args.push('-l')
      else if (output_mode === 'count') args.push('-c')
      else if (context) args.push('-C', String(context))
      args.push('-e', pattern, target)
      const { stdout, stderr, code } = await run('rg', args, cwd)
      if (code === 1) return `No matches for /${pattern}/`
      if (code > 1 && stderr) return `Error: ${stderr.trim()}`
      const lines = stdout.split('\n').filter(Boolean)
      const capped = lines.slice(0, 300).join('\n')
      return capped + (lines.length > 300 ? `\n… ${lines.length - 300} more matches` : '')
    }

    // Fallback: grep -rn
    const args = ['-rn']
    if (ignore_case) args.push('-i')
    if (output_mode === 'files_with_matches') args.push('-l')
    else if (output_mode === 'count') args.push('-c')
    else if (context) args.push('-C', String(context))
    if (glob) args.push(`--include=${glob}`)
    args.push('--exclude-dir=node_modules', '--exclude-dir=.git', '-e', pattern, target)
    const { stdout, stderr, code } = await run('grep', args, cwd)
    if (code === 1) return `No matches for /${pattern}/`
    if (code > 1 && stderr) return `Error: ${stderr.trim()}`
    const lines = stdout.split('\n').filter(Boolean)
    return lines.slice(0, 300).join('\n') + (lines.length > 300 ? `\n… ${lines.length - 300} more` : '')
  },
}
