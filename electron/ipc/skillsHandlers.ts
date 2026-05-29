import { ipcMain } from 'electron'
import { SkillManager } from '../core/skills/SkillManager'

export function setupSkillsHandlers() {
  ipcMain.handle('skills:list', async () => {
    return SkillManager.list()
  })

  ipcMain.handle('skills:install', async (_, { source, url }) => {
    return await SkillManager.install(source || url)
  })

  ipcMain.handle('skills:uninstall', async (_, { id, name }) => {
    return await SkillManager.uninstall(id || name)
  })

  ipcMain.handle('skills:enable', async (_, { id }) => {
    return SkillManager.enable(id)
  })

  ipcMain.handle('skills:disable', async (_, { id }) => {
    return SkillManager.disable(id)
  })

  ipcMain.handle('skills:read', async (_, { id }) => {
    return SkillManager.read(id)
  })
}
