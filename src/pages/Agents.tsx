import { useEffect, useState, useCallback, useRef } from 'react'
import { Loader, Plus, Square, Bot, ArrowLeft } from 'lucide-react'
import { TeamScene3D } from '../components/agents/TeamScene3D'

interface Role { id: string; title: string; icon: string; color: string; manager?: boolean }
interface Team {
  id: string; goal: string; projectDir: string
  agents: any[]; tasks: any[]; log: any[]
  status: string; round: number; hitl?: any; createdAt: number; updatedAt: number
}

const STATUS_COLOR: Record<string, string> = {
  planning: 'var(--warn)', 'awaiting-approval': 'var(--warn)', running: 'var(--accent-bright)',
  paused: 'var(--warn)', done: 'var(--ok)', stopped: 'var(--ink-4)', error: 'var(--err)',
}

// ─── Team builder ──────────────────────────────────────────────────────────
function Builder({ roles, onCreate }: { roles: Role[]; onCreate: (goal: string, roleIds: string[]) => void }) {
  const [goal, setGoal] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const toggle = (id: string) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line-1)', borderRadius: 12, padding: 18 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-1)', marginBottom: 10 }}>Assemble a team</h3>
      <textarea
        value={goal} onChange={e => setGoal(e.target.value)}
        placeholder="Describe the goal — e.g. “Build and ship a landing page for my SaaS with a working waitlist form”"
        rows={2}
        style={{ width: '100%', background: 'var(--surface-3)', border: '1px solid var(--line-1)', borderRadius: 8, padding: '10px 12px', color: 'var(--ink-1)', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'var(--font-display)', marginBottom: 12 }}
        className="selectable"
      />
      <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
        Roles <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — a Project Manager is always added; leave empty to auto-pick)</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {roles.filter(r => !r.manager).map(r => {
          const on = picked.includes(r.id)
          return (
            <button key={r.id} onClick={() => toggle(r.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 999, border: `1px solid ${on ? r.color : 'var(--line-2)'}`, background: on ? `${r.color}22` : 'var(--surface-3)', color: on ? 'var(--ink-1)' : 'var(--ink-3)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
              <span>{r.icon}</span> {r.title}
            </button>
          )
        })}
      </div>
      <button onClick={() => { if (goal.trim()) { onCreate(goal.trim(), picked); setGoal(''); setPicked([]) } }} disabled={!goal.trim()}
        style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid var(--accent)', background: 'var(--accent)', color: 'var(--accent-text-on)', fontSize: 13, fontWeight: 600, cursor: goal.trim() ? 'pointer' : 'default', opacity: goal.trim() ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 7, boxShadow: 'inset 0 1px 0 var(--accent-inset), 0 0 14px var(--accent-glow)' }}>
        <Plus size={15} /> Launch team
      </button>
    </div>
  )
}

