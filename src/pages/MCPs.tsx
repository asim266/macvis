import { useEffect, useState, useCallback } from 'react'
import { Plug, ExternalLink, Plus, X, Loader, Check, AlertCircle, Eye, EyeOff, Trash2 } from 'lucide-react'
import { useConfigStore } from '../stores/configStore'

interface MCPDef {
  id: string
  name: string
  description: string
  category: string
  source: 'official' | 'vendor' | 'community'
  featured?: boolean
  brandColor?: string
  icon: string
  command: string
  args: string[]
  env?: Record<string, string>
  inputs?: Array<{
    label: string
    configKey: string
    placeholder?: string
    type?: 'text' | 'password' | 'path'
    hint?: string
  }>
  docsUrl?: string
  setupHint?: string
}

interface MCPStatus {
  id: string
  name: string
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  toolCount: number
  error?: string
}

const SOURCE_COLOR = {
  official: 'oklch(72% 0.155 150)',
  vendor: 'oklch(72% 0.165 235)',
  community: 'oklch(74% 0.135 60)',
} as const

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'deployment', label: 'Deployment' },
  { id: 'database', label: 'Databases' },
  { id: 'search', label: 'Search' },
  { id: 'comms', label: 'Comms' },
  { id: 'productivity', label: 'Productivity' },
  { id: 'payments', label: 'Payments' },
  { id: 'utility', label: 'Utilities' },
  { id: 'media', label: 'Media' },
]

// ─── Inline input ─────────────────────────────────────────────────────────────
function InlineInput({
  label, value, onSave, placeholder, type = 'password', hint,
}: {
  label: string; value: string; onSave: (v: string) => void
  placeholder?: string; type?: string; hint?: string
}) {
  const [local, setLocal] = useState(value)
  const [show, setShow] = useState(type !== 'password')
  const [focused, setFocused] = useState(false)

  useEffect(() => { setLocal(value) }, [value])

  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{
        display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--ink-4)',
        textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 4,
        fontFamily: 'var(--font-mono)',
      }}>{label}</label>
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'var(--surface-3)',
        border: `1px solid ${focused ? 'var(--line-3)' : 'var(--line-1)'}`,
        borderRadius: 6, padding: '0 10px',
        transition: 'border-color 120ms var(--ease)',
      }}>
        <input
          type={show ? 'text' : 'password'}
          value={local}
          onChange={e => setLocal(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); if (local !== value) onSave(local) }}
          placeholder={placeholder}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--ink-1)', fontSize: 12, padding: '6px 0',
            fontFamily: 'var(--font-mono)',
          }}
          className="selectable"
        />
        {type === 'password' && (
          <button onClick={() => setShow(v => !v)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--ink-3)', padding: 2, display: 'flex',
          }}>
            {show ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        )}
      </div>
      {hint && <p style={{ fontSize: 10.5, color: 'var(--ink-4)', marginTop: 4 }}>{hint}</p>}
    </div>
  )
}

