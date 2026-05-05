import { ipcMain } from 'electron'
import { agentLoop } from '../core/agent/AgentLoop'

export function setupAgentHandlers() {
  ipcMain.handle('agent:run', async (_, { message, sessionId }) => {
    agentLoop.run(message, sessionId)
    return { ok: true }
  })

  ipcMain.handle('agent:stop', async (_, { sessionId }) => {
    agentLoop.stop(sessionId)
    return { ok: true }
  })
}
