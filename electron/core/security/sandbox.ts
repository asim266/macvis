import path from 'path'
import os from 'os'

const HOME = os.homedir()

// Paths that file-mutating tools must never touch, even with approval off.
// Pure function (no electron import) so it is unit-testable.
const DEFAULT_PROTECTED = [
  '.ssh',
  '.aws',
  '.gnupg',
  '.config/gcloud',
  'Library/Keychains',
  '.kube',
  '.docker/config.json',
  '.npmrc',
  '.netrc',
]

function expand(p: string): string {
  if (p.startsWith('~')) p = p.replace('~', HOME)
  if (!path.isAbsolute(p)) p = path.join(HOME, p)
  return path.resolve(p)
}

/**
 * Returns a reason string if `target` falls inside a protected location,
 * otherwise null. Also blocks absolute system dirs like /etc and /System.
 */
export function checkProtectedPath(target: string, extra: string[] = []): string | null {
  if (!target) return null
  const resolved = expand(target)

  // Absolute system locations
  for (const sys of ['/etc', '/System', '/private/etc', '/var/db']) {
    if (resolved === sys || resolved.startsWith(sys + path.sep)) {
      return `Refusing to modify a protected system path: ${sys}`
    }
  }

  const protectedDirs = [...DEFAULT_PROTECTED, ...extra].map(p => expand(p))
  for (const pd of protectedDirs) {
    if (resolved === pd || resolved.startsWith(pd + path.sep)) {
      return `Refusing to modify a protected path (${path.relative(HOME, pd) || pd}). Disable the sandbox in Settings to override.`
    }
  }
  return null
}

// Tools that write/delete files — subject to the sandbox.
export const FILE_MUTATING_TOOLS = new Set(['write_file', 'edit_file', 'multi_edit', 'create_document', 'filesystem'])

export function pathFromToolInput(tool: string, input: any): string | undefined {
  if (!input) return undefined
  if (tool === 'filesystem') {
    // Only guard destructive filesystem operations
    if (['write', 'append', 'delete', 'mkdir'].includes(input.operation)) return input.path
    return undefined
  }
  return input.path
}
