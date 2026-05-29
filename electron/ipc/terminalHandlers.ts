import { ipcMain } from 'electron'
import { TerminalManager } from '../core/terminal/TerminalSession'

export function setupTerminalHandlers() {
  ipcMain.handle('terminal:create', async (_, { cwd }) => TerminalManager.create(cwd))
  ipcMain.handle('terminal:input', async (_, { id, data }) => { TerminalManager.input(id, data); return { ok: true } })
  ipcMain.handle('terminal:kill', async (_, { id }) => { TerminalManager.kill(id); return { ok: true } })
}
