import { useEffect, useState } from 'react'
import { useConfigStore } from '../stores/configStore'
import { Eye, EyeOff, Check, X, Loader, AlertCircle, Play, Square } from 'lucide-react'

type Tab = 'chat' | 'other' | 'telegram' | 'appearance'
type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid'

interface ProviderInfo {
  valid: boolean
  models: string[]
  checkedAt: number
  error?: string
}

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  openrouter: 'OpenRouter',
  gemini: 'Gemini',
  groq: 'Groq',
  ollama: 'Ollama',
  nanoBanana: 'Nano Banana',
}

// ─── Provider Card — key input + test + inline model picker ───────────────────
function ProviderCard({
  providerName, label, hint, configKey, value, placeholder,
  providerInfo, selectedModel, onSave, onValidate, onSelectModel,
}: {
  providerName: string
  label: string
  hint?: string
  configKey: string
  value: string
  placeholder?: string
  providerInfo?: ProviderInfo
  selectedModel?: string
  onSave: (key: string, value: string) => void
  onValidate: (provider: string, key: string) => Promise<void>
  onSelectModel: (provider: string, model: string) => void
}) {
  const [local, setLocal] = useState(value)
  const [show, setShow] = useState(false)
  const [focused, setFocused] = useState(false)
  const [state, setState] = useState<ValidationState>(
    providerInfo?.valid === true ? 'valid' : providerInfo?.valid === false ? 'invalid' : 'idle'
  )

  useEffect(() => { setLocal(value) }, [value])
  useEffect(() => {
    if (providerInfo?.valid === true) setState('valid')
    else if (providerInfo?.valid === false) setState('invalid')
  }, [providerInfo?.valid, providerInfo?.checkedAt])

  const commit = () => {
    if (local !== value) {
      onSave(configKey, local)
      setState('idle')
    }
  }

  const handleValidate = async () => {
    if (!local.trim()) return
    if (local !== value) onSave(configKey, local)
    setState('validating')
    try {
      await onValidate(providerName, local)
    } catch {
      setState('invalid')
    }
  }

  const handleClear = () => {
    onSave(configKey, '')
    setLocal('')
    setState('idle')
  }

  const stateColor =
    state === 'valid' ? 'var(--ok)' : state === 'invalid' ? 'var(--err)' : 'var(--ink-4)'
  const isValid = state === 'valid' && (providerInfo?.models?.length || 0) > 0

  return (
    <div
      style={{
        background: 'var(--surface-2)',
        border: `1px solid ${isValid ? 'var(--accent-line)' : 'var(--line-1)'}`,
        borderRadius: 10,
        padding: '14px 16px',
        marginBottom: 12,
        transition: 'border-color 200ms var(--ease)',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 13, fontWeight: 600, color: 'var(--ink-1)',
            letterSpacing: '-0.01em',
          }}>{label}</span>
          {isValid && (
            <span style={{
              fontSize: 9.5, fontFamily: 'var(--font-mono)',
              color: 'var(--ok)', letterSpacing: '0.06em',
              background: 'oklch(72% 0.155 150 / 0.1)',
              border: '1px solid oklch(72% 0.155 150 / 0.3)',
              padding: '2px 7px', borderRadius: 999,
              fontWeight: 600, textTransform: 'uppercase',
            }}>
              ✓ {providerInfo!.models.length} models
            </span>
          )}
        </div>
        {value && (
          <button
            onClick={handleClear}
            title="Remove key"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--ink-4)', padding: 4, display: 'flex',
              fontSize: 11,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--err)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-4)' }}
          >
            <X size={13} /> <span style={{ marginLeft: 4 }}>Remove</span>
          </button>
        )}
      </div>

      {/* Key input + test button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            flex: 1, display: 'flex', alignItems: 'center',
            background: 'var(--surface-3)',
            border: `1px solid ${focused ? 'var(--line-3)' : 'var(--line-1)'}`,
            borderRadius: 8, padding: '0 12px',
            transition: 'border-color 120ms var(--ease), box-shadow 120ms var(--ease)',
            boxShadow: focused ? '0 0 0 3px var(--accent-soft)' : 'none',
          }}
        >
          <input
            type={show ? 'text' : 'password'}
            value={local}
            onChange={e => setLocal(e.target.value)}
            onBlur={() => { setFocused(false); commit() }}
            onFocus={() => setFocused(true)}
            placeholder={placeholder || 'Not set'}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--ink-1)', fontSize: 12.5, padding: '9px 0',
              fontFamily: 'var(--font-mono)',
            }}
            className="selectable"
          />
          <button
            onClick={() => setShow(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4, display: 'flex', alignItems: 'center' }}
          >
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
        <button
          onClick={handleValidate}
          disabled={state === 'validating' || !local.trim()}
          style={{
            padding: '8px 12px', borderRadius: 8,
            border: '1px solid',
            borderColor: state === 'valid'
              ? 'oklch(72% 0.155 150 / 0.4)'
              : state === 'invalid' ? 'var(--err)' : 'var(--line-2)',
            background: state === 'valid'
              ? 'oklch(72% 0.155 150 / 0.1)'
              : state === 'invalid' ? 'oklch(68% 0.22 25 / 0.12)' : 'var(--surface-3)',
            color: stateColor,
            fontSize: 11.5, fontWeight: 600,
            cursor: state === 'validating' || !local.trim() ? 'default' : 'pointer',
            opacity: !local.trim() ? 0.5 : 1,
            display: 'flex', alignItems: 'center', gap: 6,
            letterSpacing: '-0.005em', transition: 'all 120ms var(--ease)',
            minWidth: 90, justifyContent: 'center',
          }}
        >
          {state === 'validating' && <Loader size={11} className="spin" />}
          {state === 'valid' && <Check size={12} strokeWidth={3} />}
          {state === 'invalid' && <X size={12} strokeWidth={3} />}
          <span>
            {state === 'validating' ? 'Testing…' :
             state === 'valid' ? 'Valid' :
             state === 'invalid' ? 'Invalid' : 'Test'}
          </span>
        </button>
      </div>

      {/* Hint */}
      {hint && state !== 'invalid' && !isValid && (
        <p style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 6, lineHeight: 1.5 }}>
          {hint}
        </p>
      )}
      {state === 'invalid' && providerInfo?.error && (
        <p style={{
          fontSize: 11.5, color: 'var(--err)', marginTop: 6, lineHeight: 1.5,
          fontFamily: 'var(--font-mono)',
          display: 'flex', alignItems: 'flex-start', gap: 6,
        }}>
          <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ wordBreak: 'break-word' }}>{providerInfo.error}</span>
        </p>
      )}

      {/* Inline model picker */}
      {isValid && (
        <div
          className="fade-up"
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px dashed var(--line-1)',
          }}
        >
          <label style={{
            display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--ink-4)',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
            fontFamily: 'var(--font-mono)',
          }}>
            Selected model
          </label>
          <select
            value={selectedModel || providerInfo!.models[0]}
            onChange={e => onSelectModel(providerName, e.target.value)}
            style={{
              background: 'var(--surface-3)',
              border: '1px solid var(--line-1)',
              borderRadius: 7,
              color: 'var(--ink-1)',
              fontSize: 12.5, padding: '7px 10px',
              width: '100%', outline: 'none',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
            }}
          >
            {providerInfo!.models.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

// ─── Plain key input (non-validated) ──────────────────────────────────────────
function KeyInput({
  label, hint, configKey, value, onSave, placeholder, mono = true,
}: {
  label: string; hint?: string; configKey: string; value: string
  onSave: (key: string, value: string) => void; placeholder?: string; mono?: boolean
}) {
  const [local, setLocal] = useState(value)
  const [show, setShow] = useState(false)
  const [focused, setFocused] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setLocal(value) }, [value])

  const commit = () => {
    if (local !== value) {
      onSave(configKey, local)
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    }
  }

  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: 'block', fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)',
        textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8,
      }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          background: 'var(--surface-3)',
          border: `1px solid ${focused ? 'var(--line-3)' : 'var(--line-1)'}`,
          borderRadius: 8, padding: '0 12px',
          transition: 'border-color 120ms var(--ease), box-shadow 120ms var(--ease)',
          boxShadow: focused ? '0 0 0 3px var(--accent-soft)' : 'none',
        }}>
          <input
            type={show ? 'text' : 'password'}
            value={local}
            onChange={e => setLocal(e.target.value)}
            onBlur={() => { setFocused(false); commit() }}
            onFocus={() => setFocused(true)}
            placeholder={placeholder || 'Not set'}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--ink-1)', fontSize: 12.5, padding: '9px 0',
              fontFamily: mono ? 'var(--font-mono)' : 'var(--font-display)',
            }}
            className="selectable"
          />
          <button onClick={() => setShow(v => !v)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--ink-3)', padding: 4, display: 'flex', alignItems: 'center',
          }}>
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
        <div style={{
          width: 18, height: 18, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: saved ? 1 : 0,
          transition: 'opacity 200ms var(--ease)',
          color: 'var(--ok)',
        }}>
          <Check size={14} />
        </div>
      </div>
      {hint && <p style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 6, lineHeight: 1.5 }}>{hint}</p>}
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h3 style={{
        fontSize: 10.5, fontWeight: 700, color: 'var(--ink-4)',
        textTransform: 'uppercase', letterSpacing: '0.12em',
        marginBottom: hint ? 4 : 18, fontFamily: 'var(--font-mono)',
      }}>{title}</h3>
      {hint && <p style={{ fontSize: 11.5, color: 'var(--ink-4)', marginBottom: 18, lineHeight: 1.5 }}>{hint}</p>}
      {children}
    </div>
  )
}

