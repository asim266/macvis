import { ipcMain } from 'electron'
import { agentLoop } from '../core/agent/AgentLoop'

export function setupAgentHandlers() {
  ipcMain.handle('agent:run', async (_, { message, sessionId, attachments }) => {
    agentLoop.run(message, sessionId, attachments)
    return { ok: true }
  })

  ipcMain.handle('agent:stop', async (_, { sessionId }) => {
    agentLoop.stop(sessionId)
    return { ok: true }
  })

  ipcMain.handle('agent:approve', async (_, { id, ok }) => {
    agentLoop.approve(id, !!ok)
    return { ok: true }
  })
}
