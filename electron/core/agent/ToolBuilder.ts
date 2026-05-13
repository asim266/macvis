import { getToolDefinitions } from '../tools'
import { MCPManager } from '../mcp/MCPManager'

export class ToolBuilder {
  static async buildAll(_config: any): Promise<any[]> {
    const native = getToolDefinitions()
    const mcpTools = MCPManager.getInstance().getAllTools()
    return [...native, ...mcpTools]
  }
}