// ─── Fallback chain row ───────────────────────────────────────────────────────
function ChainSlot({
  label, badge, value, options, onChange,
}: {
  label: string
  badge: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  const isSet = !!value
  return (
    <div
      style={{
        background: 'var(--surface-3)',
        border: `1px solid ${isSet ? 'var(--accent-line)' : 'var(--line-1)'}`,
        borderRadius: 9,
        padding: '10px 12px',
        marginBottom: 8,
        display: 'flex', alignItems: 'center', gap: 12,
        transition: 'border-color 200ms var(--ease)',
      }}
    >
      <div style={{
        width: 26, height: 26, borderRadius: 6,
        background: isSet ? 'var(--accent)' : 'var(--surface-4)',
        color: isSet ? 'oklch(98% 0 0)' : 'var(--ink-4)',
        display: 'grid', placeItems: 'center',
        fontSize: 11, fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        flexShrink: 0,
      }}>
        {badge}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 10, fontWeight: 600, color: 'var(--ink-3)',
          textTransform: 'uppercase', letterSpacing: '0.1em',
          fontFamily: 'var(--font-mono)', marginBottom: 4,
        }}>{label}</div>
        <select
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none', outline: 'none',
            color: isSet ? 'var(--ink-1)' : 'var(--ink-4)',
            fontSize: 12.5,
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
            width: '100%', padding: 0,
          }}
        >
          <option value="">— None —</option>
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
      <div onClick={() => onChange(!checked)} style={{
        width: 36, height: 20, borderRadius: 999,
        background: checked ? 'var(--accent)' : 'var(--surface-3)',
        border: `1px solid ${checked ? 'var(--accent)' : 'var(--line-2)'}`,
        position: 'relative', cursor: 'pointer',
        transition: 'all 180ms var(--ease)', flexShrink: 0,
        boxShadow: checked ? '0 0 12px var(--accent-glow)' : 'none',
      }}>
        <div style={{
          position: 'absolute', top: 1, left: checked ? 17 : 1,
          width: 16, height: 16, borderRadius: 999,
          background: checked ? 'oklch(98% 0 0)' : 'var(--ink-2)',
          transition: 'left 180ms var(--ease)',
          boxShadow: '0 1px 2px rgb(0 0 0 / 0.4)',
        }} />
      </div>
      <span style={{ fontSize: 13, color: 'var(--ink-1)' }}>{label}</span>
    </label>
  )
}

