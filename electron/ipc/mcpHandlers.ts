import { ipcMain } from 'electron'

export function setupMCPHandlers() {
  ipcMain.handle('mcp:list', async () => {
    return []
  })

  ipcMain.handle('mcp:connect', async (_, { name }) => {
    return { ok: true, name }
  })

  ipcMain.handle('mcp:disconnect', async (_, { name }) => {
    return { ok: true, name }
  })

  ipcMain.handle('mcp:install', async (_, { name, command, args }) => {
    return { ok: true, name, command, args }
  })
}
