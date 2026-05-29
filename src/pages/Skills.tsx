import { useEffect, useState, useCallback } from 'react'
import { Sparkles, Loader, Check, Package, ExternalLink, Eye, EyeOff, Trash2, Power, Plus } from 'lucide-react'
import { useConfigStore } from '../stores/configStore'

interface CatalogSkill {
  id: string; name: string; description: string; icon: string; category: string
  installed: boolean; enabled: boolean
}
interface PackKeyInput { configKey: string; label: string; placeholder?: string; docsUrl?: string }
interface Pack {
  id: string; name: string; description: string; icon: string; accentColor: string
  category: string; skills: string[]; mcps: string[]; apiKeys?: PackKeyInput[]
  setup?: { label: string; command: string }[]; installed: boolean
}
interface PackResult {
  ok: boolean; installedSkills: string[]; connectedMcps: string[]
  pendingMcps: { id: string; reason: string }[]
  missingKeys: { configKey: string; label: string; docsUrl?: string }[]
  setup: { label: string; command: string }[]
}

function getNested(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => o?.[k], obj)
}

// ─── Key input (compact) ───────────────────────────────────────────────────
function KeyInput({ k, value, onSave }: { k: PackKeyInput; value: string; onSave: (v: string) => void }) {
  const [local, setLocal] = useState(value)
  const [show, setShow] = useState(false)
  useEffect(() => { setLocal(value) }, [value])
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>{k.label}</label>
        {k.docsUrl && (
          <button onClick={() => window.open(k.docsUrl, '_blank')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600, color: 'var(--accent-bright)', fontFamily: 'var(--font-mono)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            Get key <ExternalLink size={9} />
          </button>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-3)', border: '1px solid var(--line-1)', borderRadius: 6, padding: '0 10px' }}>
        <input
          type={show ? 'text' : 'password'} value={local}
          onChange={e => setLocal(e.target.value)}
          onBlur={() => { if (local !== value) onSave(local) }}
          placeholder={k.placeholder}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--ink-1)', fontSize: 12, padding: '6px 0', fontFamily: 'var(--font-mono)' }}
          className="selectable"
        />
        <button onClick={() => setShow(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 2, display: 'flex' }}>
          {show ? <EyeOff size={12} /> : <Eye size={12} />}
        </button>
      </div>
    </div>
  )
}

