import { execFile } from 'child_process'
import { promisify } from 'util'

const exec = promisify(execFile)
const osa = (script: string) => exec('osascript', ['-e', script]).then(r => r.stdout.trim()).catch((e: any) => `Error: ${e.stderr?.trim() || e.message}`)

export const SystemControlTool = {
  definition: {
    name: 'system_control',
    description:
      'Control macOS system settings: volume, mute, dark mode, display sleep, lock screen, and read battery status. ' +
      'Use for "turn the volume down", "switch to dark mode", "lock my screen", "how much battery is left", etc.',
    input_schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['set_volume', 'mute', 'unmute', 'get_volume', 'dark_mode', 'light_mode', 'toggle_appearance', 'sleep_display', 'lock_screen', 'battery'] },
        value: { type: 'number', description: 'Volume 0–100 (set_volume)' },
      },
      required: ['action'],
    },
  },

  async execute({ action, value }: any) {
    switch (action) {
      case 'set_volume': {
        const v = Math.max(0, Math.min(100, Number(value ?? 50)))
        await osa(`set volume output volume ${v}`)
        return `Volume set to ${v}%`
      }
      case 'get_volume':
        return `Output volume: ${await osa('output volume of (get volume settings)')}%`
      case 'mute':
        await osa('set volume with output muted'); return 'Muted.'
      case 'unmute':
        await osa('set volume without output muted'); return 'Unmuted.'
      case 'dark_mode':
        await osa('tell application "System Events" to tell appearance preferences to set dark mode to true'); return 'Dark mode on.'
      case 'light_mode':
        await osa('tell application "System Events" to tell appearance preferences to set dark mode to false'); return 'Light mode on.'
      case 'toggle_appearance':
        await osa('tell application "System Events" to tell appearance preferences to set dark mode to not dark mode'); return 'Toggled appearance.'
      case 'sleep_display':
        await exec('pmset', ['displaysleepnow']).catch(() => {}); return 'Display sleeping.'
      case 'lock_screen':
        await exec('/System/Library/CoreServices/Menu Extras/User.menu/Contents/Resources/CGSession', ['-suspend']).catch(() => {}); return 'Screen locked.'
      case 'battery': {
        const out = await exec('pmset', ['-g', 'batt']).then(r => r.stdout.trim()).catch((e: any) => e.message)
        return out
      }
      default:
        return `Unknown system action: ${action}`
    }
  },
}
