import { useEffect, useState } from 'react'
import { useConfigStore } from '../stores/configStore'
import { Eye, EyeOff, Check } from 'lucide-react'

type Tab = 'apikeys' | 'models' | 'mcps' | 'telegram' | 'appearance'

// ─── Reusable input ───────────────────────────────────────────────────────────
function KeyInput({
  label, hint, configKey, value, onSave, placeholder, mono = true,
}: {
  label: string
  hint?: string
  configKey: string
  value: string
  onSave: (key: string, value: string) => void
  placeholder?: string
  mono?: boolean
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
      <label
        style={{
          display: 'block',
          fontSize: 10.5,
          fontWeight: 600,
          color: 'var(--ink-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.09em',
          marginBottom: 8,
        }}
      >
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            background: 'var(--surface-3)',
            border: `1px solid ${focused ? 'var(--line-3)' : 'var(--line-1)'}`,
            borderRadius: 8,
            padding: '0 12px',
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
            onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            placeholder={placeholder || 'Not set'}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--ink-1)',
              fontSize: 12.5,
              padding: '9px 0',
              fontFamily: mono ? 'var(--font-mono)' : 'var(--font-display)',
              letterSpacing: 0,
            }}
            className="selectable"
          />
          <button
            onClick={() => setShow(v => !v)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--ink-3)', padding: 4,
              display: 'flex', alignItems: 'center',
            }}
          >
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
        <div
          style={{
            width: 18, height: 18, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: saved ? 1 : 0,
            transition: 'opacity 200ms var(--ease)',
            color: 'var(--ok)',
          }}
        >
          <Check size={14} />
        </div>
      </div>
      {hint && (
        <p style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 6, lineHeight: 1.5 }}>
          {hint}
        </p>
      )}
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h3
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          color: 'var(--ink-4)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          marginBottom: hint ? 4 : 18,
          fontFamily: 'var(--font-mono)',
        }}
      >
        {title}
      </h3>
      {hint && <p style={{ fontSize: 11.5, color: 'var(--ink-4)', marginBottom: 18, lineHeight: 1.5 }}>{hint}</p>}
      {children}
    </div>
  )
}

// ─── MCP card ─────────────────────────────────────────────────────────────────
function MCPCard({
  name, displayName, description, icon, enabled, token, tokenLabel, tokenKey,
  onToggle, onTokenSave,
}: any) {
  const [localToken, setLocalToken] = useState(token || '')
  const [show, setShow] = useState(false)
  const [focused, setFocused] = useState(false)

  useEffect(() => { setLocalToken(token || '') }, [token])

  return (
    <div
      style={{
        background: 'var(--surface-2)',
        border: `1px solid ${enabled ? 'var(--accent-line)' : 'var(--line-1)'}`,
        borderRadius: 10,
        padding: '14px 16px',
        marginBottom: 10,
        transition: 'border-color 200ms var(--ease)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: tokenKey ? 14 : 0 }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'var(--surface-3)',
            border: '1px solid var(--line-1)',
            display: 'grid', placeItems: 'center',
            fontSize: 18, flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>
            {displayName}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.5 }}>
            {description}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '3px 8px',
              background: enabled ? 'oklch(72% 0.155 150 / 0.1)' : 'var(--surface-3)',
              border: `1px solid ${enabled ? 'oklch(72% 0.155 150 / 0.3)' : 'var(--line-1)'}`,
              borderRadius: 999,
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5, fontWeight: 600,
              color: enabled ? 'var(--ok)' : 'var(--ink-3)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: 999, background: 'currentColor' }} />
            {enabled ? 'on' : 'off'}
          </span>
          <button
            onClick={() => onToggle(name, !enabled)}
            style={{
              padding: '6px 13px',
              borderRadius: 7,
              border: '1px solid',
              borderColor: enabled ? 'var(--line-2)' : 'var(--accent)',
              background: enabled ? 'var(--surface-3)' : 'var(--accent)',
              color: enabled ? 'var(--ink-1)' : 'oklch(98% 0 0)',
              fontSize: 11.5, fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '-0.005em',
              transition: 'all 120ms var(--ease)',
              boxShadow: enabled ? 'none' : 'inset 0 1px 0 oklch(95% 0.05 25 / 0.35), 0 0 12px var(--accent-glow)',
            }}
          >
            {enabled ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>
      {tokenKey && (
        <div
          style={{
            display: 'flex', alignItems: 'center',
            background: 'var(--surface-3)',
            border: `1px solid ${focused ? 'var(--line-3)' : 'var(--line-1)'}`,
            borderRadius: 7,
            padding: '0 10px',
            transition: 'border-color 120ms var(--ease)',
          }}
        >
          <input
            type={show ? 'text' : 'password'}
            value={localToken}
            onChange={e => setLocalToken(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => { setFocused(false); onTokenSave(tokenKey, localToken) }}
            placeholder={tokenLabel || 'API key'}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--ink-1)',
              fontSize: 12, padding: '7px 0',
              fontFamily: 'var(--font-mono)',
            }}
            className="selectable"
          />
          <button
            onClick={() => setShow(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4, display: 'flex' }}
          >
            {show ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 36, height: 20, borderRadius: 999,
          background: checked ? 'var(--accent)' : 'var(--surface-3)',
          border: `1px solid ${checked ? 'var(--accent)' : 'var(--line-2)'}`,
          position: 'relative',
          cursor: 'pointer',
          transition: 'all 180ms var(--ease)',
          flexShrink: 0,
          boxShadow: checked ? '0 0 12px var(--accent-glow)' : 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 1,
            left: checked ? 17 : 1,
            width: 16, height: 16,
            borderRadius: 999,
            background: checked ? 'oklch(98% 0 0)' : 'var(--ink-2)',
            transition: 'left 180ms var(--ease)',
            boxShadow: '0 1px 2px rgb(0 0 0 / 0.4)',
          }}
        />
      </div>
      <span style={{ fontSize: 13, color: 'var(--ink-1)' }}>{label}</span>
    </label>
  )
}

