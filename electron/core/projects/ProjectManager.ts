import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'
import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const ROOT = path.join(os.homedir(), '.macvis')
export const WORKSPACE_DIR = path.join(ROOT, 'workspace')
export const PROJECTS_DIR = path.join(WORKSPACE_DIR, 'projects')

function ensureDirs() {
  if (!fsSync.existsSync(PROJECTS_DIR)) {
    fsSync.mkdirSync(PROJECTS_DIR, { recursive: true })
  }
}

export interface ProjectInfo {
  name: string
  path: string
  type: string  // detected: html, react, next, node, python, unknown
  createdAt: number
  modifiedAt: number
  size: number  // bytes
  fileCount: number
  hasGit: boolean
  description?: string
  entryFile?: string
}

async function detectType(dirPath: string): Promise<string> {
  try {
    const files = await fs.readdir(dirPath)
    if (files.includes('package.json')) {
      const pkg = JSON.parse(await fs.readFile(path.join(dirPath, 'package.json'), 'utf-8'))
      const deps = { ...pkg.dependencies, ...pkg.devDependencies }
      if (deps.next) return 'next'
      if (deps.react) return 'react'
      if (deps.vue) return 'vue'
      return 'node'
    }
    if (files.some(f => f === 'requirements.txt' || f === 'pyproject.toml')) return 'python'
    if (files.some(f => f === 'index.html')) return 'html'
    if (files.some(f => f.endsWith('.go'))) return 'go'
    if (files.some(f => f.endsWith('.rs'))) return 'rust'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

async function getStats(dirPath: string): Promise<{ size: number; fileCount: number; modifiedAt: number }> {
  let size = 0
  let fileCount = 0
  let modifiedAt = 0

  async function walk(dir: string) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          await walk(full)
        } else {
          try {
            const stat = await fs.stat(full)
            size += stat.size
            fileCount++
            if (stat.mtimeMs > modifiedAt) modifiedAt = stat.mtimeMs
          } catch {}
        }
      }
    } catch {}
  }

  await walk(dirPath)
  return { size, fileCount, modifiedAt }
}

async function detectEntryFile(dirPath: string, type: string): Promise<string | undefined> {
  try {
    const files = await fs.readdir(dirPath)
    if (type === 'html' && files.includes('index.html')) return 'index.html'
    if ((type === 'react' || type === 'next' || type === 'node') && files.includes('package.json')) return 'package.json'
    if (type === 'python') {
      if (files.includes('main.py')) return 'main.py'
      if (files.includes('app.py')) return 'app.py'
      const py = files.find(f => f.endsWith('.py'))
      return py
    }
    return undefined
  } catch {
    return undefined
  }
}

export const ProjectManager = {
  workspaceDir: WORKSPACE_DIR,
  projectsDir: PROJECTS_DIR,

  ensureWorkspace() {
    ensureDirs()
  },

  async list(): Promise<ProjectInfo[]> {
    ensureDirs()
    try {
      const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true })
      const projects: ProjectInfo[] = []
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue
        const projectPath = path.join(PROJECTS_DIR, entry.name)
        try {
          const stat = await fs.stat(projectPath)
          const type = await detectType(projectPath)
          const { size, fileCount, modifiedAt } = await getStats(projectPath)
          const entryFile = await detectEntryFile(projectPath, type)
          const hasGit = fsSync.existsSync(path.join(projectPath, '.git'))

          // Try to read description from README
          let description: string | undefined
          try {
            const readme = await fs.readFile(path.join(projectPath, 'README.md'), 'utf-8')
            const firstPara = readme.split('\n').find(l => l.trim() && !l.startsWith('#'))
            if (firstPara) description = firstPara.trim().slice(0, 140)
          } catch {}

          projects.push({
            name: entry.name,
            path: projectPath,
            type,
            createdAt: stat.birthtimeMs,
            modifiedAt: modifiedAt || stat.mtimeMs,
            size,
            fileCount,
            hasGit,
            description,
            entryFile,
          })
        } catch {}
      }
      projects.sort((a, b) => b.modifiedAt - a.modifiedAt)
      return projects
    } catch {
      return []
    }
  },

  async openInFinder(projectPath: string): Promise<void> {
    await execAsync(`open "${projectPath}"`)
  },

  async openInEditor(projectPath: string): Promise<void> {
    // Try VS Code first, then Cursor, then default
    try {
      await execAsync(`code "${projectPath}"`)
      return
    } catch {}
    try {
      await execAsync(`cursor "${projectPath}"`)
      return
    } catch {}
    await execAsync(`open "${projectPath}"`)
  },

  async openInBrowser(projectPath: string): Promise<string> {
    const indexPath = path.join(projectPath, 'index.html')
    if (fsSync.existsSync(indexPath)) {
      await execAsync(`open "${indexPath}"`)
      return indexPath
    }
    throw new Error('No index.html found in project')
  },

  async run(projectPath: string): Promise<{ command: string; pid?: number }> {
    const type = await detectType(projectPath)

    if (type === 'html') {
      const indexPath = path.join(projectPath, 'index.html')
      if (fsSync.existsSync(indexPath)) {
        await execAsync(`open "${indexPath}"`)
        return { command: `open ${indexPath}` }
      }
    }

    if (type === 'react' || type === 'next' || type === 'node') {
      const pkgPath = path.join(projectPath, 'package.json')
      if (fsSync.existsSync(pkgPath)) {
        const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'))
        const script = pkg.scripts?.dev || pkg.scripts?.start
        if (script) {
          // Detached so it survives parent exit
          const { spawn } = await import('child_process')
          const child = spawn('sh', ['-c', `cd "${projectPath}" && (npm run ${pkg.scripts.dev ? 'dev' : 'start'} || npm install && npm run ${pkg.scripts.dev ? 'dev' : 'start'})`], {
            detached: true,
            stdio: 'ignore',
          })
          child.unref()
          return { command: `npm run ${pkg.scripts.dev ? 'dev' : 'start'}`, pid: child.pid }
        }
      }
    }

    if (type === 'python') {
      const entry = await detectEntryFile(projectPath, type)
      if (entry) {
        const { spawn } = await import('child_process')
        const child = spawn('sh', ['-c', `cd "${projectPath}" && python3 ${entry}`], {
          detached: true,
          stdio: 'ignore',
        })
        child.unref()
        return { command: `python3 ${entry}`, pid: child.pid }
      }
    }

    throw new Error(`Don't know how to run ${type} project`)
  },

  async delete(projectPath: string): Promise<void> {
    // Safety: must be inside our projects dir
    const resolved = path.resolve(projectPath)
    if (!resolved.startsWith(PROJECTS_DIR)) {
      throw new Error('Refusing to delete: path is outside the projects directory')
    }
    await fs.rm(resolved, { recursive: true, force: true })
  },
}
