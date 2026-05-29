import { ipcMain } from 'electron'
import { PackManager } from '../core/packs/PackManager'
import { PACK_REGISTRY } from '../core/packs/PackRegistry'

export function setupPacksHandlers() {
  ipcMain.handle('packs:registry', async () => PACK_REGISTRY)
  ipcMain.handle('packs:list', async () => PackManager.list())
  ipcMain.handle('packs:install', async (_, { packId }) => PackManager.install(packId))
  ipcMain.handle('packs:uninstall', async (_, { packId }) => PackManager.uninstall(packId))
}