// ─── Pack card ──────────────────────────────────────────────────────────────
function PackCard({ pack, config, onInstall, onSaveKey }: {
  pack: Pack; config: any
  onInstall: (id: string) => Promise<PackResult | undefined>
  onSaveKey: (key: string, v: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<PackResult | null>(null)
  const accent = pack.accentColor

  const handle = async () => {
    setBusy(true)
    try { const r = await onInstall(pack.id); if (r) setResult(r) }
    finally { setBusy(false) }
  }

  return (
    <div style={{
      background: `linear-gradient(135deg, ${accent} 0%, transparent 55%), var(--surface-2)`,
      backgroundBlendMode: 'overlay',
      border: `1px solid ${pack.installed ? 'var(--accent-line)' : 'var(--line-1)'}`,
      borderRadius: 12, padding: '16px 18px', position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ position: 'absolute', top: -40, right: -40, width: 130, height: 130, borderRadius: '50%', background: accent, filter: 'blur(48px)', opacity: 0.18, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--surface-3)', border: '1px solid var(--line-1)', display: 'grid', placeItems: 'center', fontSize: 22, flexShrink: 0, boxShadow: `0 0 18px ${accent}33` }}>{pack.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.015em', display: 'flex', alignItems: 'center', gap: 8 }}>
            {pack.name}
            {pack.installed && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 600, color: 'var(--ok)', background: 'oklch(72% 0.155 150 / 0.1)', border: '1px solid oklch(72% 0.155 150 / 0.3)', padding: '1.5px 6px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.06em' }}>✓ installed</span>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.45 }}>{pack.description}</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, position: 'relative' }}>
        {pack.skills.map(s => (
          <span key={s} style={{ fontSize: 10, color: 'var(--ink-3)', background: 'var(--surface-3)', border: '1px solid var(--line-1)', borderRadius: 5, padding: '2px 6px', fontFamily: 'var(--font-mono)' }}>{s}</span>
        ))}
        {pack.mcps.map(m => (
          <span key={m} style={{ fontSize: 10, color: 'var(--accent-bright)', background: 'var(--accent-soft)', border: '1px solid var(--accent-line)', borderRadius: 5, padding: '2px 6px', fontFamily: 'var(--font-mono)' }}>⚡{m}</span>
        ))}
      </div>

      <button
        onClick={handle} disabled={busy}
        style={{
          width: '100%', padding: '9px 14px', borderRadius: 8, border: '1px solid var(--accent)',
          background: pack.installed ? 'var(--surface-3)' : 'var(--accent)',
          borderColor: pack.installed ? 'var(--line-2)' : 'var(--accent)',
          color: pack.installed ? 'var(--ink-1)' : 'var(--accent-text-on)',
          fontSize: 12.5, fontWeight: 600, cursor: busy ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          boxShadow: pack.installed ? 'none' : 'inset 0 1px 0 var(--accent-inset), 0 0 14px var(--accent-glow)',
        }}
      >
        {busy && <Loader size={12} className="spin" />}
        {pack.installed && !busy && <Check size={12} strokeWidth={3} />}
        <span>{busy ? 'Installing…' : pack.installed ? 'Reinstall / repair' : `Install ${pack.name}`}</span>
      </button>

      {result && (
        <div style={{ position: 'relative', borderTop: '1px solid var(--line-1)', paddingTop: 10, fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
          <div>✓ {result.installedSkills.length} skills enabled · {result.connectedMcps.length} integrations connected</div>
          {result.pendingMcps.length > 0 && (
            <div style={{ color: 'var(--ink-4)', marginTop: 4 }}>
              Needs setup in Integrations: {result.pendingMcps.map(m => m.id).join(', ')}
            </div>
          )}
          {result.missingKeys.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>Add API keys to finish</div>
              {result.missingKeys.map(k => (
                <KeyInput key={k.configKey} k={k} value={String(getNested(config, k.configKey) || '')} onSave={v => onSaveKey(k.configKey, v)} />
              ))}
            </div>
          )}
          {result.setup.length > 0 && (
            <div style={{ marginTop: 8, color: 'var(--ink-4)' }}>
              Optional setup (run in chat / terminal):
              {result.setup.map(s => (
                <div key={s.command} style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--accent-bright)', marginTop: 2, wordBreak: 'break-all' }}>$ {s.command}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Skill row ────────────────────────────────────────────────────────────────
function SkillRow({ skill, onToggleInstall, onToggleEnable }: {
  skill: CatalogSkill
  onToggleInstall: (s: CatalogSkill) => Promise<void>
  onToggleEnable: (s: CatalogSkill) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const wrap = (fn: () => Promise<void>) => async () => { setBusy(true); try { await fn() } finally { setBusy(false) } }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-2)', border: `1px solid ${skill.enabled ? 'var(--accent-line)' : 'var(--line-1)'}`, borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--surface-3)', border: '1px solid var(--line-1)', display: 'grid', placeItems: 'center', fontSize: 17, flexShrink: 0 }}>{skill.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {skill.name}
          {skill.enabled && <span style={{ fontSize: 9, color: 'var(--ok)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>● enabled</span>}
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.4, marginTop: 1 }}>{skill.description}</p>
      </div>
      {skill.installed ? (
        <>
          <button onClick={wrap(() => onToggleEnable(skill))} disabled={busy} title={skill.enabled ? 'Disable' : 'Enable'}
            style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid', borderColor: skill.enabled ? 'var(--accent)' : 'var(--line-2)', background: skill.enabled ? 'var(--accent-soft)' : 'var(--surface-3)', color: skill.enabled ? 'var(--accent-bright)' : 'var(--ink-2)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Power size={11} /> {skill.enabled ? 'On' : 'Off'}
          </button>
          <button onClick={wrap(() => onToggleInstall(skill))} disabled={busy} title="Uninstall"
            style={{ padding: '6px 8px', borderRadius: 7, border: '1px solid var(--line-2)', background: 'var(--surface-3)', color: 'var(--ink-3)', cursor: 'pointer', display: 'flex' }}>
            <Trash2 size={11} />
          </button>
        </>
      ) : (
        <button onClick={wrap(() => onToggleInstall(skill))} disabled={busy}
          style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid var(--accent)', background: 'var(--accent)', color: 'var(--accent-text-on)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: 'inset 0 1px 0 var(--accent-inset), 0 0 10px var(--accent-glow)' }}>
          {busy ? <Loader size={11} className="spin" /> : 'Install'}
        </button>
      )}
    </div>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────
export function Skills() {
  const { config, loaded, load, set } = useConfigStore()
  const [tab, setTab] = useState<'packs' | 'skills'>('packs')
  const [packs, setPacks] = useState<Pack[]>([])
  const [skills, setSkills] = useState<CatalogSkill[]>([])
  const [addSrc, setAddSrc] = useState('')
  const [adding, setAdding] = useState(false)
  const [addErr, setAddErr] = useState('')

  useEffect(() => { if (!loaded) load() }, [loaded, load])

  const refresh = useCallback(async () => {
    const [pl, sl] = await Promise.all([
      window.macvis.packs.list(),
      window.macvis.skills.list(),
    ])
    setPacks(pl || [])
    setSkills(sl || [])
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const installPack = async (id: string) => {
    const r = await window.macvis.packs.install(id)
    await refresh()
    return r as PackResult
  }
  const toggleInstall = async (s: CatalogSkill) => {
    if (s.installed) await window.macvis.skills.uninstall(s.id)
    else await window.macvis.skills.install(s.id)
    await refresh()
  }
  const toggleEnable = async (s: CatalogSkill) => {
    if (s.enabled) await window.macvis.skills.disable(s.id)
    else await window.macvis.skills.enable(s.id)
    await refresh()
  }
  const addSkill = async () => {
    if (!addSrc.trim()) return
    setAdding(true); setAddErr('')
    try {
      const r = await window.macvis.skills.install(addSrc.trim())
      if (r?.ok) { setAddSrc(''); await refresh() }
      else setAddErr(r?.error || 'Install failed')
    } catch (e: any) { setAddErr(e.message || String(e)) }
    finally { setAdding(false) }
  }

  if (!loaded || !config) return <div style={{ padding: 32, color: 'var(--ink-4)' }}>Loading…</div>

  const installedCount = skills.filter(s => s.installed).length
  const enabledCount = skills.filter(s => s.enabled).length

  // group skills by category
  const byCat = skills.reduce<Record<string, CatalogSkill[]>>((acc, s) => {
    (acc[s.category] ||= []).push(s); return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface-2)' }}>
      <div className="drag-region" style={{ height: 38, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 24px', fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 }}>Skills</div>

      <div style={{ padding: '16px 32px 14px', borderBottom: '1px solid var(--line-1)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.025em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} style={{ color: 'var(--accent-bright)' }} /> Skills & Packs
            </h1>
            <p style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
              {installedCount} installed · {enabledCount} enabled · {packs.filter(p => p.installed).length} packs
            </p>
          </div>
          <div style={{ display: 'flex', gap: 2, background: 'var(--surface-3)', borderRadius: 8, padding: 3 }}>
            {(['packs', 'skills'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: tab === t ? 'var(--surface-4)' : 'transparent', color: tab === t ? 'var(--ink-1)' : 'var(--ink-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'capitalize' }}>
                {t === 'packs' ? <Package size={13} /> : <Sparkles size={13} />} {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '20px 32px 32px' }}>
        {tab === 'packs' ? (
          <div className="fade-up">
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 16, lineHeight: 1.5 }}>
              One click installs every skill for a domain and connects its integrations. Any API keys still needed appear after install.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {packs.map(p => (
                <PackCard key={p.id} pack={p} config={config} onInstall={installPack} onSaveKey={set} />
              ))}
            </div>
          </div>
        ) : (
          <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={addSrc}
                  onChange={e => setAddSrc(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addSkill() }}
                  placeholder="Add a skill: git URL, raw SKILL.md URL, or local folder path"
                  style={{ flex: 1, background: 'var(--surface-3)', border: '1px solid var(--line-1)', borderRadius: 8, padding: '8px 12px', color: 'var(--ink-1)', fontSize: 12.5, outline: 'none', fontFamily: 'var(--font-mono)' }}
                  className="selectable"
                />
                <button onClick={addSkill} disabled={adding || !addSrc.trim()}
                  style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--accent)', background: 'var(--accent)', color: 'var(--accent-text-on)', fontSize: 12.5, fontWeight: 600, cursor: adding ? 'wait' : 'pointer', opacity: addSrc.trim() ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {adding ? <Loader size={12} className="spin" /> : <Plus size={13} />} Add
                </button>
              </div>
              {addErr && <p style={{ fontSize: 11.5, color: 'var(--err)', marginTop: 6 }}>{addErr}</p>}
            </div>
            {Object.entries(byCat).map(([cat, list]) => (
              <div key={cat}>
                <h3 style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>{cat}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {list.map(s => (
                    <SkillRow key={s.id} skill={s} onToggleInstall={toggleInstall} onToggleEnable={toggleEnable} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
