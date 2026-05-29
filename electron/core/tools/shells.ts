import { spawn, type ChildProcess } from 'child_process'

interface BgShell {
  id: string
  command: string
  child: ChildProcess
  buffer: string
  readCursor: number
  status: 'running' | 'exited'
  exitCode: number | null
  startedAt: number
}

const shells = new Map<string, BgShell>()
let counter = 0

export function startBackgroundShell(command: string, cwd?: string): { id: string } {
  const id = `bash_${Date.now().toString(36)}_${++counter}`
  const child = spawn('bash', ['-lc', command], {
    cwd: cwd || process.env.HOME,
    env: process.env,
  })
  const shell: BgShell = {
    id, command, child, buffer: '', readCursor: 0,
    status: 'running', exitCode: null, startedAt: Date.now(),
  }
  const append = (d: Buffer) => {
    shell.buffer += d.toString()
    // Cap retained buffer to last ~256KB
    if (shell.buffer.length > 262144) shell.buffer = shell.buffer.slice(-262144)
  }
  child.stdout?.on('data', append)
  child.stderr?.on('data', append)
  child.on('exit', (code) => { shell.status = 'exited'; shell.exitCode = code })
  child.on('error', (err) => { shell.buffer += `\n[spawn error: ${err.message}]`; shell.status = 'exited'; shell.exitCode = -1 })
  shells.set(id, shell)
  return { id }
}

export function readBackgroundShell(id: string): string {
  const shell = shells.get(id)
  if (!shell) return `Error: no background shell with id ${id}`
  const fresh = shell.buffer.slice(shell.readCursor)
  shell.readCursor = shell.buffer.length
  const header = `[${id}] ${shell.status}${shell.exitCode != null ? ` (exit ${shell.exitCode})` : ''}`
  return `${header}\n${fresh || '(no new output)'}`
}

export function killBackgroundShell(id: string): string {
  const shell = shells.get(id)
  if (!shell) return `Error: no background shell with id ${id}`
  try { shell.child.kill('SIGTERM') } catch {}
  shell.status = 'exited'
  shells.delete(id)
  return `Killed background shell ${id} (${shell.command}).`
}

export function listBackgroundShells(): string {
  if (shells.size === 0) return 'No background shells running.'
  return Array.from(shells.values())
    .map(s => `${s.id} · ${s.status}${s.exitCode != null ? ` (exit ${s.exitCode})` : ''} · ${s.command}`)
    .join('\n')
}
