import { ipcMain } from 'electron'

export function setupTelegramHandlers() {
  ipcMain.handle('telegram:start', async () => {
    return { ok: true }
  })

  ipcMain.handle('telegram:stop', async () => {
    return { ok: true }
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
