import { ConfigStore } from '../config/ConfigStore'
import { SkillManager } from '../skills/SkillManager'
import { MCPManager } from '../mcp/MCPManager'
import { findServer } from '../mcp/MCPRegistry'
import { getMainWindow } from '../../main'
import { PACK_REGISTRY, findPack, type Pack } from './PackRegistry'

function getNested(obj: any, dotPath: string): any {
  return dotPath.split('.').reduce((o, k) => o?.[k], obj)
}

function emit(packId: string, stage: string, detail: string) {
  getMainWindow()?.webContents.send('pack:status', { packId, stage, detail })
}

export interface PackResult {
  ok: boolean
  installedSkills: string[]
  connectedMcps: string[]
  pendingMcps: { id: string; reason: string }[]
  missingKeys: { configKey: string; label: string; docsUrl?: string }[]
  setup: { label: string; command: string }[]
}

export interface PackInfo extends Pack {
  installed: boolean
}

export const PackManager = {
  list(): PackInfo[] {
    const config = ConfigStore.getInstance()
    const installed = new Set((config.get('packs.installed') as string[]) || [])
    return PACK_REGISTRY.map(p => ({ ...p, installed: installed.has(p.id) }))
  },

  /** Are all of an MCP's required inputs filled? (no inputs ⇒ may be OAuth/none) */
  mcpInputsFilled(mcpId: string): { filled: boolean; hasInputs: boolean } {
    const def = findServer(mcpId)
    if (!def || !def.inputs || def.inputs.length === 0) return { filled: false, hasInputs: false }
    const config = ConfigStore.getInstance()
    const cfg = config.get() as any
    const filled = def.inputs.every(i => !!getNested(cfg, i.configKey))
    return { filled, hasInputs: true }
  },

  async install(packId: string): Promise<PackResult> {
    const pack = findPack(packId)
    if (!pack) {
      return { ok: false, installedSkills: [], connectedMcps: [], pendingMcps: [], missingKeys: [], setup: [] }
    }
    const config = ConfigStore.getInstance()
    const cfg = config.get() as any

    const result: PackResult = {
      ok: true, installedSkills: [], connectedMcps: [], pendingMcps: [],
      missingKeys: [], setup: pack.setup || [],
    }

    // 1) Skills — install + enable
    for (const skillId of pack.skills) {
      emit(packId, 'skill', `Installing skill ${skillId}…`)
      const r = await SkillManager.install(skillId)
      if (r.ok && r.id) result.installedSkills.push(r.id)
    }

    // 2) MCPs — mark enabled; connect those that are ready
    const mcp = MCPManager.getInstance()
    for (const mcpId of pack.mcps) {
      const def = findServer(mcpId)
      if (!def) continue
      config.set(`mcps.${mcpId}.enabled`, true)
      const { filled, hasInputs } = this.mcpInputsFilled(mcpId)
      if (!hasInputs || filled) {
        emit(packId, 'mcp', `Connecting ${def.name}…`)
        try {
          const c = await mcp.connect(mcpId)
          if (c.ok) result.connectedMcps.push(mcpId)
          else result.pendingMcps.push({ id: mcpId, reason: c.error || 'connection failed' })
        } catch (err: any) {
          result.pendingMcps.push({ id: mcpId, reason: err.message || 'connection failed' })
        }
      } else {
        result.pendingMcps.push({ id: mcpId, reason: 'needs credentials in Integrations' })
      }
    }

    // 3) API keys the pack wants but that aren't set yet
    for (const k of pack.apiKeys || []) {
      if (!getNested(cfg, k.configKey)) {
        result.missingKeys.push({ configKey: k.configKey, label: k.label, docsUrl: k.docsUrl })
      }
    }

    // 4) Record installed
    const installed = new Set((config.get('packs.installed') as string[]) || [])
    installed.add(packId)
    config.set('packs.installed', Array.from(installed))

    emit(packId, 'done', `Pack "${pack.name}" installed.`)
    return result
  },

  async uninstall(packId: string): Promise<{ ok: boolean }> {
    const config = ConfigStore.getInstance()
    const installed = ((config.get('packs.installed') as string[]) || []).filter(p => p !== packId)
    config.set('packs.installed', installed)
    // Skills/MCPs are left in place (other packs may share them); user can remove individually.
    return { ok: true }
  },
}
