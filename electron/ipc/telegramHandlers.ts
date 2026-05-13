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

  ipcMain.handle('shell:run', async (_, { command }) => {
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)
    try {
      const { stdout, stderr } = await execAsync(command)
      return { stdout, stderr }
    } catch (err: any) {
      return { error: err.message }
    }
  })
}
