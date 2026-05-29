// Optional native backend backed by @nut-tree-fork/nut-js (or @nut-tree/nut-js).
// Loaded lazily so the app runs fine when the package is not installed.
// Screenshots still come from the shell backend (screencapture) for fidelity.
let nut: any = null
let loadTried = false

export function nativeAvailable(): boolean {
  if (loadTried) return !!nut
  loadTried = true
  for (const pkg of ['@nut-tree-fork/nut-js', '@nut-tree/nut-js', 'nut-js']) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      nut = require(pkg)
      break
    } catch { /* not installed */ }
  }
  if (nut?.mouse) nut.mouse.config.autoDelayMs = 2
  return !!nut
}

export const nativeBackend = {
  async move(x: number, y: number): Promise<string> {
    await nut.mouse.setPosition(new nut.Point(x, y))
    return `Moved to ${x},${y}`
  },
  async cursorPosition(): Promise<string> {
    const p = await nut.mouse.getPosition()
    return `Cursor at ${p.x},${p.y}`
  },
  async click(x: number, y: number, button: 'left' | 'right' | 'double' = 'left'): Promise<string> {
    await nut.mouse.setPosition(new nut.Point(x, y))
    if (button === 'double') await nut.mouse.doubleClick(nut.Button.LEFT)
    else await nut.mouse.click(button === 'right' ? nut.Button.RIGHT : nut.Button.LEFT)
    return `${button} click at ${x},${y}`
  },
  async drag(x1: number, y1: number, x2: number, y2: number): Promise<string> {
    await nut.mouse.setPosition(new nut.Point(x1, y1))
    await nut.mouse.pressButton(nut.Button.LEFT)
    await nut.mouse.setPosition(new nut.Point(x2, y2))
    await nut.mouse.releaseButton(nut.Button.LEFT)
    return `Dragged ${x1},${y1} → ${x2},${y2}`
  },
  async scroll(_x: number, _y: number, direction: 'up' | 'down', amount = 5): Promise<string> {
    if (direction === 'up') await nut.mouse.scrollUp(amount * 20)
    else await nut.mouse.scrollDown(amount * 20)
    return `Scrolled ${direction} ${amount}`
  },
  async type(text: string): Promise<string> {
    await nut.keyboard.type(text)
    return `Typed ${text.length} chars`
  },
}
