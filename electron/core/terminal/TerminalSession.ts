import { spawn, type ChildProcess } from 'child_process'
import os from 'os'
import { getMainWindow } from '../../main'

interface Session { id: string; child: ChildProcess }

const sessions = new Map<string, Session>()
let _ctr = 0

function emit(id: string, data: string) {
  getMainWindow()?.webContents.send('terminal:data', { id, data })
}

export const TerminalManager = {
  create(cwd?: string): { id: string } {
    const id = `term_${Date.now().toString(36)}_${(++_ctr).toString(36)}`
    // Line-oriented shell: commands are written to stdin; stdout/stderr stream back.
    const child = spawn('bash', [], {
      cwd: cwd || os.homedir(),
      env: { ...process.env, TERM: 'dumb', PS1: '' },
    })
    child.stdout?.on('data', (d: Buffer) => emit(id, d.toString()))
    child.stderr?.on('data', (d: Buffer) => emit(id, d.toString()))
    child.on('exit', (code) => { emit(id, `\n[process exited${code != null ? ` with code ${code}` : ''}]\n`); sessions.delete(id) })
    child.on('error', (err) => emit(id, `\n[shell error: ${err.message}]\n`))
    sessions.set(id, { id, child })
    // Print the working directory as an initial prompt cue.
    setTimeout(() => child.stdin?.write('echo "MacVis shell — $(pwd)"\n'), 50)
    return { id }
  },

  input(id: string, data: string) {
    sessions.get(id)?.child.stdin?.write(data)
  },

  kill(id: string) {
    const s = sessions.get(id)
    if (s) { try { s.child.kill('SIGTERM') } catch {} sessions.delete(id) }
  },

  /** Terminate every live shell (called on app quit so none are orphaned). */
  killAll() {
    for (const s of sessions.values()) {
      try { s.child.kill('SIGTERM') } catch {}
    }
    sessions.clear()
  },
}