// ─── PillGroup ────────────────────────────────────────────────────────────────
function PillGroup<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{
      display: 'inline-flex',
      background: 'var(--surface-3)', border: '1px solid var(--line-1)',
      borderRadius: 8, padding: 3, gap: 2,
    }}>
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)} style={{
          padding: '6px 14px', borderRadius: 6, border: 'none',
          background: value === opt ? 'var(--surface-1)' : 'transparent',
          color: value === opt ? 'var(--ink-1)' : 'var(--ink-3)',
          fontSize: 12, fontWeight: 500, cursor: 'pointer',
          textTransform: 'capitalize', transition: 'all 120ms var(--ease)',
          boxShadow: value === opt ? 'var(--shadow-1)' : 'none',
        }}>{opt}</button>
      ))}
    </div>
  )
}

// ─── Telegram controls ───────────────────────────────────────────────────────
function TelegramControls() {
  const [running, setRunning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.macvis.telegram.status().then((r: any) => setRunning(!!r?.running))
    const unsub = window.macvis.telegram.onStatus((data: any) => {
      setRunning(!!data.running)
      if (data.error) setError(data.error)
      else setError(null)
    })
    return unsub
  }, [])

  const handleStart = async () => {
    setBusy(true)
    setError(null)
    const r = await window.macvis.telegram.start()
    if (!r.ok) setError(r.error || 'Failed to start bot')
    else setRunning(true)
    setBusy(false)
  }

  const handleStop = async () => {
    setBusy(true)
    await window.macvis.telegram.stop()
    setRunning(false)
    setBusy(false)
  }

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px',
        background: 'var(--surface-3)',
        border: `1px solid ${running ? 'oklch(72% 0.155 150 / 0.4)' : 'var(--line-1)'}`,
        borderRadius: 9,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: 999,
          background: running ? 'var(--ok)' : 'var(--ink-4)',
          boxShadow: running ? '0 0 8px oklch(72% 0.155 150 / 0.7)' : 'none',
          flexShrink: 0,
        }} />
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: 'var(--ink-1)',
            fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            {running ? 'Bot running' : 'Bot stopped'}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>
            {running
              ? 'Send a message to your bot — it will appear as a new chat in MacVis.'
              : 'Click Start to bring the bot online.'}
          </div>
        </div>
        <button
          onClick={running ? handleStop : handleStart}
          disabled={busy}
          style={{
            padding: '7px 14px', borderRadius: 7,
            border: '1px solid',
            borderColor: running ? 'var(--err)' : 'var(--accent)',
            background: running ? 'oklch(68% 0.22 25 / 0.12)' : 'var(--accent)',
            color: running ? 'var(--err)' : 'oklch(98% 0 0)',
            fontSize: 12, fontWeight: 600,
            cursor: busy ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            letterSpacing: '-0.005em',
            boxShadow: running ? 'none' : 'inset 0 1px 0 oklch(95% 0.05 25 / 0.3), 0 0 12px var(--accent-glow)',
          }}
        >
          {busy ? <Loader size={11} className="spin" /> :
           running ? <Square size={11} fill="currentColor" /> :
           <Play size={11} fill="currentColor" />}
          <span>{running ? 'Stop' : 'Start'}</span>
        </button>
      </div>

      {error && (
        <div style={{
          marginTop: 10, padding: '8px 10px',
          background: 'oklch(68% 0.22 25 / 0.08)',
          border: '1px solid oklch(68% 0.22 25 / 0.3)',
          borderRadius: 6,
          fontSize: 11.5, color: 'var(--err)',
          display: 'flex', alignItems: 'flex-start', gap: 6,
        }}>
          <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ wordBreak: 'break-word' }}>{error}</span>
        </div>
      )}
    </div>
  )
}

