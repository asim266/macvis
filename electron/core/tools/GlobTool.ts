import fs from 'fs/promises'
import path from 'path'

function resolve(p: string): string {
  return p.startsWith('~') ? p.replace('~', process.env.HOME || '') : p
}

// Convert a glob pattern to a RegExp. Supports **, *, ?, and {a,b} alternation.
function globToRegExp(glob: string): RegExp {
  let re = ''
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // ** → match across directory separators
        re += '.*'
        i++
        if (glob[i + 1] === '/') i++
      } else {
        re += '[^/]*'
      }
    } else if (c === '?') re += '[^/]'
    else if (c === '.') re += '\\.'
    else if (c === '/') re += '/'
    else if (c === '{') re += '(?:'
    else if (c === '}') re += ')'
    else if (c === ',') re += '|'
    else if ('+^$()|[]\\'.includes(c)) re += '\\' + c
    else re += c
  }
  return new RegExp('^' + re + '$')
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'out', '.next', 'build', '.cache'])

export const GlobTool = {
  definition: {
    name: 'glob',
    description:
      'Fast file-name matching by glob pattern (e.g. "**/*.ts", "src/**/*.tsx", "*.json"). ' +
      'Returns matching paths sorted by most-recently-modified. Skips node_modules/.git/dist/etc.',
    input_schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Glob pattern, e.g. **/*.ts' },
        path: { type: 'string', description: 'Directory to search in (default: cwd / home)' },
      },
      required: ['pattern'],
    },
  },

  async execute({ pattern, path: searchPath }: any) {
    const root = resolve(searchPath || process.cwd() || process.env.HOME || '.')
    const regex = globToRegExp(pattern)
    const matches: { path: string; mtime: number }[] = []

    async function walk(dir: string, depth: number) {
      if (depth > 25) return
      let entries
      try { entries = await fs.readdir(dir, { withFileTypes: true }) } catch { return }
      for (const e of entries) {
        if (e.isDirectory() && SKIP_DIRS.has(e.name)) continue
        const full = path.join(dir, e.name)
        const rel = path.relative(root, full)
        if (e.isDirectory()) {
          await walk(full, depth + 1)
        } else {
          if (regex.test(rel) || regex.test(e.name)) {
            try {
              const st = await fs.stat(full)
              matches.push({ path: full, mtime: st.mtimeMs })
            } catch {}
          }
        }
      }
    }

    await walk(root, 0)
    matches.sort((a, b) => b.mtime - a.mtime)
    if (matches.length === 0) return `No files matching "${pattern}" under ${root}`
    const list = matches.slice(0, 200).map(m => m.path).join('\n')
    const more = matches.length > 200 ? `\n… and ${matches.length - 200} more` : ''
    return list + more
  },
}
