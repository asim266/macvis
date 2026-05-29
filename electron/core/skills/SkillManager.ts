import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'
import os from 'os'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { app } from 'electron'

const execFileAsync = promisify(execFile)
import { ConfigStore } from '../config/ConfigStore'
import { parseSkill, type ParsedSkill } from './SkillParser'
import { SKILL_CATALOG, findCatalogSkill, type CatalogSkill } from './SkillCatalog'

const SKILLS_DIR = path.join(os.homedir(), '.macvis', 'skills')

function ensureDir() {
  if (!fsSync.existsSync(SKILLS_DIR)) fsSync.mkdirSync(SKILLS_DIR, { recursive: true })
}

// Where bundled catalog SKILL.md files live: repo `skills/` in dev, resources in prod.
function bundledSkillsDir(): string {
  const candidates = [
    path.join(process.resourcesPath || '', 'skills'),
    path.join(app?.getAppPath?.() || process.cwd(), 'skills'),
    path.join(process.cwd(), 'skills'),
  ]
  for (const c of candidates) {
    if (c && fsSync.existsSync(c)) return c
  }
  return path.join(process.cwd(), 'skills')
}

export interface SkillInfo extends CatalogSkill {
  installed: boolean
  enabled: boolean
}

export const SkillManager = {
  skillsDir: SKILLS_DIR,

  /** Installed skill ids (folders containing SKILL.md). */
  installedIds(): string[] {
    ensureDir()
    try {
      return fsSync.readdirSync(SKILLS_DIR, { withFileTypes: true })
        .filter(e => e.isDirectory() && fsSync.existsSync(path.join(SKILLS_DIR, e.name, 'SKILL.md')))
        .map(e => e.name)
    } catch { return [] }
  },

  /** Catalog + installed/enabled state for the UI. Includes installed-but-uncatalogued skills. */
  list(): SkillInfo[] {
    const config = ConfigStore.getInstance()
    const enabled = new Set((config.get('skills.enabled') as string[]) || [])
    const installed = new Set(this.installedIds())

    const out: SkillInfo[] = SKILL_CATALOG.map(c => ({
      ...c,
      installed: installed.has(c.id),
      enabled: enabled.has(c.id),
    }))

    // Surface installed skills that aren't in the built-in catalog (e.g. user-added)
    for (const id of installed) {
      if (out.some(s => s.id === id)) continue
      const parsed = this.read(id)
      out.push({
        id,
        name: parsed?.name || id,
        description: parsed?.description || 'Custom skill',
        icon: parsed?.icon || '🧩',
        category: 'custom',
        installed: true,
        enabled: enabled.has(id),
      })
    }
    return out
  },

  /** Enabled skills' metadata, for injecting into the system prompt. */
  enabledSummaries(): Array<{ id: string; name: string; description: string; when_to_use?: string }> {
    const config = ConfigStore.getInstance()
    const enabled = (config.get('skills.enabled') as string[]) || []
    const result: Array<{ id: string; name: string; description: string; when_to_use?: string }> = []
    for (const id of enabled) {
      const parsed = this.read(id)
      if (parsed) result.push({ id, name: parsed.name, description: parsed.description, when_to_use: parsed.when_to_use })
      else {
        const c = findCatalogSkill(id)
        if (c) result.push({ id, name: c.name, description: c.description })
      }
    }
    return result
  },

  /** Read a skill's parsed content from the installed dir. */
  read(id: string): ParsedSkill | null {
    const file = path.join(SKILLS_DIR, id, 'SKILL.md')
    try {
      return parseSkill(fsSync.readFileSync(file, 'utf-8'))
    } catch { return null }
  },

  /** Install a skill from the bundled catalog, a local path, or a raw markdown string. */
  async install(source: string): Promise<{ ok: boolean; id?: string; error?: string }> {
    ensureDir()

    // 1) Catalog id → copy bundled SKILL.md
    if (findCatalogSkill(source)) {
      const src = path.join(bundledSkillsDir(), source, 'SKILL.md')
      const destDir = path.join(SKILLS_DIR, source)
      try {
        await fs.mkdir(destDir, { recursive: true })
        const content = await fs.readFile(src, 'utf-8')
        await fs.writeFile(path.join(destDir, 'SKILL.md'), content)
        this.markInstalled(source)
        return { ok: true, id: source }
      } catch (err: any) {
        return { ok: false, error: `Could not install bundled skill "${source}": ${err.message}` }
      }
    }

    // 2) Local directory containing SKILL.md
    try {
      const stat = await fs.stat(source)
      if (stat.isDirectory()) {
        const md = path.join(source, 'SKILL.md')
        const content = await fs.readFile(md, 'utf-8')
        const id = path.basename(source)
        const destDir = path.join(SKILLS_DIR, id)
        await fs.mkdir(destDir, { recursive: true })
        await fs.writeFile(path.join(destDir, 'SKILL.md'), content)
        this.markInstalled(id)
        return { ok: true, id }
      }
    } catch { /* not a local path */ }

    // 3) Git repository URL — clone shallow, find a SKILL.md
    const looksGit = /\.git$/.test(source) || (/(github|gitlab|bitbucket)\.(com|org)\//.test(source) && !/\.(md|markdown)$/i.test(source))
    if (looksGit) {
      const tmp = path.join(os.tmpdir(), `macvis-skill-${Date.now()}`)
      try {
        await execFileAsync('git', ['clone', '--depth', '1', source, tmp], { timeout: 60000 })
        // SKILL.md at root, else first subdir that has one
        let srcDir = tmp
        if (!fsSync.existsSync(path.join(tmp, 'SKILL.md'))) {
          const sub = fsSync.readdirSync(tmp, { withFileTypes: true })
            .find(e => e.isDirectory() && fsSync.existsSync(path.join(tmp, e.name, 'SKILL.md')))
          if (sub) srcDir = path.join(tmp, sub.name)
        }
        const content = await fs.readFile(path.join(srcDir, 'SKILL.md'), 'utf-8')
        const id = source.replace(/\.git$/, '').split('/').filter(Boolean).pop() || `skill-${Date.now()}`
        const destDir = path.join(SKILLS_DIR, id)
        await fs.mkdir(destDir, { recursive: true })
        await fs.writeFile(path.join(destDir, 'SKILL.md'), content)
        await fs.rm(tmp, { recursive: true, force: true }).catch(() => {})
        this.markInstalled(id)
        return { ok: true, id }
      } catch (err: any) {
        await fs.rm(tmp, { recursive: true, force: true }).catch(() => {})
        return { ok: false, error: `Git install failed: ${err.message}. Ensure the repo contains a SKILL.md.` }
      }
    }

    // 4) Raw URL to a SKILL.md / markdown file
    if (/^https?:\/\//.test(source)) {
      try {
        const res = await fetch(source)
        if (!res.ok) return { ok: false, error: `Fetch failed: HTTP ${res.status}` }
        const content = await res.text()
        const base = source.split('/').filter(Boolean)
        const id = (base[base.length - 2] || base[base.length - 1] || `skill-${Date.now()}`).replace(/[^a-z0-9-]/gi, '-').toLowerCase()
        const destDir = path.join(SKILLS_DIR, id)
        await fs.mkdir(destDir, { recursive: true })
        await fs.writeFile(path.join(destDir, 'SKILL.md'), content)
        this.markInstalled(id)
        return { ok: true, id }
      } catch (err: any) {
        return { ok: false, error: `URL install failed: ${err.message}` }
      }
    }

    return { ok: false, error: `Unknown skill source "${source}". Provide a catalog id, a local folder, a git URL, or a raw SKILL.md URL.` }
  },

  async uninstall(id: string): Promise<{ ok: boolean }> {
    try { await fs.rm(path.join(SKILLS_DIR, id), { recursive: true, force: true }) } catch {}
    const config = ConfigStore.getInstance()
    const installed = ((config.get('skills.installed') as string[]) || []).filter(s => s !== id)
    const enabled = ((config.get('skills.enabled') as string[]) || []).filter(s => s !== id)
    config.set('skills.installed', installed)
    config.set('skills.enabled', enabled)
    return { ok: true }
  },

  enable(id: string): { ok: boolean } {
    const config = ConfigStore.getInstance()
    const enabled = new Set((config.get('skills.enabled') as string[]) || [])
    enabled.add(id)
    config.set('skills.enabled', Array.from(enabled))
    return { ok: true }
  },

  disable(id: string): { ok: boolean } {
    const config = ConfigStore.getInstance()
    const enabled = ((config.get('skills.enabled') as string[]) || []).filter(s => s !== id)
    config.set('skills.enabled', enabled)
    return { ok: true }
  },

  markInstalled(id: string) {
    const config = ConfigStore.getInstance()
    const installed = new Set((config.get('skills.installed') as string[]) || [])
    installed.add(id)
    config.set('skills.installed', Array.from(installed))
    // Installing implies enabling by default
    this.enable(id)
  },
}
