import { useEffect, useState } from 'react'
import { useConfigStore } from '../stores/configStore'
import { CheckCircle, Eye, EyeOff, Plug, AlertCircle } from 'lucide-react'

type Tab = 'apikeys' | 'models' | 'mcps' | 'telegram' | 'appearance'

// ─── Reusable key input ───────────────────────────────────────────────────────
function KeyInput({
  label, hint, configKey, value, onSave, placeholder,
}: {
  label: string
  hint?: string
  configKey: string
  value: string
  onSave: (key: string, value: string) => void
  placeholder?: string
}) {
  const [local, setLocal] = useState(value)
  const [show, setShow] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setLocal(value) }, [value])

  const commit = () => {
    if (local !== value) {
      onSave(configKey, local)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px' }}>
          <input
            type={show ? 'text' : 'password'}
            value={local}
            onChange={e => setLocal(e.target.value)}
            onBlur={commit}
            onKeyDown={e => e.key === 'Enter' && commit()}
            placeholder={placeholder || 'Enter key...'}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 13, padding: '8px 0', fontFamily: 'monospace' }}
            className="selectable"
          />
          <button onClick={() => setShow(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
        {saved && <CheckCircle size={15} style={{ color: 'var(--success)', flexShrink: 0 }} />}
      </div>
      {hint && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{hint}</p>}
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>{title}</h3>
      {children}
    </div>
  )
}

