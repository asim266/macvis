import { ipcMain } from 'electron'
import { ConfigStore } from '../core/config/ConfigStore'

export function setupConfigHandlers() {
  const config = ConfigStore.getInstance()

  ipcMain.handle('config:get', async (_, { key }) => {
    return config.get(key)
  })

  ipcMain.handle('config:set', async (_, { key, value }) => {
    config.set(key, value)
    return { ok: true }
  })
}