// ─── HITL panel ──────────────────────────────────────────────────────────────
function HitlPanel({ team, onRespond }: { team: Team; onRespond: (d: any) => void }) {
  const [fb, setFb] = useState('')
  const h = team.hitl
  if (!h) return null
  return (
    <div style={{ background: 'oklch(75% 0.16 85 / 0.08)', border: '1px solid oklch(75% 0.16 85 / 0.4)', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--warn)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
        ✋ Your input needed
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--ink-1)', lineHeight: 1.5, marginBottom: 10 }}>{h.prompt}</p>
      {h.allowFeedback && (
        <input value={fb} onChange={e => setFb(e.target.value)} placeholder="Optional feedback / changes…"
          style={{ width: '100%', background: 'var(--surface-3)', border: '1px solid var(--line-1)', borderRadius: 7, padding: '8px 10px', color: 'var(--ink-1)', fontSize: 12.5, outline: 'none', marginBottom: 10, fontFamily: 'var(--font-display)' }} className="selectable" />
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {h.allowFeedback && fb.trim() && (
          <button onClick={() => { onRespond({ action: 'feedback', feedback: fb }); setFb('') }}
            style={{ padding: '7px 13px', borderRadius: 7, border: '1px solid var(--accent)', background: 'var(--accent)', color: 'var(--accent-text-on)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Send feedback
          </button>
        )}
        {h.options.map((o: any) => (
          <button key={o.value} onClick={() => onRespond({ action: o.value })}
            style={{ padding: '7px 13px', borderRadius: 7, border: '1px solid var(--line-2)', background: o.value === 'approve' ? 'var(--accent)' : 'var(--surface-3)', color: o.value === 'approve' ? 'var(--accent-text-on)' : 'var(--ink-1)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Team detail ──────────────────────────────────────────────────────────────
function TeamView({ team, onBack, onRespond, onStop }: { team: Team; onBack: () => void; onRespond: (d: any) => void; onStop: () => void }) {
  const logRef = useRef<HTMLDivElement>(null)
  useEffect(() => { logRef.current?.scrollTo({ top: 1e9 }) }, [team.log.length])
  const active = !['done', 'stopped', 'error'].includes(team.status)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <button onClick={onBack} style={{ background: 'var(--surface-3)', border: '1px solid var(--line-1)', borderRadius: 7, padding: '6px 10px', color: 'var(--ink-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}><ArrowLeft size={13} /> Teams</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.goal}</div>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: STATUS_COLOR[team.status] || 'var(--ink-4)' }}>
            {team.status} · round {team.round} · {team.tasks.filter(t => t.status === 'done').length}/{team.tasks.length} tasks
          </div>
        </div>
        {active && <button onClick={onStop} style={{ background: 'oklch(68% 0.22 25 / 0.12)', border: '1px solid var(--err)', borderRadius: 7, padding: '6px 12px', color: 'var(--err)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600 }}><Square size={11} fill="currentColor" /> Stop</button>}
      </div>

      <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>
        {/* 3D scene */}
        <div style={{ flex: 1.4, minWidth: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line-1)', background: '#0a0c10' }}>
          <TeamScene3D agents={team.agents} />
        </div>

        {/* side panel */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          <HitlPanel team={team} onRespond={onRespond} />

          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>Tasks</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {team.tasks.length === 0 && <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>Planning…</div>}
              {team.tasks.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '6px 10px', background: 'var(--surface-2)', border: '1px solid var(--line-1)', borderRadius: 7 }}>
                  <span style={{ flexShrink: 0 }}>{t.status === 'done' ? '✅' : t.status === 'in_progress' ? '⚙️' : t.status === 'blocked' ? '⛔' : '⏳'}</span>
                  <span style={{ flex: 1, color: t.status === 'done' ? 'var(--ink-3)' : 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                  <span style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>{t.role}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 120, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>Activity</div>
            <div ref={logRef} style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-1)', border: '1px solid var(--line-1)', borderRadius: 8, padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.6 }}>
              {team.log.slice(-80).map((l, i) => (
                <div key={i} style={{ color: l.kind === 'result' ? 'var(--ok)' : l.kind === 'hitl' ? 'var(--warn)' : l.kind === 'tool' ? 'var(--ink-3)' : 'var(--ink-2)' }}>
                  {l.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────
export function Agents() {
  const [roles, setRoles] = useState<Role[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const [r, t] = await Promise.all([window.macvis.teams.roles(), window.macvis.teams.list()])
    setRoles(r || []); setTeams(t || [])
  }, [])
  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    const upsert = (team: Team) => setTeams(prev => {
      const i = prev.findIndex(x => x.id === team.id)
      if (i >= 0) { const n = [...prev]; n[i] = team; return n }
      return [team, ...prev]
    })
    const unsub = window.macvis.teams.onUpdate((team: Team) => upsert(team))
    const unsubH = window.macvis.teams.onHitl(() => {/* team:update carries hitl too */})
    return () => { unsub?.(); unsubH?.() }
  }, [])

  const create = async (goal: string, roleIds: string[]) => {
    const team = await window.macvis.teams.create(goal, roleIds)
    setTeams(prev => [team, ...prev.filter(t => t.id !== team.id)])
    setSelected(team.id)
  }
  const respond = (id: string, d: any) => window.macvis.teams.respond(id, d)
  const stop = (id: string) => window.macvis.teams.stop(id)

  const current = teams.find(t => t.id === selected)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface-2)' }}>
      <div className="drag-region" style={{ height: 38, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 24px', fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 }}>Agent Teams</div>

      <div style={{ flex: 1, overflow: 'hidden', padding: '16px 24px 24px', display: 'flex', flexDirection: 'column' }}>
        {current ? (
          <TeamView team={current} onBack={() => setSelected(null)} onRespond={d => respond(current.id, d)} onStop={() => stop(current.id)} />
        ) : (
          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }} className="fade-up">
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.025em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bot size={18} style={{ color: 'var(--accent-bright)' }} /> Agent Teams
              </h1>
              <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                Describe a goal and a team of specialized agents (PM + workers) plans, builds, and iterates until it's done — with you approving at key checkpoints. Watch them work live in 3D.
              </p>
            </div>

            <Builder roles={roles} onCreate={create} />

            {teams.length > 0 && (
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>Your teams</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                  {teams.map(t => (
                    <button key={t.id} onClick={() => setSelected(t.id)}
                      style={{ textAlign: 'left', background: 'var(--surface-2)', border: '1px solid var(--line-1)', borderRadius: 10, padding: '12px 14px', cursor: 'pointer' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.goal}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                        <span style={{ color: STATUS_COLOR[t.status] || 'var(--ink-4)' }}>● {t.status}</span>
                        <span style={{ color: 'var(--ink-4)' }}>{t.agents.length} agents</span>
                        {t.hitl && <span style={{ color: 'var(--warn)' }}>✋ needs you</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
