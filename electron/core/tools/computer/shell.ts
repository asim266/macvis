import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'

const execFileAsync = promisify(execFile)

let cliclickChecked = false
let hasCliclick = false
export async function cliclickAvailable(): Promise<boolean> {
  if (cliclickChecked) return hasCliclick
  cliclickChecked = true
  try { await execFileAsync('cliclick', ['-V']); hasCliclick = true } catch { hasCliclick = false }
  return hasCliclick
}

const CLICLICK_HINT =
  'Mouse/scroll control needs `cliclick` (brew install cliclick) or the optional native backend ' +
  '(enable Settings → Computer Use → native). Screenshots and keyboard/typing work without it.'

async function osa(script: string): Promise<string> {
  const child = execFile('osascript', ['-e', script], { timeout: 30000 })
  return new Promise((resolve) => {
    let out = '', err = ''
    child.stdout?.on('data', d => out += d)
    child.stderr?.on('data', d => err += d)
    child.on('close', () => resolve(out.trim() || err.trim() || 'OK'))
  })
}

// Map friendly key names to AppleScript `key code` numbers.
const KEY_CODES: Record<string, number> = {
  return: 36, enter: 36, tab: 48, space: 49, delete: 51, backspace: 51,
  escape: 53, esc: 53, left: 123, right: 124, down: 125, up: 126,
  home: 115, end: 119, pageup: 116, pagedown: 121, forwarddelete: 117,
  f1: 122, f2: 120, f3: 99, f4: 118, f5: 96, f6: 97, f7: 98, f8: 100,
}
const MODIFIERS: Record<string, string> = {
  cmd: 'command down', command: 'command down', ctrl: 'control down', control: 'control down',
  alt: 'option down', opt: 'option down', option: 'option down', shift: 'shift down',
}

export const shellBackend = {
  async screenshot(): Promise<{ data: string; mimeType: string }> {
    const tmp = path.join(os.tmpdir(), `macvis-shot-${Date.now()}.png`)
    await execFileAsync('screencapture', ['-x', '-t', 'png', tmp])
    const buf = await fs.readFile(tmp)
    await fs.unlink(tmp).catch(() => {})
    return { data: buf.toString('base64'), mimeType: 'image/png' }
  },

  async cursorPosition(): Promise<string> {
    if (await cliclickAvailable()) {
      const { stdout } = await execFileAsync('cliclick', ['p'])
      return `Cursor at ${stdout.trim()}`
    }
    return CLICLICK_HINT
  },

  async move(x: number, y: number): Promise<string> {
    if (await cliclickAvailable()) { await execFileAsync('cliclick', [`m:${x},${y}`]); return `Moved to ${x},${y}` }
    return CLICLICK_HINT
  },

  async click(x: number, y: number, button: 'left' | 'right' | 'double' = 'left'): Promise<string> {
    if (await cliclickAvailable()) {
      const cmd = button === 'right' ? `rc:${x},${y}` : button === 'double' ? `dc:${x},${y}` : `c:${x},${y}`
      await execFileAsync('cliclick', [cmd])
      return `${button} click at ${x},${y}`
    }
    return CLICLICK_HINT
  },

  async drag(x1: number, y1: number, x2: number, y2: number): Promise<string> {
    if (await cliclickAvailable()) {
      await execFileAsync('cliclick', [`dd:${x1},${y1}`, `du:${x2},${y2}`])
      return `Dragged ${x1},${y1} → ${x2},${y2}`
    }
    return CLICLICK_HINT
  },

  async scroll(_x: number, _y: number, direction: 'up' | 'down', amount = 5): Promise<string> {
    if (await cliclickAvailable()) {
      // cliclick has no native scroll; approximate with arrow keys via System Events
    }
    const code = direction === 'up' ? 126 : 125
    await osa(`tell application "System Events" to repeat ${amount} times
  key code ${code}
end repeat`)
    return `Scrolled ${direction} ${amount}`
  },

  async type(text: string): Promise<string> {
    const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    await osa(`tell application "System Events" to keystroke "${escaped}"`)
    return `Typed ${text.length} chars`
  },

  async key(combo: string): Promise<string> {
    const parts = combo.toLowerCase().split(/[+\-\s]+/).filter(Boolean)
    const mods = parts.filter(p => MODIFIERS[p]).map(p => MODIFIERS[p])
    const main = parts.find(p => !MODIFIERS[p]) || ''
    const using = mods.length ? ` using {${mods.join(', ')}}` : ''

    if (KEY_CODES[main] != null) {
      await osa(`tell application "System Events" to key code ${KEY_CODES[main]}${using}`)
    } else if (main.length === 1) {
      await osa(`tell application "System Events" to keystroke "${main}"${using}`)
    } else {
      return `Unknown key: "${combo}". Supported: single chars, ${Object.keys(KEY_CODES).join(', ')}, with cmd/ctrl/alt/shift modifiers.`
    }
    return `Pressed ${combo}`
  },
}
