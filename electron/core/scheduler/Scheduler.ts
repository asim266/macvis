import fs from 'fs'
import path from 'path'
import os from 'os'
import { execFile } from 'child_process'
import { getMainWindow } from '../../main'
import { atomicWriteFileSync } from '../util/atomicWrite'

export type Cadence = 'interval' | 'hourly' | 'daily' | 'weekly'

export interface Schedule {
  id: string
  name: string
  prompt: string
  cadence: Cadence
  everyMinutes?: number      // interval
  time?: string              // 'HH:MM' for daily/weekly
  weekday?: number           // 0=Sun … 6=Sat for weekly
  enabled: boolean
  lastRun?: number
  nextRun: number
  createdAt: number
}

const FILE = path.join(os.homedir(), '.macvis', 'schedules.json')
let _ctr = 0
const uid = () => `sch_${Date.now().toString(36)}_${(++_ctr).toString(36)}`

function read(): Schedule[] { try { return JSON.parse(fs.readFileSync(FILE, 'utf-8')) } catch { return [] } }
function write(s: Schedule[]) { try { atomicWriteFileSync(FILE, JSON.stringify(s, null, 2)) } catch {} }

function parseHM(time?: string): { h: number; m: number } {
  const [h, m] = (time || '09:00').split(':').map(Number)
  return { h: isNaN(h) ? 9 : h, m: isNaN(m) ? 0 : m }
}

export function computeNext(s: Schedule, fromTs = Date.now()): number {
  const from = new Date(fromTs)
  if (s.cadence === 'interval') return fromTs + Math.max(1, s.everyMinutes || 60) * 60_000
  if (s.cadence === 'hourly') { const d = new Date(from); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1); return d.getTime() }
  const { h, m } = parseHM(s.time)
  if (s.cadence === 'daily') {
    const d = new Date(from); d.setHours(h, m, 0, 0)
    if (d.getTime() <= fromTs) d.setDate(d.getDate() + 1)
    return d.getTime()
  }
  // weekly
  const target = s.weekday ?? 1
  const d = new Date(from); d.setHours(h, m, 0, 0)
  let delta = (target - d.getDay() + 7) % 7
  if (delta === 0 && d.getTime() <= fromTs) delta = 7
  d.setDate(d.getDate() + delta)
  return d.getTime()
}

function notify(text: string) {
  execFile('osascript', ['-e', `display notification "${text.replace(/"/g, '\\"')}" with title "MacVis · Scheduled"`], () => {})
}

class SchedulerManager {
  private timer: NodeJS.Timeout | null = null

  start() {
    // Re-arm any schedules whose nextRun is missing/stale.
    const all = read()
    const now = Date.now()
    let changed = false
    for (const s of all) {
      if (!s.nextRun || (s.enabled && s.nextRun < now - 60_000)) { s.nextRun = computeNext(s, now); changed = true }
    }
    if (changed) write(all)
    if (this.timer) clearInterval(this.timer)
    this.timer = setInterval(() => this.tick(), 30_000)
  }

  private tick() {
    const all = read()
    const now = Date.now()
    let changed = false
    for (const s of all) {
      if (!s.enabled) continue
      if (s.nextRun <= now) {
        this.fire(s).catch(() => {})
        s.lastRun = now
        s.nextRun = computeNext(s, now)
        changed = true
      }
    }
    if (changed) { write(all); this.emit() }
  }

  private async fire(s: Schedule) {
    notify(`Running “${s.name}”`)
    const { agentLoop } = await import('../agent/AgentLoop')
    const sessionId = `sched_${s.id}_${Date.now().toString(36)}`
    agentLoop.run(`[Scheduled task: ${s.name}]\n\n${s.prompt}`, sessionId)
  }

  list(): Schedule[] { return read().sort((a, b) => a.nextRun - b.nextRun) }

  create(input: Partial<Schedule>): Schedule {
    const all = read()
    const s: Schedule = {
      id: uid(),
      name: input.name || 'Untitled',
      prompt: input.prompt || '',
      cadence: (input.cadence as Cadence) || 'daily',
      everyMinutes: input.everyMinutes,
      time: input.time,
      weekday: input.weekday,
      enabled: input.enabled !== false,
      createdAt: Date.now(),
      nextRun: 0,
    }
    s.nextRun = computeNext(s)
    all.push(s); write(all); this.emit()
    return s
  }

  update(id: string, patch: Partial<Schedule>): Schedule | null {
    const all = read()
    const s = all.find(x => x.id === id)
    if (!s) return null
    Object.assign(s, patch)
    s.nextRun = computeNext(s)
    write(all); this.emit()
    return s
  }

  remove(id: string) { write(read().filter(x => x.id !== id)); this.emit() }

  runNow(id: string) {
    const s = read().find(x => x.id === id)
    if (s) this.fire(s).catch(() => {})
    return { ok: !!s }
  }

  private emit() { getMainWindow()?.webContents.send('scheduler:update', this.list()) }
}

export const Scheduler = new SchedulerManager()
