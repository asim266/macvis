import { useEffect, useState } from 'react'
import { useConfigStore } from '../stores/configStore'
import { CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react'

type Tab = 'apikeys' | 'models' | 'appearance'

interface KeyInputProps {
  label: string
  hint?: string
  configKey: string
  value: string
  onSave: (key: string, value: string) => void
}

function KeyInput({ label, hint, configKey, value, onSave }: KeyInputProps) {
  const [local, setLocal] = useState(value)
  const [show, setShow] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setLocal(value) }, [value])

  const handleBlur = () => {
    if (local !== value) {
      onSave(configKey, local)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px' }}>
          <input
            type={show ? 'text' : 'password'}
            value={local}
            onChange={e => setLocal(e.target.value)}
            onBlur={handleBlur}
            placeholder="Enter key..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 13, padding: '8px 0', fontFamily: 'monospace' }}
            className="selectable"
          />
          <button onClick={() => setShow(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {saved && <CheckCircle size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />}
      </div>
      {hint && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{hint}</p>}
    </div>
  )
}

export function Settings() {
  const { config, loaded, load, set } = useConfigStore()
  const [tab, setTab] = useState<Tab>('apikeys')

  useEffect(() => { if (!loaded) load() }, [loaded, load])

  if (!loaded || !config) {
    return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Loading...</div>
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'apikeys', label: 'API Keys' },
    { id: 'models', label: 'Models' },
    { id: 'appearance', label: 'Appearance' },
  ]

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-primary)' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, padding: '12px 24px 0', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-secondary)' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '6px 16px',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              background: 'transparent',
              color: tab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: 13,
              fontWeight: tab === t.id ? 600 : 400,
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '24px 32px', maxWidth: 640 }}>
        {tab === 'apikeys' && (
          <div>
            <Section title="AI Models">
              <KeyInput label="Anthropic" hint="Required for Claude models. Get from console.anthropic.com" configKey="apiKeys.anthropic" value={config.apiKeys?.anthropic || ''} onSave={set} />
              <KeyInput label="OpenAI" hint="Optional fallback model." configKey="apiKeys.openai" value={config.apiKeys?.openai || ''} onSave={set} />
              <KeyInput label="Groq" configKey="apiKeys.groq" value={config.apiKeys?.groq || ''} onSave={set} />
            </Section>

            <Section title="Search">
              <KeyInput label="Tavily" hint="Recommended for web search. tavily.com" configKey="apiKeys.tavily" value={config.apiKeys?.tavily || ''} onSave={set} />
              <KeyInput label="Serper" hint="Alternative web search. serper.dev" configKey="apiKeys.serper" value={config.apiKeys?.serper || ''} onSave={set} />
              <KeyInput label="Brave Search" configKey="apiKeys.brave" value={config.apiKeys?.brave || ''} onSave={set} />
            </Section>

            <Section title="Other">
              <KeyInput label="ElevenLabs" configKey="apiKeys.elevenlabs" value={config.apiKeys?.elevenlabs || ''} onSave={set} />
              <KeyInput label="Firecrawl" configKey="apiKeys.firecrawl" value={config.apiKeys?.firecrawl || ''} onSave={set} />
            </Section>
          </div>
        )}

        {tab === 'models' && (
          <div>
            <Section title="Default Model">
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Model
                </label>
                <select
                  value={config.models?.default || 'claude-opus-4-5'}
                  onChange={e => set('models.default', e.target.value)}
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, padding: '8px 12px', width: '100%', outline: 'none' }}
                >
                  <optgroup label="Anthropic">
                    <option value="claude-opus-4-5">claude-opus-4-5</option>
                    <option value="claude-sonnet-4-5">claude-sonnet-4-5</option>
                    <option value="claude-haiku-4-5">claude-haiku-4-5</option>
                  </optgroup>
                  <optgroup label="OpenAI">
                    <option value="gpt-4o">gpt-4o</option>
                    <option value="gpt-4o-mini">gpt-4o-mini</option>
                  </optgroup>
                </select>
              </div>
            </Section>
          </div>
        )}

        {tab === 'appearance' && (
          <div>
            <Section title="Theme">
              <div className="flex gap-2">
                {(['system', 'dark', 'light'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => set('ui.theme', t)}
                    style={{
                      padding: '6px 16px',
                      borderRadius: 8,
                      border: `1px solid ${config.ui?.theme === t ? 'var(--accent)' : 'var(--border)'}`,
                      background: config.ui?.theme === t ? 'var(--accent-dim)' : 'var(--bg-tertiary)',
                      color: config.ui?.theme === t ? 'var(--accent)' : 'var(--text-secondary)',
                      fontSize: 13,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>{title}</h3>
      {children}
    </div>
  )
}
