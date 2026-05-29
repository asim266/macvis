import { ipcMain } from 'electron'
import { WebhookServer } from '../core/webhooks/WebhookServer'
import { AuditLog } from '../core/audit/AuditLog'

export function setupSystemHandlers() {
  ipcMain.handle('webhook:start', async () => WebhookServer.start())
  ipcMain.handle('webhook:stop', async () => WebhookServer.stop())
  ipcMain.handle('webhook:status', async () => ({ running: WebhookServer.isRunning() }))
  ipcMain.handle('audit:tail', async (_, { n }) => AuditLog.tail(n || 100))
}
