import { ipcMain } from 'electron'
import { Scheduler } from '../core/scheduler/Scheduler'

export function setupSchedulerHandlers() {
  ipcMain.handle('scheduler:list', async () => Scheduler.list())
  ipcMain.handle('scheduler:create', async (_, input) => Scheduler.create(input))
  ipcMain.handle('scheduler:update', async (_, { id, patch }) => Scheduler.update(id, patch))
  ipcMain.handle('scheduler:remove', async (_, { id }) => { Scheduler.remove(id); return { ok: true } })
  ipcMain.handle('scheduler:runNow', async (_, { id }) => Scheduler.runNow(id))
}