// ─── Main Settings ────────────────────────────────────────────────────────────
export function Settings() {
  const { config, loaded, load, set } = useConfigStore()
  const [tab, setTab] = useState<Tab>('chat')
  const [providers, setProviders] = useState<Record<string, ProviderInfo>>({})

  useEffect(() => { if (!loaded) load() }, [loaded, load])

  useEffect(() => {
    window.macvis.provider.listAll().then((data: any) => {
      setProviders(data || {})
    })
  }, [])

  const handleValidate = async (provider: string, key: string) => {
    const result = await window.macvis.provider.validate(provider, key)
    setProviders(prev => ({
      ...prev,
      [provider]: {
        valid: result.valid,
        models: result.models || [],
        checkedAt: Date.now(),
        error: result.error,
      },
    }))
    // Auto-select first model if none selected yet
    if (result.valid && result.models?.length && !config?.models?.selections?.[provider]) {
      set(`models.selections.${provider}`, result.models[0])
    }
  }

  const handleSelectModel = (provider: string, model: string) => {
    set(`models.selections.${provider}`, model)
  }

  const handleChainSlotChange = (slot: number, value: string) => {
    const chain = [...(config.models?.chain || [])]
    while (chain.length < 3) chain.push('')
    chain[slot] = value
    // Mirror primary into models.default + provider for AgentLoop
    if (slot === 0 && value) {
      const [provider, model] = value.split(':')
      set('models.default', model)
      set('models.provider', provider)
    }
    set('models.chain', chain.slice(0, 3))
  }

  if (!loaded || !config) {
    return <div style={{ padding: 32, color: 'var(--ink-4)', fontSize: 13 }}>Loading…</div>
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'chat', label: 'Chat API Keys' },
    { id: 'other', label: 'Other Keys' },
    { id: 'telegram', label: 'Telegram' },
    { id: 'appearance', label: 'Appearance' },
  ]

  const chatProviders = [
    { name: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-...', hint: 'Get your key at console.anthropic.com' },
    { name: 'openai', label: 'OpenAI', placeholder: 'sk-...', hint: 'Get your key at platform.openai.com' },
    { name: 'openrouter', label: 'OpenRouter', placeholder: 'sk-or-...', hint: 'Access 200+ models with one key · openrouter.ai/keys' },
    { name: 'gemini', label: 'Gemini', placeholder: 'AIza...', hint: 'Get your key at aistudio.google.com/apikey' },
    { name: 'groq', label: 'Groq', placeholder: 'gsk_...', hint: 'Fast Llama / Mixtral inference · console.groq.com' },
    { name: 'ollama', label: 'Ollama', placeholder: 'http://localhost:11434', hint: 'Local Ollama endpoint (no key needed)' },
  ]

  // Build chain options from validated providers + their selected model
  const chainOptions: { value: string; label: string }[] = []
  for (const cp of chatProviders) {
    const info = providers[cp.name]
    if (!info?.valid || !info.models?.length) continue
    const selected = config.models?.selections?.[cp.name] || info.models[0]
    chainOptions.push({
      value: `${cp.name}:${selected}`,
      label: `${PROVIDER_LABELS[cp.name] || cp.name} · ${selected}`,
    })
  }
  const chain: string[] = config.models?.chain || []


  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface-2)' }}>
      {/* Drag region */}
      <div className="drag-region" style={{
        height: 38, flexShrink: 0, background: 'var(--surface-2)',
        display: 'flex', alignItems: 'center', padding: '0 24px',
        fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500, letterSpacing: '-0.005em',
      }}>
        Settings
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', padding: '0 24px',
        borderBottom: '1px solid var(--line-1)',
        background: 'var(--surface-2)', flexShrink: 0,
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '14px 14px 12px', border: 'none', background: 'transparent',
            color: tab === t.id ? 'var(--ink-1)' : 'var(--ink-3)',
            fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
            position: 'relative', letterSpacing: '-0.005em',
            transition: 'color 120ms var(--ease)',
          }}
            onMouseEnter={e => { if (tab !== t.id) e.currentTarget.style.color = 'var(--ink-2)' }}
            onMouseLeave={e => { if (tab !== t.id) e.currentTarget.style.color = 'var(--ink-3)' }}
          >
            {t.label}
            {tab === t.id && (
              <span style={{
                position: 'absolute', bottom: -1, left: 12, right: 12,
                height: 2, background: 'var(--accent)',
                borderRadius: '2px 2px 0 0',
              }} />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ maxWidth: 680, padding: '32px 32px 64px', margin: '0 auto' }} className="fade-up">

          {tab === 'chat' && (
            <>
              {/* Fallback chain — only if at least one provider is validated */}
              {chainOptions.length > 0 && (
                <Section
                  title="Fallback Chain"
                  hint="MacVis tries Primary first. If it fails or is rate-limited, it falls back to Secondary, then Tertiary."
                >
                  <ChainSlot label="Primary" badge="1°" value={chain[0] || ''} options={chainOptions} onChange={v => handleChainSlotChange(0, v)} />
                  <ChainSlot label="Secondary" badge="2°" value={chain[1] || ''} options={chainOptions} onChange={v => handleChainSlotChange(1, v)} />
                  <ChainSlot label="Tertiary" badge="3°" value={chain[2] || ''} options={chainOptions} onChange={v => handleChainSlotChange(2, v)} />
                </Section>
              )}

              <Section
                title="Providers"
                hint="Add chat-model API keys. Click ‘Test’ to verify and load available models. Then pick a model below to use this provider in the fallback chain."
              >
                {chatProviders.map(p => (
                  <ProviderCard
                    key={p.name}
                    providerName={p.name}
                    label={p.label}
                    hint={p.hint}
                    placeholder={p.placeholder}
                    configKey={`apiKeys.${p.name}`}
                    value={config.apiKeys?.[p.name] || ''}
                    providerInfo={providers[p.name]}
                    selectedModel={config.models?.selections?.[p.name]}
                    onSave={set}
                    onValidate={handleValidate}
                    onSelectModel={handleSelectModel}
                  />
                ))}
              </Section>
            </>
          )}

          {tab === 'other' && (
            <>
              <Section title="Image Generation" hint="Nano Banana is Google's image-gen model (Gemini 2.5 Flash Image). Same key as Gemini works.">
                <ProviderCard
                  providerName="nanoBanana"
                  label="Nano Banana"
                  hint="Reuse your Gemini key for image generation"
                  configKey="apiKeys.nanoBanana"
                  value={config.apiKeys?.nanoBanana || ''}
                  placeholder="AIza..."
                  providerInfo={providers.nanoBanana}
                  selectedModel={config.models?.imageGen}
                  onSave={set}
                  onValidate={handleValidate}
                  onSelectModel={(_, model) => set('models.imageGen', model)}
                />
              </Section>

              <Section title="Web Search">
                <KeyInput label="Tavily" hint="Best for AI-optimized search · tavily.com" configKey="apiKeys.tavily" value={config.apiKeys?.tavily || ''} onSave={set} />
                <KeyInput label="Serper" hint="Google search API · serper.dev" configKey="apiKeys.serper" value={config.apiKeys?.serper || ''} onSave={set} />
                <KeyInput label="Brave Search" configKey="apiKeys.brave" value={config.apiKeys?.brave || ''} onSave={set} />
              </Section>

              <Section title="Other">
                <KeyInput label="ElevenLabs" hint="Voice synthesis" configKey="apiKeys.elevenlabs" value={config.apiKeys?.elevenlabs || ''} onSave={set} />
                <KeyInput label="Firecrawl" hint="Web scraping" configKey="apiKeys.firecrawl" value={config.apiKeys?.firecrawl || ''} onSave={set} />
              </Section>

              <Section title="Storage">
                <p style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
                  ~/Library/Application Support/macvis/config.json
                </p>
              </Section>
            </>
          )}

          {tab === 'telegram' && (
            <>
              <Section title="Setup">
                <div style={{
                  background: 'var(--accent-soft)',
                  border: '1px solid var(--accent-line)',
                  borderRadius: 10,
                  padding: '14px 16px',
                  marginBottom: 18,
                  fontSize: 12.5,
                  lineHeight: 1.7,
                  color: 'var(--ink-2)',
                }}>
                  <ol style={{ paddingLeft: 18, margin: 0 }}>
                    <li>Open Telegram and message <strong style={{ color: 'var(--ink-1)' }}>@BotFather</strong></li>
                    <li>Send <code>/newbot</code> and follow the prompts</li>
                    <li>Copy the bot token below</li>
                    <li>Message <strong style={{ color: 'var(--ink-1)' }}>@userinfobot</strong> for your numeric ID</li>
                  </ol>
                </div>
              </Section>

              <Section title="Configuration">
                <KeyInput label="Bot Token" hint="From @BotFather" configKey="apiKeys.telegram.botToken" value={config.apiKeys?.telegram?.botToken || ''} onSave={set} placeholder="1234567890:ABC..." />
                <KeyInput label="Allowed User ID" hint="Your numeric Telegram user ID" configKey="apiKeys.telegram.allowedUserId" value={config.apiKeys?.telegram?.allowedUserId || ''} onSave={set} placeholder="123456789" />
              </Section>

              <Section title="Bot Control" hint="Start the bot to receive messages on Telegram. Each Telegram conversation becomes a chat session in MacVis.">
                <TelegramControls />
              </Section>

              <Section title="Startup">
                <Toggle
                  checked={!!config.telegram?.runOnStartup}
                  onChange={v => set('telegram.runOnStartup', v)}
                  label="Start bot automatically when MacVis opens"
                />
              </Section>
            </>
          )}

          {tab === 'appearance' && (
            <>
              <Section title="Theme">
                <PillGroup options={['system', 'dark', 'light'] as const} value={(config.ui?.theme || 'system') as any} onChange={v => set('ui.theme', v)} />
              </Section>
              <Section title="Font Size">
                <PillGroup options={['small', 'medium', 'large'] as const} value={(config.ui?.fontSize || 'medium') as any} onChange={v => set('ui.fontSize', v)} />
              </Section>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
