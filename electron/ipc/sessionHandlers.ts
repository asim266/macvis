import { ipcMain } from 'electron'
import { SessionStore } from '../core/sessions/SessionStore'

export function setupSessionHandlers() {
  ipcMain.handle('sessions:list', async () => {
    return await SessionStore.list()
  })

  ipcMain.handle('sessions:load', async (_, { id }) => {
    return await SessionStore.load(id)
  })

  ipcMain.handle('sessions:delete', async (_, { id }) => {
    await SessionStore.delete(id)
    return { ok: true }
  })

  ipcMain.handle('sessions:rename', async (_, { id, title }) => {
    const session = await SessionStore.load(id)
    if (!session) return { ok: false, error: 'not found' }
    session.title = title
    session.updatedAt = Date.now()
    await SessionStore.saveNow(session)
    return { ok: true }
  })
}
