import fs from 'fs'
import path from 'path'
import os from 'os'

const HOME = os.homedir()

// Paths that file-mutating tools must never touch, even with approval off.
// Pure-ish function (no electron import) so it is unit-testable.
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
  // MacVis's own state + secret store (writing config.json could disable the
  // sandbox / approval gate; ~/.macvis holds sessions, logs, memory).
  '.macvis',
  'Library/Application Support/macvis',
  'Library/Application Support/macvis-nodejs',
  // Persistence / auto-run surfaces — writing these installs a backdoor.
  'Library/LaunchAgents',
  'Library/LaunchDaemons',
  '.zshrc', '.zshenv', '.zprofile', '.bashrc', '.bash_profile', '.profile',
]

// Sensitive locations that must not be READ by the LLM (secret exfiltration).
// A subset of the write-protected set focused on credentials + the app's own
// key store; ordinary project files are unaffected.
const READ_PROTECTED = [
  '.ssh',
  '.aws',
  '.gnupg',
  '.config/gcloud',
  'Library/Keychains',
  '.kube',
  '.docker/config.json',
  '.npmrc',
  '.netrc',
  '.macvis',
  'Library/Application Support/macvis',
  'Library/Application Support/macvis-nodejs',
]

function expand(p: string): string {
  if (p.startsWith('~')) p = p.replace('~', HOME)
  if (!path.isAbsolute(p)) p = path.join(HOME, p)
  let resolved = path.resolve(p)
  // Resolve symlinks on the deepest existing ancestor so a symlinked directory
  // can't be used to escape a protected prefix (best-effort; path may not exist
  // yet for writes).
  try {
    let dir = resolved
    while (dir !== path.dirname(dir) && !fs.existsSync(dir)) dir = path.dirname(dir)
    if (fs.existsSync(dir)) {
      const real = fs.realpathSync.native(dir)
      resolved = path.join(real, path.relative(dir, resolved))
    }
  } catch { /* keep lexical path */ }
  return resolved
}

// macOS default volumes are case-insensitive, so compare case-folded to prevent
// `~/.SSH` bypassing `~/.ssh`. (Over-blocks at worst on rare case-sensitive
// volumes — the safe direction.)
function isInside(resolved: string, base: string): boolean {
  const r = resolved.toLowerCase()
  const b = base.toLowerCase()
  return r === b || r.startsWith(b + path.sep)
}

function checkAgainst(target: string, bases: string[], verb: string): string | null {
  if (!target) return null
  const resolved = expand(target)
  for (const sys of ['/etc', '/System', '/private/etc', '/var/db']) {
    if (isInside(resolved, sys)) return `Refusing to ${verb} a protected system path: ${sys}`
  }
  for (const pd of bases.map(expand)) {
    if (isInside(resolved, pd)) {
      return `Refusing to ${verb} a protected path (${path.relative(HOME, pd) || pd}). Disable the sandbox in Settings to override.`
    }
  }
  return null
}

/**
 * Returns a reason string if `target` falls inside a write-protected location,
 * otherwise null. Also blocks absolute system dirs like /etc and /System.
 */
export function checkProtectedPath(target: string, extra: string[] = []): string | null {
  return checkAgainst(target, [...DEFAULT_PROTECTED, ...extra], 'modify')
}

/** Returns a reason string if `target` is a credential/secret location the LLM
 *  must not READ (SSH/cloud keys, the app's own config store), else null. */
export function checkProtectedReadPath(target: string, extra: string[] = []): string | null {
  return checkAgainst(target, [...READ_PROTECTED, ...extra], 'read')
}

// Tools that write/delete files — subject to the write sandbox.
export const FILE_MUTATING_TOOLS = new Set(['write_file', 'edit_file', 'multi_edit', 'create_document', 'filesystem'])

// Tools that read file contents — subject to the read sandbox.
export const FILE_READING_TOOLS = new Set(['read_file', 'document', 'ocr', 'filesystem'])

export function pathFromToolInput(tool: string, input: any): string | undefined {
  if (!input) return undefined
  if (tool === 'filesystem') {
    // Only guard destructive filesystem operations
    if (['write', 'append', 'delete', 'mkdir'].includes(input.operation)) return input.path
    return undefined
  }
  return input.path
}

export function readPathFromToolInput(tool: string, input: any): string | undefined {
  if (!input) return undefined
  if (tool === 'filesystem') {
    if (['read', 'list', 'exists'].includes(input.operation)) return input.path
    return undefined
  }
  return input.path
}
