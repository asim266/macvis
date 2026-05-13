import { BashTool } from './BashTool'
import { FilesystemTool } from './FilesystemTool'
import { WebSearchTool } from './WebSearchTool'
import { ConfigStore } from '../config/ConfigStore'
import { MCPManager } from '../mcp/MCPManager'

const TOOLS = [BashTool, FilesystemTool, WebSearchTool]

export function getToolDefinitions() {
  return TOOLS.map(t => t.definition)
}

export async function executeTool(name: string, input: any, config: ConfigStore) {
  // MCP-namespaced tools go through the MCPManager
  if (name.includes('__')) {
    return await MCPManager.getInstance().callTool(name, input)
  }
  const tool = TOOLS.find(t => t.definition.name === name)
  if (!tool) return `Unknown tool: ${name}`
  return await (tool.execute as any)(input, config)
}
