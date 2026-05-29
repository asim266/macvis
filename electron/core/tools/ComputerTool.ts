import { shellBackend } from './computer/shell'
import { nativeAvailable, nativeBackend } from './computer/native'
import { imageResult, type ToolReturn } from './types'

export const ComputerTool = {
  definition: {
    name: 'computer',
    description:
      'Control the Mac like a human: take a screenshot, move/click the mouse, type text, press keys, and scroll. ' +
      'ALWAYS take a screenshot first to see the screen, then act on coordinates from that screenshot. ' +
      'Coordinates are screen pixels (origin top-left). Use `applescript` instead when an app can be scripted directly — ' +
      'it is more reliable than pixel clicking. Requires macOS Screen Recording + Accessibility permissions.',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['screenshot', 'left_click', 'right_click', 'double_click', 'mouse_move', 'cursor_position', 'type', 'key', 'scroll', 'drag'],
        },
        x: { type: 'number', description: 'X coordinate (for click/move/scroll/drag start)' },
        y: { type: 'number', description: 'Y coordinate (for click/move/scroll/drag start)' },
        x2: { type: 'number', description: 'End X (for drag)' },
        y2: { type: 'number', description: 'End Y (for drag)' },
        text: { type: 'string', description: 'Text to type (action=type)' },
        key: { type: 'string', description: 'Key or combo, e.g. "Return", "cmd+c", "escape" (action=key)' },
        direction: { type: 'string', enum: ['up', 'down'], description: 'Scroll direction' },
        amount: { type: 'number', description: 'Scroll amount (default 5)' },
      },
      required: ['action'],
    },
  },

  async execute(input: any, config?: any): Promise<ToolReturn> {
    const { action, x, y, x2, y2, text, key, direction = 'down', amount = 5 } = input

    const enabled = config?.get?.('tools.computerUse.enabled')
    if (enabled === false) {
      return 'Computer use is disabled. Enable it in Settings → Computer Use (and grant Screen Recording + Accessibility permissions).'
    }

    const wantNative = !!config?.get?.('tools.computerUse.useNative') && nativeAvailable()
    const ctrl = wantNative ? nativeBackend : shellBackend

    try {
      switch (action) {
        case 'screenshot': {
          const { data, mimeType } = await shellBackend.screenshot()
          return imageResult(data, mimeType, '[screenshot of the current screen]')
        }
        case 'left_click': return await ctrl.click(x, y, 'left')
        case 'right_click': return await ctrl.click(x, y, 'right')
        case 'double_click': return await ctrl.click(x, y, 'double')
        case 'mouse_move': return await ctrl.move(x, y)
        case 'cursor_position': return await ctrl.cursorPosition()
        case 'drag': return await ctrl.drag(x, y, x2, y2)
        case 'scroll': return await ctrl.scroll(x ?? 0, y ?? 0, direction, amount)
        case 'type':
          if (wantNative) return await nativeBackend.type(text || '')
          return await shellBackend.type(text || '')
        case 'key':
          // System Events key handling is reliable; always use the shell path for keys.
          return await shellBackend.key(key || '')
        default:
          return `Unknown computer action: ${action}`
      }
    } catch (err: any) {
      return `Computer action "${action}" failed: ${err.message || String(err)}. ` +
        `Make sure MacVis has Screen Recording and Accessibility permissions in System Settings → Privacy & Security.`
    }
  },
}
