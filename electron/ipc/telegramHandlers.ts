import { ipcMain } from 'electron'
import { startTelegramBot, stopTelegramBot, isTelegramBotRunning } from '../core/telegram/TelegramBot'

export function setupTelegramHandlers() {
  ipcMain.handle('telegram:start', async () => {
    return await startTelegramBot()
  })

  ipcMain.handle('telegram:stop', async () => {
    await stopTelegramBot()
    return { ok: true }
  })

  ipcMain.handle('telegram:status', async () => {
    return { running: isTelegramBotRunning() }
  })

  // NOTE: a raw `shell:run` IPC handler was removed here. It executed arbitrary
  // renderer-supplied commands with no approval/sandbox/audit and was unused by
  // any renderer code — a latent renderer→RCE primitive. The agent's gated
  // BashTool is the sanctioned shell path.
}
