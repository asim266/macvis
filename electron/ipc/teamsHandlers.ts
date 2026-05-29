import { ipcMain } from 'electron'
import { TeamOrchestrator } from '../core/agents/TeamOrchestrator'
import { ROLES } from '../core/agents/AgentRoles'

export function setupTeamsHandlers() {
  const orch = TeamOrchestrator.getInstance()

  ipcMain.handle('teams:roles', async () =>
    Object.values(ROLES).map(r => ({ id: r.id, title: r.title, icon: r.icon, color: r.color, manager: !!r.manager }))
  )
  ipcMain.handle('teams:create', async (_, { goal, roles }) => orch.create(goal, roles))
  ipcMain.handle('teams:list', async () => orch.list())
  ipcMain.handle('teams:get', async (_, { id }) => orch.get(id))
  ipcMain.handle('teams:respond', async (_, { id, decision }) => { orch.respond(id, decision); return { ok: true } })
  ipcMain.handle('teams:stop', async (_, { id }) => { orch.stop(id); return { ok: true } })
}
