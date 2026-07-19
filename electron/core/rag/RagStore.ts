import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'
import os from 'os'
import { ConfigStore } from '../config/ConfigStore'
import { extractText, isTextLike } from '../documents/extract'
import { atomicWriteFileSync } from '../util/atomicWrite'

const RAG_DIR = path.join(os.homedir(), '.macvis', 'rag')

interface Chunk { file: string; text: string; vec?: number[] }
interface RagIndex { name: string; files: string[]; chunks: Chunk[]; embedded: boolean; createdAt: number }

const SKIP = new Set(['node_modules', '.git', 'dist', 'out', '.next', 'build', '.cache', 'Library'])
const MAX_FILES = 400
const MAX_FILE_BYTES = 800 * 1024
const CHUNK = 1500

function resolve(p: string) { return p.startsWith('~') ? p.replace('~', os.homedir()) : p }
function indexPath(name: string) { return path.join(RAG_DIR, `${name.replace(/[^a-z0-9-_]/gi, '_')}.json`) }

function chunkText(text: string): string[] {
  const out: string[] = []
  let cur = ''
  for (const para of text.split(/\n\s*\n/)) {
    if ((cur + para).length > CHUNK) {
      if (cur) out.push(cur.trim())
      if (para.length > CHUNK) {
        for (let i = 0; i < para.length; i += CHUNK) out.push(para.slice(i, i + CHUNK))
        cur = ''
      } else cur = para
    } else cur += '\n\n' + para
  }
  if (cur.trim()) out.push(cur.trim())
  return out.filter(c => c.length > 20)
}

async function collectFiles(target: string): Promise<string[]> {
  const files: string[] = []
  const stat = await fsp.stat(target).catch(() => null)
  if (!stat) return files
  if (stat.isFile()) return isTextLike(target) ? [target] : [target]
  const walk = async (dir: string, depth: number) => {
    if (depth > 8 || files.length >= MAX_FILES) return
    const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => [])
    for (const e of entries) {
      if (files.length >= MAX_FILES) break
      if (e.name.startsWith('.') || SKIP.has(e.name)) continue
      const full = path.join(dir, e.name)
      if (e.isDirectory()) await walk(full, depth + 1)
      else if (isTextLike(full)) files.push(full)
    }
  }
  await walk(target, 0)
  return files
}

async function embed(texts: string[], key: string): Promise<number[][]> {
  const out: number[][] = []
  for (let i = 0; i < texts.length; i += 64) {
    const batch = texts.slice(i, i + 64)
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: batch }),
    })
    const data = await res.json() as any
    if (!res.ok) throw new Error(data?.error?.message || `embeddings HTTP ${res.status}`)
    for (const d of data.data) out.push(d.embedding)
  }
  return out
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1)
}

function lexicalScore(query: string, text: string): number {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  const lc = text.toLowerCase()
  return terms.reduce((s, t) => s + (lc.includes(t) ? 1 : 0), 0)
}

export const RagStore = {
  list(): { name: string; files: number; chunks: number; embedded: boolean }[] {
    if (!fs.existsSync(RAG_DIR)) return []
    return fs.readdirSync(RAG_DIR).filter(f => f.endsWith('.json')).map(f => {
      try { const ix: RagIndex = JSON.parse(fs.readFileSync(path.join(RAG_DIR, f), 'utf-8')); return { name: ix.name, files: ix.files.length, chunks: ix.chunks.length, embedded: ix.embedded } }
      catch { return { name: f.replace('.json', ''), files: 0, chunks: 0, embedded: false } }
    })
  },

  async index(name: string, target: string): Promise<{ ok: boolean; files: number; chunks: number; embedded: boolean; error?: string }> {
    try {
      fs.mkdirSync(RAG_DIR, { recursive: true })
      const files = await collectFiles(resolve(target))
      const chunks: Chunk[] = []
      for (const f of files) {
        try {
          const st = await fsp.stat(f)
          if (st.size > MAX_FILE_BYTES && !isTextLike(f)) continue
          const text = await extractText(f, 400_000)
          for (const c of chunkText(text)) chunks.push({ file: f, text: c })
        } catch {}
        if (chunks.length > 4000) break
      }
      const key = ConfigStore.getInstance().get('apiKeys.openai') as string
      let embedded = false
      if (key && chunks.length) {
        try {
          const vecs = await embed(chunks.map(c => c.text), key)
          chunks.forEach((c, i) => { c.vec = vecs[i] })
          embedded = true
        } catch { embedded = false }
      }
      const ix: RagIndex = { name, files, chunks, embedded, createdAt: Date.now() }
      atomicWriteFileSync(indexPath(name), JSON.stringify(ix))
      return { ok: true, files: files.length, chunks: chunks.length, embedded }
    } catch (err: any) {
      return { ok: false, files: 0, chunks: 0, embedded: false, error: err.message || String(err) }
    }
  },

  async search(query: string, name?: string, k = 6): Promise<{ file: string; text: string; score: number }[]> {
    if (!fs.existsSync(RAG_DIR)) return []
    const targets = name ? [indexPath(name)] : fs.readdirSync(RAG_DIR).filter(f => f.endsWith('.json')).map(f => path.join(RAG_DIR, f))
    const all: { ix: RagIndex }[] = []
    for (const t of targets) { try { all.push({ ix: JSON.parse(fs.readFileSync(t, 'utf-8')) }) } catch {} }

    const haveVecs = all.some(a => a.ix.embedded)
    const key = ConfigStore.getInstance().get('apiKeys.openai') as string
    let qvec: number[] | null = null
    if (haveVecs && key) { try { qvec = (await embed([query], key))[0] } catch { qvec = null } }

    const scored: { file: string; text: string; score: number }[] = []
    for (const { ix } of all) {
      for (const c of ix.chunks) {
        const score = (qvec && c.vec) ? cosine(qvec, c.vec) : lexicalScore(query, c.text)
        if (score > 0) scored.push({ file: c.file, text: c.text, score })
      }
    }
    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, k)
  },

  remove(name: string): boolean {
    try { fs.unlinkSync(indexPath(name)); return true } catch { return false }
  },
}
