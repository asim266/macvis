import { useEffect, useState, useCallback } from 'react'
import { Clock, Plus, Play, Trash2, Power } from 'lucide-react'

interface Schedule {
  id: string; name: string; prompt: string; cadence: string
  everyMinutes?: number; time?: string; weekday?: number
  enabled: boolean; lastRun?: number; nextRun: number; createdAt: number
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const fmt = (ts?: number) => ts ? new Date(ts).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : '—'

function describe(s: Schedule) {
  if (s.cadence === 'interval') return `every ${s.everyMinutes || 60} min`
  if (s.cadence === 'hourly') return 'hourly'
  if (s.cadence === 'daily') return `daily at ${s.time || '09:00'}`
  if (s.cadence === 'weekly') return `${WEEKDAYS[s.weekday ?? 1]} at ${s.time || '09:00'}`
  return s.cadence
}

function Builder({ onCreate }: { onCreate: (s: any) => void }) {
  const [name, setName] = useState('')
  const [prompt, setPrompt] = useState('')
  const [cadence, setCadence] = useState('daily')
  const [everyMinutes, setEvery] = useState(60)
  const [time, setTime] = useState('09:00')
  const [weekday, setWeekday] = useState(1)
  const input = { background: 'var(--surface-3)', border: '1px solid var(--line-1)', borderRadius: 7, padding: '8px 10px', color: 'var(--ink-1)', fontSize: 12.5, outline: 'none' } as const

  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line-1)', borderRadius: 12, padding: 18, marginBottom: 18 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-1)', marginBottom: 12 }}>New scheduled task</h3>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Name (e.g. Morning brief)" style={{ ...input, width: '100%', marginBottom: 8, fontFamily: 'var(--font-display)' }} className="selectable" />
      <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={2} placeholder="What should the agent do each time? e.g. “Summarize my unread email and today's calendar, then notify me.”" style={{ ...input, width: '100%', marginBottom: 10, resize: 'vertical', fontFamily: 'var(--font-display)' }} className="selectable" />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <select value={cadence} onChange={e => setCadence(e.target.value)} style={{ ...input, cursor: 'pointer' }}>
          <option value="interval">Every N minutes</option>
          <option value="hourly">Hourly</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
        {cadence === 'interval' && <input type="number" min={1} value={everyMinutes} onChange={e => setEvery(Number(e.target.value))} style={{ ...input, width: 90 }} />}
        {(cadence === 'daily' || cadence === 'weekly') && <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ ...input }} />}
        {cadence === 'weekly' && (
          <select value={weekday} onChange={e => setWeekday(Number(e.target.value))} style={{ ...input, cursor: 'pointer' }}>
            {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </select>
        )}
      </div>
      <button onClick={() => { if (name.trim() && prompt.trim()) { onCreate({ name, prompt, cadence, everyMinutes, time, weekday }); setName(''); setPrompt('') } }}
        disabled={!name.trim() || !prompt.trim()}
        style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid var(--accent)', background: 'var(--accent)', color: 'var(--accent-text-on)', fontSize: 13, fontWeight: 600, cursor: (name.trim() && prompt.trim()) ? 'pointer' : 'default', opacity: (name.trim() && prompt.trim()) ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 7 }}>
        <Plus size={15} /> Create schedule
      </button>
    </div>
  )
}

export function Schedules() {
  const [list, setList] = useState<Schedule[]>([])
  const refresh = useCallback(async () => setList(await window.macvis.scheduler.list() || []), [])
  useEffect(() => { refresh() }, [refresh])
  useEffect(() => {
    const unsub = window.macvis.scheduler.onUpdate((data: Schedule[]) => setList(data || []))
    return () => unsub?.()
  }, [])

  const create = async (s: any) => { await window.macvis.scheduler.create(s); refresh() }
  const toggle = async (s: Schedule) => { await window.macvis.scheduler.update(s.id, { enabled: !s.enabled }); refresh() }
  const runNow = async (s: Schedule) => { await window.macvis.scheduler.runNow(s.id) }
  const remove = async (s: Schedule) => { await window.macvis.scheduler.remove(s.id); refresh() }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface-2)' }}>
      <div className="drag-region" style={{ height: 38, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 24px', fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 }}>Schedules</div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 32px 32px' }} className="fade-up">
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.025em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={18} style={{ color: 'var(--accent-bright)' }} /> Scheduled Tasks
          </h1>
          <p style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>The agent runs these automatically on a cadence (while MacVis is open) and notifies you. Each run appears as a new chat.</p>
        </div>

        <Builder onCreate={create} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.length === 0 && <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>No schedules yet.</div>}
          {list.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-2)', border: `1px solid ${s.enabled ? 'var(--accent-line)' : 'var(--line-1)'}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-1)' }}>{s.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.prompt}</div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginTop: 3 }}>
                  {describe(s)} · next {fmt(s.nextRun)}{s.lastRun ? ` · last ${fmt(s.lastRun)}` : ''}
                </div>
              </div>
              <button onClick={() => runNow(s)} title="Run now" style={{ padding: '6px 8px', borderRadius: 7, border: '1px solid var(--line-2)', background: 'var(--surface-3)', color: 'var(--ink-2)', cursor: 'pointer', display: 'flex' }}><Play size={12} /></button>
              <button onClick={() => toggle(s)} title={s.enabled ? 'Disable' : 'Enable'} style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid', borderColor: s.enabled ? 'var(--accent)' : 'var(--line-2)', background: s.enabled ? 'var(--accent-soft)' : 'var(--surface-3)', color: s.enabled ? 'var(--accent-bright)' : 'var(--ink-3)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}><Power size={11} /> {s.enabled ? 'On' : 'Off'}</button>
              <button onClick={() => remove(s)} title="Delete" style={{ padding: '6px 8px', borderRadius: 7, border: '1px solid var(--line-2)', background: 'var(--surface-3)', color: 'var(--ink-3)', cursor: 'pointer', display: 'flex' }}><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
