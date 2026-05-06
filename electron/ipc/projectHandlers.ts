import { ipcMain } from 'electron'
import { ProjectManager } from '../core/projects/ProjectManager'

export function setupProjectHandlers() {
  ProjectManager.ensureWorkspace()

  ipcMain.handle('projects:list', async () => {
    return await ProjectManager.list()
  })

  ipcMain.handle('projects:openInFinder', async (_, { path }) => {
    await ProjectManager.openInFinder(path)
    return { ok: true }
  })

  ipcMain.handle('projects:openInEditor', async (_, { path }) => {
    await ProjectManager.openInEditor(path)
    return { ok: true }
  })

  ipcMain.handle('projects:openInBrowser', async (_, { path }) => {
    try {
      const opened = await ProjectManager.openInBrowser(path)
      return { ok: true, opened }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('projects:run', async (_, { path }) => {
    try {
      const result = await ProjectManager.run(path)
      return { ok: true, ...result }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('projects:delete', async (_, { path }) => {
    try {
      await ProjectManager.delete(path)
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('projects:workspaceDir', async () => {
    return ProjectManager.projectsDir
  })
}
