import { ipcMain } from 'electron'
import { MCPManager } from '../core/mcp/MCPManager'
import { MCP_REGISTRY } from '../core/mcp/MCPRegistry'

export function setupMCPHandlers() {
  ipcMain.handle('mcp:list', async () => {
    return MCPManager.getInstance().list()
  })

  ipcMain.handle('mcp:registry', async () => {
    return MCP_REGISTRY
  })

  ipcMain.handle('mcp:connect', async (_, { id }) => {
    return await MCPManager.getInstance().connect(id)
  })

  ipcMain.handle('mcp:disconnect', async (_, { id }) => {
    return await MCPManager.getInstance().disconnect(id)
  })

  ipcMain.handle('mcp:installCustom', async (_, { name, command, args, env }) => {
    return await MCPManager.getInstance().installCustom({ name, command, args, env })
  })

  ipcMain.handle('mcp:uninstallCustom', async (_, { id }) => {
    await MCPManager.getInstance().uninstallCustom(id)
    return { ok: true }
  })

  ipcMain.handle('mcp:autoConnectEnabled', async () => {
    await MCPManager.getInstance().connectAllEnabled()
    return { ok: true }
  })
}
