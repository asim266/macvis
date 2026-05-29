import { ConfigStore } from '../config/ConfigStore'
import { resolveChain, PROVIDER_KEY_PATH } from '../agent/AgentLoop'
import { getProvider } from '../agent/providers'
import type { CommonMessage, ContentBlock } from '../agent/providers/types'
import { ToolBuilder } from '../agent/ToolBuilder'
import { executeTool } from '../tools'
import { isImageToolResult } from '../tools/types'

export interface RunnerEvents {
  onText?: (text: string) => void
  onTool?: (name: string, input: any, result?: string, status?: 'running' | 'done') => void
}

export interface RunnerResult {
  text: string
  toolCount: number
  stopped: boolean
}

/**
 * Run a single agent (system + one user task) to completion: a full tool-use
 * loop reusing the configured provider chain and the native + MCP tools.
 * Returns the agent's final text. Used by the team orchestrator for each agent.
 */
export async function runAgent(opts: {
  system: string
  message: string
  config?: ConfigStore
  maxSteps?: number
  signal?: () => boolean   // return true to abort between steps
  events?: RunnerEvents
}): Promise<RunnerResult> {
  const config = opts.config || ConfigStore.getInstance()
  const maxSteps = opts.maxSteps ?? 24
  const events = opts.events || {}

  const chain = resolveChain(config).filter(c => {
    if (c.provider === 'ollama') return true
    return !!(config.get(PROVIDER_KEY_PATH[c.provider]) as string)
  })
  if (chain.length === 0) throw new Error('No usable model — configure an API key in Settings.')

  const tools = await ToolBuilder.buildAll(config)
  const messages: CommonMessage[] = [{ role: 'user', content: opts.message }]

  let finalText = ''
  let toolCount = 0

  for (let step = 0; step < maxSteps; step++) {
    if (opts.signal?.()) return { text: finalText, toolCount, stopped: true }

    // Try providers in chain order
    let final: any = null
    let lastErr: any = null
    for (const slot of chain) {
      try {
        const provider = getProvider(slot.provider)
        final = await provider.stream(
          {
            apiKey: (config.get(PROVIDER_KEY_PATH[slot.provider]) as string) || '',
            model: slot.model,
            system: opts.system,
            messages,
            tools,
          },
          { onText: t => events.onText?.(t), onToolStart: () => {} }
        )
        break
      } catch (err: any) {
        lastErr = err
      }
    }
    if (!final) throw lastErr || new Error('All providers failed.')

    finalText = final.text || finalText
    messages.push({ role: 'assistant', content: final.content })

    if (final.stopReason !== 'tool_use' || final.toolUses.length === 0) {
      return { text: finalText, toolCount, stopped: false }
    }

    // Execute tool calls
    const resultBlocks: ContentBlock[] = []
    for (const tu of final.toolUses) {
      events.onTool?.(tu.name, tu.input, undefined, 'running')
      let result: any
      try {
        result = await executeTool(tu.name, tu.input, config)
      } catch (err: any) {
        result = `Error: ${err.message || String(err)}`
      }
      toolCount++
      let content: any
      let display: string
      if (isImageToolResult(result)) { content = result.blocks; display = result.display }
      else { display = typeof result === 'string' ? result : JSON.stringify(result); content = display }
      events.onTool?.(tu.name, tu.input, display.slice(0, 400), 'done')
      resultBlocks.push({ type: 'tool_result', tool_use_id: tu.id, content })
    }
    messages.push({ role: 'user', content: resultBlocks })
  }

  return { text: finalText + '\n\n[reached step limit]', toolCount, stopped: false }
}
