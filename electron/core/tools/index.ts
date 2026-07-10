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
import { MemoryTool } from './MemoryTool'
import { SystemControlTool } from './SystemControlTool'
import { SpotlightTool } from './SpotlightTool'
import { MailTool, CalendarTool, RemindersTool, ContactsTool } from './MacAppsTools'
import { DocumentTool } from './DocumentTool'
import { CreateDocumentTool } from './CreateDocumentTool'
import { RagTool } from './RagTool'
import { SkillTool } from './SkillTool'
import { ConfigStore } from '../config/ConfigStore'
import { MCPManager } from '../mcp/MCPManager'
import { SubagentTool } from './SubagentTool'
import { OcrTool } from './OcrTool'
import {
  checkProtectedPath, FILE_MUTATING_TOOLS, pathFromToolInput,
  checkProtectedReadPath, FILE_READING_TOOLS, readPathFromToolInput,
} from '../security/sandbox'

const TOOLS = [
  // Execution
  BashTool, BashOutputTool, KillShellTool,
  // File & code
  ReadFileTool, WriteFileTool, EditFileTool, MultiEditTool, FilesystemTool,
  // Search
  GlobTool, GrepTool,
  // Web
  WebSearchTool, WebFetchTool,
  // Planning / skills / memory
  TodoTool, SkillTool, MemoryTool,
  // macOS automation & computer use
  AppleScriptTool, ComputerTool, ClipboardTool, NotifyTool, OpenTool, SystemControlTool, SpotlightTool,
  // macOS apps (real-life)
  MailTool, CalendarTool, RemindersTool, ContactsTool,
  // Documents & knowledge
  DocumentTool, CreateDocumentTool, RagTool,
  // Orchestration
  SubagentTool,
  // Media & vision
  ImageGenTool, OcrTool,
]

/** Tool definitions the model can see, excluding any the user disabled in Settings. */
export function getToolDefinitions(config?: ConfigStore) {
  const disabled = new Set((config?.get('tools.disabled') as string[]) || [])
  return TOOLS.filter(t => !disabled.has(t.definition.name)).map(t => t.definition)
}

/** All native tool names + descriptions (for the Settings enable/disable UI). */
export function getToolCatalog(): { name: string; description: string }[] {
  return TOOLS.map(t => ({ name: t.definition.name, description: (t.definition.description || '').slice(0, 120) }))
}

/** Look up a registered native tool by name (for preview/dry-run, etc.). */
export function getTool(name: string): any {
  return TOOLS.find(t => t.definition.name === name)
}

export async function executeTool(name: string, input: any, config: ConfigStore) {
  // MCP-namespaced tools go through the MCPManager
  if (name.includes('__')) {
    return await MCPManager.getInstance().callTool(name, input)
  }
  const tool = TOOLS.find(t => t.definition.name === name)
  if (!tool) return `Unknown tool: ${name}`

  // Respect per-tool disable from Settings.
  if (((config.get('tools.disabled') as string[]) || []).includes(name)) {
    return `The "${name}" tool is disabled in Settings. Ask the user to re-enable it, or use a different approach.`
  }

  // Filesystem sandbox: block writes/deletes to protected paths (keys, system dirs).
  if (config.get('tools.sandbox') !== false && FILE_MUTATING_TOOLS.has(name)) {
    const p = pathFromToolInput(name, input)
    if (p) {
      const extra = (config.get('tools.protectedPaths') as string[]) || []
      const reason = checkProtectedPath(p, extra)
      if (reason) return `Blocked by sandbox: ${reason}`
    }
  }

  // Read sandbox: block reads of credential/secret locations (SSH/cloud keys,
  // the app's own config store) so secrets can't be exfiltrated by the LLM.
  if (config.get('tools.sandbox') !== false && FILE_READING_TOOLS.has(name)) {
    const rp = readPathFromToolInput(name, input)
    if (rp) {
      const extra = (config.get('tools.protectedReadPaths') as string[]) || []
      const reason = checkProtectedReadPath(rp, extra)
      if (reason) return `Blocked by sandbox: ${reason}`
    }
  }

  return await (tool.execute as any)(input, config)
}
