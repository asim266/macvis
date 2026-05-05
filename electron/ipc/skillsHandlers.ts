import { ipcMain } from 'electron'

export function setupSkillsHandlers() {
  ipcMain.handle('skills:list', async () => {
    return []
  })

  ipcMain.handle('skills:install', async (_, { url }) => {
    return { ok: true, url }
  })

  ipcMain.handle('skills:uninstall', async (_, { name }) => {
    return { ok: true, name }
  })
}
