import { ConfigStore } from '../config/ConfigStore'
import { resolveChain, PROVIDER_KEY_PATH } from '../agent/AgentLoop'
import { getProvider } from '../agent/providers'
import type { CommonMessage, ContentBlock } from '../agent/providers/types'
import { ToolBuilder } from '../agent/ToolBuilder'
import { executeTool } from '../tools'
import { isImageToolResult } from '../tools/types'
import { needsApproval } from '../agent/toolGate'
import { AuditLog } from '../audit/AuditLog'

export interface RunnerEvents {
  onText?: (text: string) => void
  onTool?: (name: string, input: any, result?: string, status?: 'running' | 'done') => void
}

/** Ask a human to approve a dangerous sub-agent tool call. Returns true to run. */
export type ApproveFn = (toolUse: { id: string; name: string; input: any; reason?: string }) => Promise<boolean>

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
  /** Surface dangerous tool calls for HITL approval. When approval is enabled
   *  and this is omitted, dangerous tools are denied (a headless agent has no
   *  way to prompt the user). */
  approve?: ApproveFn
}): Promise<RunnerResult> {
  const config = opts.config || ConfigStore.getInstance()
  const maxSteps = opts.maxSteps ?? 24
  const events = opts.events || {}
  const requireApproval = config.get('tools.requireApproval') !== false

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

      // HITL gate — enforced on the sub-agent/team path too, so a dangerous
      // action can't bypass approval by being delegated. If approval is on and
      // no approver is wired (fully headless), dangerous tools are denied.
      const gate = needsApproval(tu.name, tu.input, requireApproval)
      if (gate.danger) {
        let approved = false
        if (opts.approve) {
          try { approved = await opts.approve({ id: tu.id, name: tu.name, input: tu.input, reason: gate.reason }) } catch { approved = false }
        }
        if (!approved) {
          result = `Denied (HITL): ${gate.reason || 'action requires approval'}. A sub-agent cannot run this unattended — the user declined or was not present. Do not retry; report back instead.`
          events.onTool?.(tu.name, tu.input, String(result).slice(0, 400), 'done')
          try { AuditLog.record({ sessionId: 'subagent', tool: tu.name, input: tu.input, ok: false, denied: true }) } catch {}
          toolCount++
          resultBlocks.push({ type: 'tool_result', tool_use_id: tu.id, content: result })
          continue
        }
      }

      const _t0 = Date.now()
      try {
        result = await executeTool(tu.name, tu.input, config)
        try { AuditLog.record({ sessionId: 'subagent', tool: tu.name, input: tu.input, ok: true, ms: Date.now() - _t0 }) } catch {}
      } catch (err: any) {
        result = `Error: ${err.message || String(err)}`
        try { AuditLog.record({ sessionId: 'subagent', tool: tu.name, input: tu.input, ok: false, ms: Date.now() - _t0 }) } catch {}
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