// ─── MCP card ─────────────────────────────────────────────────────────────────
function MCPCard({
  name, displayName, description, icon, enabled, token, tokenLabel, tokenKey, onToggle, onTokenSave,
}: {
  name: string
  displayName: string
  description: string
  icon: string
  enabled: boolean
  token?: string
  tokenLabel?: string
  tokenKey?: string
  onToggle: (name: string, val: boolean) => void
  onTokenSave: (key: string, val: string) => void
}) {
  const [localToken, setLocalToken] = useState(token || '')
  const [show, setShow] = useState(false)

  useEffect(() => { setLocalToken(token || '') }, [token])

  return (
    <div style={{ background: 'var(--bg-tertiary)', border: `1px solid ${enabled ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: tokenKey ? 12 : 0 }}>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 22 }}>{icon}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{displayName}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{description}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: enabled ? 'var(--success)' : 'var(--bg-elevated)',
            border: `1px solid ${enabled ? 'var(--success)' : 'var(--border-bright)'}`,
            display: 'inline-block',
          }} />
          <button
            onClick={() => onToggle(name, !enabled)}
            style={{
              padding: '4px 14px',
              borderRadius: 6,
              border: `1px solid ${enabled ? 'var(--error)' : 'var(--accent)'}`,
              background: enabled ? 'rgba(248,113,113,0.1)' : 'var(--accent-dim)',
              color: enabled ? 'var(--error)' : 'var(--accent)',
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {enabled ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>
      {tokenKey && (
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '0 10px' }}>
            <input
              type={show ? 'text' : 'password'}
              value={localToken}
              onChange={e => setLocalToken(e.target.value)}
              onBlur={() => onTokenSave(tokenKey, localToken)}
              placeholder={tokenLabel || 'Token / API key'}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 12, padding: '6px 0', fontFamily: 'monospace' }}
              className="selectable"
            />
            <button onClick={() => setShow(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
              {show ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Settings page ───────────────────────────────────────────────────────
export function Settings() {
  const { config, loaded, load, set } = useConfigStore()
  const [tab, setTab] = useState<Tab>('apikeys')

  useEffect(() => { if (!loaded) load() }, [loaded, load])

  if (!loaded || !config) {
    return <div style={{ padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>Loading config...</div>
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'apikeys', label: 'API Keys' },
    { id: 'models', label: 'Models' },
    { id: 'mcps', label: 'Integrations' },
    { id: 'telegram', label: 'Telegram' },
    { id: 'appearance', label: 'Appearance' },
  ]

  const mcps = [
    { name: 'github', displayName: 'GitHub', icon: '🐙', description: 'Repos, PRs, issues, Actions', tokenKey: 'mcps.github.token', tokenLabel: 'Personal Access Token' },
    { name: 'supabase', displayName: 'Supabase', icon: '🟢', description: 'Database, auth, storage, edge functions', tokenKey: 'mcps.supabase.serviceKey', tokenLabel: 'Service Key' },
    { name: 'vercel', displayName: 'Vercel', icon: '▲', description: 'Deploy projects, manage domains', tokenKey: 'mcps.vercel.token', tokenLabel: 'Access Token' },
    { name: 'railway', displayName: 'Railway', icon: '🚂', description: 'Deploy services, manage databases', tokenKey: 'mcps.railway.token', tokenLabel: 'API Token' },
    { name: 'slack', displayName: 'Slack', icon: '💬', description: 'Send messages, read channels', tokenKey: 'mcps.slack.botToken', tokenLabel: 'Bot Token' },
    { name: 'cloudflare', displayName: 'Cloudflare', icon: '🌤', description: 'DNS, Workers, Pages, R2', tokenKey: 'mcps.cloudflare.apiToken', tokenLabel: 'API Token' },
    { name: 'netlify', displayName: 'Netlify', icon: '🔷', description: 'Deploy sites, forms, functions', tokenKey: 'mcps.netlify.token', tokenLabel: 'Auth Token' },
    { name: 'stripe', displayName: 'Stripe', icon: '💳', description: 'Payments, customers, subscriptions', tokenKey: 'mcps.stripe.secretKey', tokenLabel: 'Secret Key' },
  ]

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-primary)' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, padding: '0 24px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-secondary)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 16px',
            border: 'none',
            borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
            background: 'transparent',
            color: tab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
            fontSize: 13,
            fontWeight: tab === t.id ? 600 : 400,
            cursor: 'pointer',
            marginBottom: -1,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '28px 32px', maxWidth: 660 }}>

        {/* ── API Keys ── */}
        {tab === 'apikeys' && (
          <>
            <Section title="AI Models">
              <KeyInput label="Anthropic" hint="Required to use Claude models. Get from console.anthropic.com" configKey="apiKeys.anthropic" value={config.apiKeys?.anthropic || ''} onSave={set} placeholder="sk-ant-..." />
              <KeyInput label="OpenAI" hint="Optional — used as fallback model or for GPT tools" configKey="apiKeys.openai" value={config.apiKeys?.openai || ''} onSave={set} placeholder="sk-..." />
              <KeyInput label="Groq" hint="Fast inference for Llama / Mixtral models" configKey="apiKeys.groq" value={config.apiKeys?.groq || ''} onSave={set} />
              <KeyInput label="Ollama URL" hint="Local Ollama server URL (default: http://localhost:11434)" configKey="apiKeys.ollama" value={config.apiKeys?.ollama || ''} onSave={set} placeholder="http://localhost:11434" />
            </Section>

            <Section title="Web Search">
              <KeyInput label="Tavily" hint="Best for AI-optimized search. tavily.com" configKey="apiKeys.tavily" value={config.apiKeys?.tavily || ''} onSave={set} />
              <KeyInput label="Serper" hint="Google search API. serper.dev" configKey="apiKeys.serper" value={config.apiKeys?.serper || ''} onSave={set} />
              <KeyInput label="Brave Search" configKey="apiKeys.brave" value={config.apiKeys?.brave || ''} onSave={set} />
            </Section>

            <Section title="Other Services">
              <KeyInput label="ElevenLabs" hint="Voice synthesis" configKey="apiKeys.elevenlabs" value={config.apiKeys?.elevenlabs || ''} onSave={set} />
              <KeyInput label="Firecrawl" hint="Web scraping and crawling" configKey="apiKeys.firecrawl" value={config.apiKeys?.firecrawl || ''} onSave={set} />
            </Section>
          </>
        )}

        {/* ── Models ── */}
        {tab === 'models' && (
          <>
            <Section title="Default Model">
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Model</label>
              <select
                value={config.models?.default || 'claude-opus-4-5'}
                onChange={e => set('models.default', e.target.value)}
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, padding: '9px 12px', width: '100%', outline: 'none', marginBottom: 16 }}
              >
                <optgroup label="Anthropic">
                  <option value="claude-opus-4-5">claude-opus-4-5 (most capable)</option>
                  <option value="claude-sonnet-4-5">claude-sonnet-4-5 (balanced)</option>
                  <option value="claude-haiku-4-5">claude-haiku-4-5 (fastest)</option>
                </optgroup>
                <optgroup label="OpenAI">
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="gpt-4o-mini">gpt-4o-mini</option>
                </optgroup>
              </select>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Config stored at ~/Library/Application Support/macvis/config.json
              </p>
            </Section>

            <Section title="Fallback Model">
              <select
                value={config.models?.fallback || 'gpt-4o'}
                onChange={e => set('models.fallback', e.target.value)}
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, padding: '9px 12px', width: '100%', outline: 'none' }}
              >
                <option value="gpt-4o">gpt-4o</option>
                <option value="gpt-4o-mini">gpt-4o-mini</option>
                <option value="claude-sonnet-4-5">claude-sonnet-4-5</option>
              </select>
            </Section>
          </>
        )}

        {/* ── MCPs / Integrations ── */}
        {tab === 'mcps' && (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Enable integrations to give the agent access to developer platforms. Full MCP connectivity lands in Phase 4.
            </p>
            {mcps.map(mcp => (
              <MCPCard
                key={mcp.name}
                {...mcp}
                enabled={config.mcps?.[mcp.name]?.enabled || false}
                token={config.mcps?.[mcp.name]?.token || config.mcps?.[mcp.name]?.serviceKey || config.mcps?.[mcp.name]?.botToken || config.mcps?.[mcp.name]?.apiToken || config.mcps?.[mcp.name]?.secretKey || ''}
                onToggle={(name, val) => set(`mcps.${name}.enabled`, val)}
                onTokenSave={set}
              />
            ))}
          </>
        )}

        {/* ── Telegram ── */}
        {tab === 'telegram' && (
          <>
            <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 10, padding: '14px 16px', marginBottom: 24, fontSize: 13, lineHeight: 1.7 }}>
              <strong style={{ color: 'var(--accent)' }}>Setup instructions</strong>
              <ol style={{ color: 'var(--text-secondary)', marginTop: 8, paddingLeft: 20 }}>
                <li>Open Telegram and message <strong>@BotFather</strong></li>
                <li>Send <code style={{ background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 3 }}>/newbot</code> and follow the prompts</li>
                <li>Copy the bot token and paste below</li>
                <li>Message <strong>@userinfobot</strong> to get your numeric user ID</li>
              </ol>
            </div>

            <Section title="Bot Configuration">
              <KeyInput label="Bot Token" hint="From @BotFather" configKey="apiKeys.telegram.botToken" value={config.apiKeys?.telegram?.botToken || ''} onSave={set} placeholder="1234567890:ABC..." />
              <KeyInput label="Allowed User ID" hint="Your numeric Telegram user ID from @userinfobot" configKey="apiKeys.telegram.allowedUserId" value={config.apiKeys?.telegram?.allowedUserId || ''} onSave={set} placeholder="123456789" />
            </Section>

            <Section title="Startup">
              <label className="flex items-center gap-3" style={{ cursor: 'pointer' }}>
                <div
                  onClick={() => set('telegram.runOnStartup', !config.telegram?.runOnStartup)}
                  style={{
                    width: 36, height: 20, borderRadius: 10,
                    background: config.telegram?.runOnStartup ? 'var(--accent)' : 'var(--bg-elevated)',
                    border: `1px solid ${config.telegram?.runOnStartup ? 'var(--accent)' : 'var(--border-bright)'}`,
                    position: 'relative', cursor: 'pointer', transition: 'background 150ms',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 2,
                    left: config.telegram?.runOnStartup ? 18 : 2,
                    width: 14, height: 14, borderRadius: '50%',
                    background: 'white', transition: 'left 150ms',
                  }} />
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>Start bot automatically when MacVis opens</span>
              </label>
            </Section>
          </>
        )}

        {/* ── Appearance ── */}
        {tab === 'appearance' && (
          <>
            <Section title="Theme">
              <div className="flex gap-2">
                {(['system', 'dark', 'light'] as const).map(t => (
                  <button key={t} onClick={() => set('ui.theme', t)} style={{
                    padding: '7px 18px', borderRadius: 8,
                    border: `1px solid ${config.ui?.theme === t ? 'var(--accent)' : 'var(--border)'}`,
                    background: config.ui?.theme === t ? 'var(--accent-dim)' : 'var(--bg-tertiary)',
                    color: config.ui?.theme === t ? 'var(--accent)' : 'var(--text-secondary)',
                    fontSize: 13, cursor: 'pointer', textTransform: 'capitalize',
                  }}>
                    {t}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Font Size">
              <div className="flex gap-2">
                {(['small', 'medium', 'large'] as const).map(s => (
                  <button key={s} onClick={() => set('ui.fontSize', s)} style={{
                    padding: '7px 18px', borderRadius: 8,
                    border: `1px solid ${config.ui?.fontSize === s ? 'var(--accent)' : 'var(--border)'}`,
                    background: config.ui?.fontSize === s ? 'var(--accent-dim)' : 'var(--bg-tertiary)',
                    color: config.ui?.fontSize === s ? 'var(--accent)' : 'var(--text-secondary)',
                    fontSize: 13, cursor: 'pointer', textTransform: 'capitalize',
                  }}>
                    {s}
                  </button>
                ))}
              </div>
            </Section>
          </>
        )}

      </div>
    </div>
  )
}