// ─── Featured Card ───────────────────────────────────────────────────────────
// A larger, prominent quick-connect card for the top 4 platform MCPs.
// Always shows token input(s) inline — no "click to expand" friction.
function FeaturedCard({
  def, status, config, onConnect, onDisconnect, onConfigSave,
}: {
  def: MCPDef
  status: MCPStatus | undefined
  config: any
  onConnect: (id: string) => Promise<void>
  onDisconnect: (id: string) => Promise<void>
  onConfigSave: (key: string, value: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const connected = status?.status === 'connected'
  const connecting = status?.status === 'connecting' || busy
  const errored = status?.status === 'error'

  const inputsFilled = (def.inputs || []).every(i => !!getNested(config, i.configKey))

  const handleToggle = async () => {
    setBusy(true)
    try {
      if (connected) await onDisconnect(def.id)
      else await onConnect(def.id)
    } finally {
      setBusy(false)
    }
  }

  const accent = def.brandColor || 'var(--accent)'

  return (
    <div style={{
      background: `linear-gradient(135deg, ${accent} 0%, transparent 50%), var(--surface-2)`,
      backgroundBlendMode: 'overlay',
      border: `1px solid ${connected ? 'var(--accent-line)' : errored ? 'var(--err)' : 'var(--line-1)'}`,
      borderRadius: 12,
      padding: '16px 18px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'border-color 200ms var(--ease)',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {/* Decorative glow */}
      <div style={{
        position: 'absolute',
        top: -40, right: -40,
        width: 140, height: 140,
        borderRadius: '50%',
        background: accent,
        filter: 'blur(50px)',
        opacity: 0.18,
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: 'var(--surface-3)',
          border: '1px solid var(--line-1)',
          display: 'grid', placeItems: 'center',
          fontSize: 22, flexShrink: 0,
          boxShadow: `0 0 18px ${accent}33`,
        }}>{def.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 600, color: 'var(--ink-1)',
            letterSpacing: '-0.015em',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>{def.name}</span>
            {connected && (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 600,
                color: 'var(--ok)',
                background: 'oklch(72% 0.155 150 / 0.1)',
                border: '1px solid oklch(72% 0.155 150 / 0.3)',
                padding: '1.5px 6px', borderRadius: 999,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>✓ {status!.toolCount} tools</span>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.45 }}>
            {def.description}
          </p>
        </div>
      </div>

      {/* Inline inputs */}
      {def.inputs?.map(input => (
        <InlineInput
          key={input.configKey}
          label={input.label}
          value={String(getNested(config, input.configKey) || '')}
          onSave={v => onConfigSave(input.configKey, v)}
          placeholder={input.placeholder}
          type={input.type || 'password'}
          hint={input.hint}
        />
      ))}

      {/* Error */}
      {errored && status?.error && (
        <div style={{
          padding: '8px 10px',
          background: 'oklch(68% 0.22 25 / 0.08)',
          border: '1px solid oklch(68% 0.22 25 / 0.3)',
          borderRadius: 6,
          fontSize: 11, color: 'var(--err)',
          fontFamily: 'var(--font-mono)',
          display: 'flex', alignItems: 'flex-start', gap: 6,
        }}>
          <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ wordBreak: 'break-word' }}>{status.error}</span>
        </div>
      )}

      {/* Connect button */}
      <button
        onClick={handleToggle}
        disabled={connecting || (!connected && !inputsFilled && (def.inputs?.length || 0) > 0)}
        style={{
          width: '100%',
          padding: '9px 14px', borderRadius: 8,
          border: '1px solid',
          borderColor: connected ? 'var(--line-2)' : 'var(--accent)',
          background: connected ? 'var(--surface-3)' : 'var(--accent)',
          color: connected ? 'var(--ink-1)' : 'oklch(98% 0 0)',
          fontSize: 12.5, fontWeight: 600, cursor: connecting ? 'wait' : 'pointer',
          opacity: (!connected && !inputsFilled && (def.inputs?.length || 0) > 0) ? 0.45 : 1,
          letterSpacing: '-0.005em',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          boxShadow: connected ? 'none' : 'inset 0 1px 0 oklch(95% 0.05 25 / 0.3), 0 0 14px var(--accent-glow)',
          transition: 'all 120ms var(--ease)',
        }}
      >
        {connecting && <Loader size={12} className="spin" />}
        {connected && !connecting && <Check size={12} strokeWidth={3} />}
        <span>
          {connecting ? 'Connecting…' :
           connected ? `Connected — disconnect` :
           errored ? `Retry connect to ${def.name}` :
           `Connect ${def.name}`}
        </span>
      </button>

      {/* Docs link */}
      {def.docsUrl && !connected && (
        <a
          href={def.docsUrl}
          onClick={e => { e.preventDefault(); window.open(def.docsUrl, '_blank') }}
          style={{
            fontSize: 11, color: 'var(--ink-3)',
            textDecoration: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            marginTop: -4,
          }}
        >
          Where to get a token <ExternalLink size={10} />
        </a>
      )}
    </div>
  )
}

// ─── MCP Card ─────────────────────────────────────────────────────────────────
function MCPCard({
  def, status, config, onConnect, onDisconnect, onConfigSave,
}: {
  def: MCPDef
  status: MCPStatus | undefined
  config: any
  onConnect: (id: string) => Promise<void>
  onDisconnect: (id: string) => Promise<void>
  onConfigSave: (key: string, value: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const connected = status?.status === 'connected'
  const connecting = status?.status === 'connecting' || busy
  const errored = status?.status === 'error'

  // Check if all required inputs are filled
  const inputsFilled = (def.inputs || []).every(i => !!config?.apiKeys?.[i.configKey.split('.').slice(-1)[0]] || !!getNested(config, i.configKey))

  const handleToggle = async () => {
    setBusy(true)
    try {
      if (connected) await onDisconnect(def.id)
      else await onConnect(def.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{
      background: 'var(--surface-2)',
      border: `1px solid ${connected ? 'var(--accent-line)' : errored ? 'var(--err)' : 'var(--line-1)'}`,
      borderRadius: 10,
      transition: 'border-color 200ms var(--ease)',
    }}>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 8,
            background: 'var(--surface-3)', border: '1px solid var(--line-1)',
            display: 'grid', placeItems: 'center', flexShrink: 0,
            fontSize: 19,
          }}>{def.icon}</div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{
                fontSize: 13.5, fontWeight: 600, color: 'var(--ink-1)',
                letterSpacing: '-0.01em',
              }}>{def.name}</span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 9,
                color: SOURCE_COLOR[def.source],
                border: `1px solid ${SOURCE_COLOR[def.source]}`,
                opacity: 0.85,
                padding: '1.5px 5px', borderRadius: 999,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                fontWeight: 600,
              }}>{def.source}</span>
              {connected && (
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 600,
                  color: 'var(--ok)',
                  background: 'oklch(72% 0.155 150 / 0.1)',
                  border: '1px solid oklch(72% 0.155 150 / 0.3)',
                  padding: '1.5px 6px', borderRadius: 999,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>✓ {status!.toolCount} tools</span>
              )}
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.45 }}>{def.description}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0, alignItems: 'flex-end' }}>
            <button
              onClick={handleToggle}
              disabled={connecting || (!connected && !inputsFilled && (def.inputs?.length || 0) > 0)}
              style={{
                padding: '6px 12px', borderRadius: 7,
                border: '1px solid',
                borderColor: connected ? 'var(--line-2)' : 'var(--accent)',
                background: connected ? 'var(--surface-3)' : 'var(--accent)',
                color: connected ? 'var(--ink-1)' : 'oklch(98% 0 0)',
                fontSize: 11.5, fontWeight: 600, cursor: connecting ? 'wait' : 'pointer',
                opacity: (!connected && !inputsFilled && (def.inputs?.length || 0) > 0) ? 0.4 : 1,
                letterSpacing: '-0.005em',
                display: 'flex', alignItems: 'center', gap: 5,
                minWidth: 90, justifyContent: 'center',
                boxShadow: connected ? 'none' : 'inset 0 1px 0 oklch(95% 0.05 25 / 0.3), 0 0 10px var(--accent-glow)',
              }}
            >
              {connecting && <Loader size={11} className="spin" />}
              {connected && !connecting && <Check size={11} strokeWidth={3} />}
              <span>
                {connecting ? 'Connecting…' :
                 connected ? 'Connected' :
                 errored ? 'Retry' : 'Connect'}
              </span>
            </button>
            {(def.inputs?.length || def.docsUrl || def.setupHint) && (
              <button
                onClick={() => setExpanded(v => !v)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--ink-4)', fontSize: 10.5,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.04em', padding: 0,
                }}
              >
                {expanded ? '▲ Hide setup' : '▼ Setup'}
              </button>
            )}
          </div>
        </div>

        {errored && status?.error && (
          <div style={{
            marginTop: 10, padding: '8px 10px',
            background: 'oklch(68% 0.22 25 / 0.08)',
            border: '1px solid oklch(68% 0.22 25 / 0.3)',
            borderRadius: 6,
            fontSize: 11, color: 'var(--err)',
            fontFamily: 'var(--font-mono)',
            display: 'flex', alignItems: 'flex-start', gap: 6,
          }}>
            <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ wordBreak: 'break-word' }}>{status.error}</span>
          </div>
        )}
      </div>

      {expanded && (
        <div style={{
          borderTop: '1px solid var(--line-1)',
          padding: '12px 16px 14px',
          background: 'var(--surface-1)',
        }}>
          {def.setupHint && (
            <div style={{
              padding: '8px 10px', marginBottom: 12,
              background: 'var(--accent-soft)',
              border: '1px solid var(--accent-line)',
              borderRadius: 6,
              fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.5,
            }}>
              💡 {def.setupHint}
            </div>
          )}

          {def.inputs?.map(input => (
            <InlineInput
              key={input.configKey}
              label={input.label}
              value={String(getNested(config, input.configKey) || '')}
              onSave={v => onConfigSave(input.configKey, v)}
              placeholder={input.placeholder}
              type={input.type || 'password'}
              hint={input.hint}
            />
          ))}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-4)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              flex: 1, marginRight: 12,
            }}>
              $ {def.command} {def.args.join(' ')}
            </div>
            {def.docsUrl && (
              <a
                href={def.docsUrl}
                onClick={e => { e.preventDefault(); window.open(def.docsUrl, '_blank') }}
                style={{
                  fontSize: 11, color: 'var(--accent-bright)',
                  textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontWeight: 500,
                }}
              >
                Docs <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function getNested(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => o?.[k], obj)
}

// ─── Custom MCP Modal ─────────────────────────────────────────────────────────
function CustomMCPModal({ onClose, onInstall }: { onClose: () => void; onInstall: (name: string, command: string, args: string[]) => Promise<void> }) {
  const [name, setName] = useState('')
  const [command, setCommand] = useState('npx')
  const [argsStr, setArgsStr] = useState('-y some-mcp-package')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const handleInstall = async () => {
    setErr('')
    if (!name.trim() || !command.trim()) {
      setErr('Name and command are required')
      return
    }
    setBusy(true)
    try {
      const args = argsStr.split(/\s+/).filter(Boolean)
      await onInstall(name.trim(), command.trim(), args)
      onClose()
    } catch (e: any) {
      setErr(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'grid', placeItems: 'center',
      zIndex: 1000,
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--line-2)',
          borderRadius: 12,
          padding: 24,
          width: 480,
          boxShadow: 'var(--shadow-3)',
        }}
        className="fade-up"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>
            Add Custom MCP
          </h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--ink-3)', padding: 4, display: 'flex',
          }}>
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 16, lineHeight: 1.5 }}>
          Paste any MCP server's spawn command. Works with anything that speaks MCP — npm packages, Python uvx tools, local binaries.
        </p>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>Display Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="My Custom MCP"
            style={{
              width: '100%', background: 'var(--surface-3)',
              border: '1px solid var(--line-1)', borderRadius: 7,
              color: 'var(--ink-1)', fontSize: 13, padding: '9px 12px',
              outline: 'none', fontFamily: 'var(--font-display)',
            }}
            className="selectable"
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>Command</label>
          <input
            value={command}
            onChange={e => setCommand(e.target.value)}
            placeholder="npx, uvx, python, etc."
            style={{
              width: '100%', background: 'var(--surface-3)',
              border: '1px solid var(--line-1)', borderRadius: 7,
              color: 'var(--ink-1)', fontSize: 13, padding: '9px 12px',
              outline: 'none', fontFamily: 'var(--font-mono)',
            }}
            className="selectable"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>Arguments</label>
          <input
            value={argsStr}
            onChange={e => setArgsStr(e.target.value)}
            placeholder="-y package-name"
            style={{
              width: '100%', background: 'var(--surface-3)',
              border: '1px solid var(--line-1)', borderRadius: 7,
              color: 'var(--ink-1)', fontSize: 13, padding: '9px 12px',
              outline: 'none', fontFamily: 'var(--font-mono)',
            }}
            className="selectable"
          />
          <p style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4 }}>
            Space-separated. Example: <code style={{ color: 'var(--accent-bright)' }}>-y @some-org/mcp-server --flag value</code>
          </p>
        </div>

        {err && (
          <div style={{
            padding: '8px 10px', marginBottom: 12,
            background: 'oklch(68% 0.22 25 / 0.08)',
            border: '1px solid oklch(68% 0.22 25 / 0.3)',
            borderRadius: 6, fontSize: 11.5, color: 'var(--err)',
          }}>{err}</div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 14px', borderRadius: 7,
            border: '1px solid var(--line-2)',
            background: 'var(--surface-3)',
            color: 'var(--ink-1)', fontSize: 12.5, fontWeight: 500,
            cursor: 'pointer',
          }}>Cancel</button>
          <button
            onClick={handleInstall}
            disabled={busy}
            style={{
              padding: '8px 14px', borderRadius: 7,
              border: '1px solid var(--accent)',
              background: 'var(--accent)',
              color: 'oklch(98% 0 0)', fontSize: 12.5, fontWeight: 600,
              cursor: busy ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: 'inset 0 1px 0 oklch(95% 0.05 25 / 0.3), 0 0 12px var(--accent-glow)',
            }}
          >
            {busy && <Loader size={11} className="spin" />}
            <span>Install</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function MCPs() {
  const { config, loaded, load, set } = useConfigStore()
  const [registry, setRegistry] = useState<MCPDef[]>([])
  const [statuses, setStatuses] = useState<Map<string, MCPStatus>>(new Map())
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [customMCPs, setCustomMCPs] = useState<any[]>([])

  useEffect(() => { if (!loaded) load() }, [loaded, load])

  const refresh = useCallback(async () => {
    const [reg, list] = await Promise.all([
      window.macvis.mcp.registry(),
      window.macvis.mcp.list(),
    ])
    setRegistry(reg || [])
    const map = new Map<string, MCPStatus>()
    for (const s of list || []) map.set(s.id, s)
    setStatuses(map)
    // Pull custom MCPs from config
    const cfg = await window.macvis.config.get()
    setCustomMCPs(cfg?.mcps?.custom || [])
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // Subscribe to status updates
  useEffect(() => {
    const unsub = window.macvis.mcp.onStatus((data: any) => {
      setStatuses(prev => {
        const next = new Map(prev)
        next.set(data.id, data)
        return next
      })
    })
    return unsub
  }, [])

  const handleConnect = async (id: string) => {
    const result = await window.macvis.mcp.connect(id)
    refresh()
    return result
  }

  const handleDisconnect = async (id: string) => {
    await window.macvis.mcp.disconnect(id)
    refresh()
  }

  const handleInstallCustom = async (name: string, command: string, args: string[]) => {
    await window.macvis.mcp.installCustom(name, command, args)
    refresh()
  }

  const handleUninstallCustom = async (id: string) => {
    await window.macvis.mcp.uninstallCustom(id)
    refresh()
  }

  if (!loaded || !config) {
    return <div style={{ padding: 32, color: 'var(--ink-4)' }}>Loading…</div>
  }

  const filtered = registry.filter(d => {
    if (category !== 'all' && d.category !== category) return false
    if (search) {
      const s = search.toLowerCase()
      if (!d.name.toLowerCase().includes(s) && !d.description.toLowerCase().includes(s)) return false
    }
    return true
  })

  const connectedCount = Array.from(statuses.values()).filter(s => s.status === 'connected').length
  const totalTools = Array.from(statuses.values()).filter(s => s.status === 'connected').reduce((a, s) => a + s.toolCount, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface-2)' }}>
      <div className="drag-region" style={{
        height: 38, flexShrink: 0,
        display: 'flex', alignItems: 'center', padding: '0 24px',
        fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500, letterSpacing: '-0.005em',
      }}>Integrations</div>

      {/* Header */}
      <div style={{
        padding: '16px 32px 14px',
        borderBottom: '1px solid var(--line-1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.025em', marginBottom: 4 }}>
              MCP Integrations
            </h1>
            <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              <span style={{ fontFamily: 'var(--font-mono)' }}>
                {connectedCount} connected · {totalTools} tools available
              </span>
            </p>
          </div>
          <button
            onClick={() => setShowCustom(true)}
            style={{
              padding: '8px 13px', borderRadius: 8,
              border: '1px solid var(--line-2)',
              background: 'var(--surface-3)',
              color: 'var(--ink-1)',
              fontSize: 12.5, fontWeight: 500,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-4)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-3)' }}
          >
            <Plus size={13} />
            Custom MCP
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search integrations…"
            style={{
              flex: 1, maxWidth: 280,
              background: 'var(--surface-3)',
              border: '1px solid var(--line-1)',
              borderRadius: 7, padding: '6px 12px',
              color: 'var(--ink-1)', fontSize: 12.5, outline: 'none',
              fontFamily: 'var(--font-display)',
            }}
            className="selectable"
          />
          <div style={{ display: 'flex', gap: 2, overflowX: 'auto' }}>
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                style={{
                  padding: '5px 10px', borderRadius: 6,
                  border: 'none',
                  background: category === c.id ? 'var(--surface-4)' : 'transparent',
                  color: category === c.id ? 'var(--ink-1)' : 'var(--ink-3)',
                  fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 100ms var(--ease)',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '20px 32px 32px' }}>
        <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Featured Quick Connect (only on 'all' category, no search) */}
          {category === 'all' && !search && (
            <>
              <h3 style={{
                fontSize: 10.5, fontWeight: 700, color: 'var(--ink-4)',
                textTransform: 'uppercase', letterSpacing: '0.12em',
                fontFamily: 'var(--font-mono)', marginTop: 4, marginBottom: 6,
              }}>Quick Connect</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 12,
                marginBottom: 12,
              }}>
                {registry.filter(d => d.featured).map(def => (
                  <FeaturedCard
                    key={def.id}
                    def={def}
                    status={statuses.get(def.id)}
                    config={config}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    onConfigSave={set}
                  />
                ))}
              </div>
            </>
          )}

          {/* Custom MCPs section */}
          {customMCPs.length > 0 && category === 'all' && (
            <>
              <h3 style={{
                fontSize: 10.5, fontWeight: 700, color: 'var(--ink-4)',
                textTransform: 'uppercase', letterSpacing: '0.12em',
                fontFamily: 'var(--font-mono)', marginTop: 4, marginBottom: 4,
              }}>Custom</h3>
              {customMCPs.map(c => (
                <div key={c.id} style={{
                  background: 'var(--surface-2)',
                  border: `1px solid ${statuses.get(c.id)?.status === 'connected' ? 'var(--accent-line)' : 'var(--line-1)'}`,
                  borderRadius: 10, padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 8,
                      background: 'var(--surface-3)', border: '1px solid var(--line-1)',
                      display: 'grid', placeItems: 'center', flexShrink: 0,
                      fontSize: 18,
                    }}>🔌</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-1)' }}>{c.name}</span>
                        {statuses.get(c.id)?.status === 'connected' && (
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 600,
                            color: 'var(--ok)',
                            background: 'oklch(72% 0.155 150 / 0.1)',
                            border: '1px solid oklch(72% 0.155 150 / 0.3)',
                            padding: '1.5px 6px', borderRadius: 999,
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                          }}>✓ {statuses.get(c.id)!.toolCount} tools</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                        $ {c.command} {c.args.join(' ')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button
                        onClick={() => statuses.get(c.id)?.status === 'connected' ? handleDisconnect(c.id) : handleConnect(c.id)}
                        style={{
                          padding: '6px 12px', borderRadius: 7,
                          border: '1px solid',
                          borderColor: statuses.get(c.id)?.status === 'connected' ? 'var(--line-2)' : 'var(--accent)',
                          background: statuses.get(c.id)?.status === 'connected' ? 'var(--surface-3)' : 'var(--accent)',
                          color: statuses.get(c.id)?.status === 'connected' ? 'var(--ink-1)' : 'oklch(98% 0 0)',
                          fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        {statuses.get(c.id)?.status === 'connected' ? 'Disconnect' : 'Connect'}
                      </button>
                      <button
                        onClick={() => handleUninstallCustom(c.id)}
                        title="Uninstall"
                        style={{
                          padding: '6px 8px', borderRadius: 7,
                          border: '1px solid var(--line-2)',
                          background: 'var(--surface-3)',
                          color: 'var(--ink-3)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center',
                        }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <h3 style={{
                fontSize: 10.5, fontWeight: 700, color: 'var(--ink-4)',
                textTransform: 'uppercase', letterSpacing: '0.12em',
                fontFamily: 'var(--font-mono)', marginTop: 16, marginBottom: 4,
              }}>Catalog</h3>
            </>
          )}

          {/* Catalog header when there are featured cards above */}
          {category === 'all' && !search && customMCPs.length === 0 && (
            <h3 style={{
              fontSize: 10.5, fontWeight: 700, color: 'var(--ink-4)',
              textTransform: 'uppercase', letterSpacing: '0.12em',
              fontFamily: 'var(--font-mono)', marginTop: 10, marginBottom: 4,
            }}>All Integrations</h3>
          )}

          {filtered.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: 40,
              color: 'var(--ink-4)', fontSize: 13,
            }}>
              No integrations match "{search}"
            </div>
          ) : (
            filtered.map(def => (
              <MCPCard
                key={def.id}
                def={def}
                status={statuses.get(def.id)}
                config={config}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onConfigSave={set}
              />
            ))
          )}
        </div>
      </div>

      {showCustom && (
        <CustomMCPModal
          onClose={() => setShowCustom(false)}
          onInstall={handleInstallCustom}
        />
      )}
    </div>
  )
}
