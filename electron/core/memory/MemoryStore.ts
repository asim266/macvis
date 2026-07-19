import fs from 'fs'
import path from 'path'
import os from 'os'
import { atomicWriteFileSync } from '../util/atomicWrite'

export interface MemoryEntry { id: string; text: string; tags: string[]; ts: number }

const FILE = path.join(os.homedir(), '.macvis', 'memory.json')

let _ctr = 0
function uid() { return `mem_${Date.now().toString(36)}_${(++_ctr).toString(36)}` }

function read(): MemoryEntry[] {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf-8')) } catch { return [] }
}
function write(entries: MemoryEntry[]) {
  try { atomicWriteFileSync(FILE, JSON.stringify(entries, null, 2)) } catch {}
}

export const MemoryStore = {
  all(): MemoryEntry[] { return read() },

  add(text: string, tags: string[] = []): MemoryEntry {
    const entries = read()
    // de-dupe near-identical memories
    if (entries.some(e => e.text.trim().toLowerCase() === text.trim().toLowerCase())) {
      return entries.find(e => e.text.trim().toLowerCase() === text.trim().toLowerCase())!
    }
    const entry: MemoryEntry = { id: uid(), text: text.trim(), tags, ts: Date.now() }
    entries.push(entry)
    write(entries)
    return entry
  },

  search(query: string, limit = 8): MemoryEntry[] {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
    if (terms.length === 0) return read().slice(-limit).reverse()
    return read()
      .map(e => ({ e, score: terms.reduce((s, t) => s + ((e.text.toLowerCase().includes(t) || e.tags.some(g => g.toLowerCase().includes(t))) ? 1 : 0), 0) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score || b.e.ts - a.e.ts)
      .slice(0, limit)
      .map(x => x.e)
  },

  remove(id: string): boolean {
    const entries = read()
    const next = entries.filter(e => e.id !== id)
    write(next)
    return next.length !== entries.length
  },

  /** Compact summary for the system prompt (most recent N). */
  summary(limit = 20): string {
    const entries = read().slice(-limit).reverse()
    if (entries.length === 0) return ''
    return entries.map(e => `- ${e.text}${e.tags.length ? ` [${e.tags.join(', ')}]` : ''}`).join('\n')
  },
}
