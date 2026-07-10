// Central authority for "is this tool call dangerous enough to require human
// approval?". Shared by BOTH the interactive AgentLoop and the headless
// AgentRunner (sub-agents / teams) so the HITL gate can never be bypassed by
// simply delegating the action to a sub-agent. Pure (no electron import) so it
// is unit-testable.

// Bash patterns that get a more specific "destructive" reason label. Note: ALL
// bash is gated when approval is on (a shell-command denylist cannot be made
// safe), so this list only sharpens the wording shown to the user.
export const DANGEROUS_BASH = [
  /\brm\s+-[rf]/, /\brm\s+.*-[rf]/, /\bsudo\b/, /\bmkfs/, /\bdd\s+if=/, /\bshutdown\b/, /\breboot\b/,
  /\bkillall\b/, /\bchmod\s+-R\s+777/, /\b>\s*\/dev\/sd/, /\bgit\s+push\b.*--force/, /\bgit\s+push\s+-f\b/,
  /\bnpm\s+publish\b/, /\bcurl\b[^|]*\|\s*(sudo\s+)?(ba)?sh\b/, /\bwget\b[^|]*\|\s*(sudo\s+)?(ba)?sh\b/,
  /\bdiskutil\s+(erase|reformat)/, /\bdefaults\s+delete\b/, /\bfind\b[^|]*-delete\b/, /\blaunchctl\s+(load|unload|bootstrap)/,
  /\bcrontab\b/, /\bosascript\b/, /\bbase64\s+-[dD]\b[^|]*\|\s*(ba)?sh\b/,
  /(^|[\s;&|])(python3?|node|perl|ruby)\s+-[ec]\b/,
]

// Tools that are themselves arbitrary code-execution or state-changing
// primitives and must always be gated (regardless of their arguments) when
// approval is enabled. A per-argument denylist on these is unsound — e.g.
// AppleScript's `do shell script "..."` / JXA give unlimited phrasings — so we
// gate the tool itself.
const ALWAYS_DANGEROUS_TOOLS = new Set(['applescript', 'system_control'])

export interface DangerVerdict {
  danger: boolean
  reason?: string
}

/** Classify a tool call. Does NOT consult config — callers combine this with
 *  the `tools.requireApproval` flag. */
export function isDangerousTool(name: string, input: any): DangerVerdict {
  if (name === 'bash') {
    const cmd = String(input?.command || '')
    for (const re of DANGEROUS_BASH) {
      if (re.test(cmd)) return { danger: true, reason: 'Potentially destructive shell command' }
    }
    // Any other shell command is still arbitrary code execution — gate it.
    return { danger: true, reason: 'Runs a shell command on your Mac' }
  }
  if (name === 'applescript') return { danger: true, reason: 'Runs AppleScript/JXA (can execute arbitrary shell)' }
  if (name === 'system_control') return { danger: true, reason: 'Changes system state (lock/sleep/volume/appearance)' }
  if (ALWAYS_DANGEROUS_TOOLS.has(name)) return { danger: true, reason: 'Potentially impactful action' }
  if (name === 'filesystem' && input?.operation === 'delete') return { danger: true, reason: 'Deletes files/directories' }
  if (name === 'mail' && input?.operation === 'send') return { danger: true, reason: 'Sends an email on your behalf' }
  return { danger: false }
}

/** Whether a tool call must be approved, given the current approval setting. */
export function needsApproval(name: string, input: any, requireApproval: boolean): DangerVerdict {
  if (!requireApproval) return { danger: false }
  return isDangerousTool(name, input)
}
