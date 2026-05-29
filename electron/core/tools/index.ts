import { BashTool } from './BashTool'
import { BashOutputTool, KillShellTool } from './ProcessTool'
import { FilesystemTool } from './FilesystemTool'
import { ReadFileTool } from './ReadFileTool'
import { WriteFileTool } from './WriteFileTool'
import { EditFileTool } from './EditFileTool'
import { MultiEditTool } from './MultiEditTool'
import { GlobTool } from './GlobTool'
import { GrepTool } from './GrepTool'
import { WebSearchTool } from './WebSearchTool'
import { WebFetchTool } from './WebFetchTool'
import { TodoTool } from './TodoTool'
import { AppleScriptTool } from './AppleScriptTool'
import { ComputerTool } from './ComputerTool'
import { ClipboardTool } from './ClipboardTool'
import { NotifyTool } from './NotifyTool'
import { OpenTool } from './OpenTool'
import { ImageGenTool } from './ImageGenTool'
import { SkillTool } from './SkillTool'
import { ConfigStore } from '../config/ConfigStore'
import { MCPManager } from '../mcp/MCPManager'

const TOOLS = [
  // Execution
  BashTool, BashOutputTool, KillShellTool,
  // File & code
  ReadFileTool, WriteFileTool, EditFileTool, MultiEditTool, FilesystemTool,
  // Search
  GlobTool, GrepTool,
  // Web
  WebSearchTool, WebFetchTool,
  // Planning / skills
  TodoTool, SkillTool,
  // macOS automation & computer use
  AppleScriptTool, ComputerTool, ClipboardTool, NotifyTool, OpenTool,
  // Media
  ImageGenTool,
]

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