// ─── Pill button group ────────────────────────────────────────────────────────
function PillGroup<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        background: 'var(--surface-3)',
        border: '1px solid var(--line-1)',
        borderRadius: 8,
        padding: 3,
        gap: 2,
      }}
    >
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: 'none',
            background: value === opt ? 'var(--surface-1)' : 'transparent',
            color: value === opt ? 'var(--ink-1)' : 'var(--ink-3)',
            fontSize: 12, fontWeight: 500,
            cursor: 'pointer',
            textTransform: 'capitalize',
            transition: 'all 120ms var(--ease)',
            boxShadow: value === opt ? 'var(--shadow-1)' : 'none',
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

// ─── Main Settings ────────────────────────────────────────────────────────────
export function Settings() {
  const { config, loaded, load, set } = useConfigStore()
  const [tab, setTab] = useState<Tab>('apikeys')

  useEffect(() => { if (!loaded) load() }, [loaded, load])

  if (!loaded || !config) {
    return <div style={{ padding: 32, color: 'var(--ink-4)', fontSize: 13 }}>Loading…</div>
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'apikeys', label: 'API Keys' },
    { id: 'models', label: 'Models' },
    { id: 'mcps', label: 'Integrations' },
    { id: 'telegram', label: 'Telegram' },
    { id: 'appearance', label: 'Appearance' },
  ]

  const mcps = [
    { name: 'github', displayName: 'GitHub', icon: '🐙', description: 'Repos, PRs, issues, Actions', tokenKey: 'mcps.github.token', tokenLabel: 'Personal Access Token (ghp_…)' },
    { name: 'supabase', displayName: 'Supabase', icon: '🟢', description: 'Database, auth, storage, edge functions', tokenKey: 'mcps.supabase.serviceKey', tokenLabel: 'Service Key' },
    { name: 'vercel', displayName: 'Vercel', icon: '▲', description: 'Deploy projects, manage domains', tokenKey: 'mcps.vercel.token', tokenLabel: 'Access Token' },
    { name: 'railway', displayName: 'Railway', icon: '🚂', description: 'Deploy services, manage databases', tokenKey: 'mcps.railway.token', tokenLabel: 'API Token' },
    { name: 'slack', displayName: 'Slack', icon: '💬', description: 'Send messages, read channels', tokenKey: 'mcps.slack.botToken', tokenLabel: 'Bot Token' },
    { name: 'cloudflare', displayName: 'Cloudflare', icon: '🌤', description: 'DNS, Workers, Pages, R2', tokenKey: 'mcps.cloudflare.apiToken', tokenLabel: 'API Token' },
    { name: 'netlify', displayName: 'Netlify', icon: '🔷', description: 'Deploy sites, forms, functions', tokenKey: 'mcps.netlify.token', tokenLabel: 'Auth Token' },
    { name: 'stripe', displayName: 'Stripe', icon: '💳', description: 'Payments, customers, subscriptions', tokenKey: 'mcps.stripe.secretKey', tokenLabel: 'Secret Key' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface-2)' }}>
      {/* Drag region top bar */}
      <div
        className="drag-region"
        style={{
          height: 38,
          flexShrink: 0,
          background: 'var(--surface-2)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          fontSize: 12.5,
          color: 'var(--ink-2)',
          fontWeight: 500,
          letterSpacing: '-0.005em',
        }}
      >
        Settings
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          padding: '0 24px',
          borderBottom: '1px solid var(--line-1)',
          background: 'var(--surface-2)',
          flexShrink: 0,
          gap: 0,
        }}
      >
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '14px 14px 12px',
              border: 'none',
              background: 'transparent',
              color: tab === t.id ? 'var(--ink-1)' : 'var(--ink-3)',
              fontSize: 12.5,
              fontWeight: 500,
              cursor: 'pointer',
              position: 'relative',
              letterSpacing: '-0.005em',
              transition: 'color 120ms var(--ease)',
            }}
            onMouseEnter={e => { if (tab !== t.id) e.currentTarget.style.color = 'var(--ink-2)' }}
            onMouseLeave={e => { if (tab !== t.id) e.currentTarget.style.color = 'var(--ink-3)' }}
          >
            {t.label}
            {tab === t.id && (
              <span
                style={{
                  position: 'absolute',
                  bottom: -1, left: 12, right: 12,
                  height: 2,
                  background: 'var(--accent)',
                  borderRadius: '2px 2px 0 0',
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ maxWidth: 680, padding: '32px 32px 64px', margin: '0 auto' }} className="fade-up">

          {tab === 'apikeys' && (
            <>
              <Section title="AI Models" hint="Required for the agent to work. Anthropic is the primary provider.">
                <KeyInput label="Anthropic" hint="Get your key at console.anthropic.com" configKey="apiKeys.anthropic" value={config.apiKeys?.anthropic || ''} onSave={set} placeholder="sk-ant-..." />
                <KeyInput label="OpenAI" hint="Optional — used as fallback model" configKey="apiKeys.openai" value={config.apiKeys?.openai || ''} onSave={set} placeholder="sk-..." />
                <KeyInput label="Groq" hint="Fast inference for Llama / Mixtral" configKey="apiKeys.groq" value={config.apiKeys?.groq || ''} onSave={set} />
                <KeyInput label="Ollama URL" hint="Local Ollama endpoint" configKey="apiKeys.ollama" value={config.apiKeys?.ollama || ''} onSave={set} placeholder="http://localhost:11434" mono={false} />
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
            </>
          )}

          {tab === 'models' && (
            <>
              <Section title="Default Model" hint="Used for all chat sessions unless overridden.">
                <select
                  value={config.models?.default || 'claude-opus-4-5'}
                  onChange={e => set('models.default', e.target.value)}
                  style={{
                    background: 'var(--surface-3)',
                    border: '1px solid var(--line-1)',
                    borderRadius: 8,
                    color: 'var(--ink-1)',
                    fontSize: 13,
                    padding: '9px 12px',
                    width: '100%',
                    outline: 'none',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                  }}
                >
                  <optgroup label="Anthropic">
                    <option value="claude-opus-4-5">claude-opus-4-5  ·  most capable</option>
                    <option value="claude-sonnet-4-5">claude-sonnet-4-5  ·  balanced</option>
                    <option value="claude-haiku-4-5">claude-haiku-4-5  ·  fastest</option>
                  </optgroup>
                  <optgroup label="OpenAI">
                    <option value="gpt-4o">gpt-4o</option>
                    <option value="gpt-4o-mini">gpt-4o-mini</option>
                  </optgroup>
                </select>
              </Section>

              <Section title="Fallback Model" hint="Used if the default fails or is unavailable.">
                <select
                  value={config.models?.fallback || 'gpt-4o'}
                  onChange={e => set('models.fallback', e.target.value)}
                  style={{
                    background: 'var(--surface-3)',
                    border: '1px solid var(--line-1)',
                    borderRadius: 8,
                    color: 'var(--ink-1)',
                    fontSize: 13,
                    padding: '9px 12px',
                    width: '100%',
                    outline: 'none',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="gpt-4o-mini">gpt-4o-mini</option>
                  <option value="claude-sonnet-4-5">claude-sonnet-4-5</option>
                </select>
              </Section>

              <Section title="Storage">
                <p style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
                  ~/Library/Application Support/macvis/config.json
                </p>
              </Section>
            </>
          )}

          {tab === 'mcps' && (
            <>
              <Section title="Developer Platforms" hint="Enable integrations to give the agent access to your tools. Full MCP connectivity lands in Phase 4.">
                {mcps.map(mcp => (
                  <MCPCard
                    key={mcp.name}
                    {...mcp}
                    enabled={config.mcps?.[mcp.name]?.enabled || false}
                    token={
                      config.mcps?.[mcp.name]?.token ||
                      config.mcps?.[mcp.name]?.serviceKey ||
                      config.mcps?.[mcp.name]?.botToken ||
                      config.mcps?.[mcp.name]?.apiToken ||
                      config.mcps?.[mcp.name]?.secretKey ||
                      ''
                    }
                    onToggle={(name: string, val: boolean) => set(`mcps.${name}.enabled`, val)}
                    onTokenSave={set}
                  />
                ))}
              </Section>
            </>
          )}

          {tab === 'telegram' && (
            <>
              <Section title="Setup">
                <div
                  style={{
                    background: 'var(--accent-soft)',
                    border: '1px solid var(--accent-line)',
                    borderRadius: 10,
                    padding: '14px 16px',
                    marginBottom: 18,
                    fontSize: 12.5,
                    lineHeight: 1.7,
                    color: 'var(--ink-2)',
                  }}
                >
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
                <PillGroup
                  options={['system', 'dark', 'light'] as const}
                  value={(config.ui?.theme || 'system') as any}
                  onChange={v => set('ui.theme', v)}
                />
              </Section>

              <Section title="Font Size">
                <PillGroup
                  options={['small', 'medium', 'large'] as const}
                  value={(config.ui?.fontSize || 'medium') as any}
                  onChange={v => set('ui.fontSize', v)}
                />
              </Section>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
