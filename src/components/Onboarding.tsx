import { useState } from 'react'
import { Check, Loader, ExternalLink, X } from 'lucide-react'
import { useConfigStore } from '../stores/configStore'

const PROVIDERS = [
  { id: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-...', docs: 'https://console.anthropic.com/settings/keys', note: 'Recommended' },
  { id: 'openai', label: 'OpenAI', placeholder: 'sk-...', docs: 'https://platform.openai.com/api-keys' },
  { id: 'gemini', label: 'Gemini', placeholder: 'AIza...', docs: 'https://aistudio.google.com/apikey' },
  { id: 'openrouter', label: 'OpenRouter', placeholder: 'sk-or-...', docs: 'https://openrouter.ai/keys' },
  { id: 'groq', label: 'Groq', placeholder: 'gsk_...', docs: 'https://console.groq.com/keys' },
]

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { set } = useConfigStore()
  const [provider, setProvider] = useState('anthropic')
  const [key, setKey] = useState('')
  const [state, setState] = useState<'idle' | 'testing' | 'ok' | 'bad'>('idle')
  const [err, setErr] = useState('')

  const finish = () => { set('ui.onboarded', true); onDone() }

  const test = async () => {
    if (!key.trim()) return
    setState('testing'); setErr('')
    await set(`apiKeys.${provider}`, key.trim())
    const r = await window.macvis.provider.validate(provider, key.trim())
    if (r?.valid) {
      const models = r.models || []
      if (models[0]) { await set(`models.selections.${provider}`, models[0]); await set('models.chain', [`${provider}:${models[0]}`]); await set('models.default', models[0]); await set('models.provider', provider) }
      setState('ok')
      setTimeout(finish, 700)
    } else { setState('bad'); setErr(r?.error || 'Could not validate that key.') }
  }

  const pdef = PROVIDERS.find(p => p.id === provider)!

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', zIndex: 2000 }}>
      <div className="fade-up" style={{ width: 480, background: 'var(--surface-2)', border: '1px solid var(--line-2)', borderRadius: 16, padding: 28, boxShadow: 'var(--shadow-3)', position: 'relative' }}>
        <button onClick={finish} title="Skip" style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: 'var(--ink-4)', cursor: 'pointer' }}><X size={16} /></button>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, var(--accent-bright), var(--accent-grad-end))', display: 'grid', placeItems: 'center', fontSize: 24, fontWeight: 700, color: 'var(--accent-text-on)', fontFamily: 'var(--font-mono)', marginBottom: 16 }}>M</div>
        <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.02em', marginBottom: 6 }}>Welcome to MacVis</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, marginBottom: 20 }}>
          A local-first AI assistant with full Mac access. Add one model key to begin — it stays on your machine.
        </p>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {PROVIDERS.map(p => (
            <button key={p.id} onClick={() => { setProvider(p.id); setState('idle') }}
              style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${provider === p.id ? 'var(--accent)' : 'var(--line-2)'}`, background: provider === p.id ? 'var(--accent-soft)' : 'var(--surface-3)', color: provider === p.id ? 'var(--accent-bright)' : 'var(--ink-2)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
              {p.label}{p.note ? ' ★' : ''}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.09em', fontFamily: 'var(--font-mono)' }}>{pdef.label} API Key</label>
          <button onClick={() => window.open(pdef.docs, '_blank')} style={{ background: 'none', border: 'none', color: 'var(--accent-bright)', cursor: 'pointer', fontSize: 10.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)' }}>Get key <ExternalLink size={10} /></button>
        </div>
        <input value={key} onChange={e => setKey(e.target.value)} placeholder={pdef.placeholder} type="password"
          onKeyDown={e => { if (e.key === 'Enter') test() }}
          style={{ width: '100%', background: 'var(--surface-3)', border: `1px solid ${state === 'bad' ? 'var(--err)' : 'var(--line-1)'}`, borderRadius: 8, color: 'var(--ink-1)', fontSize: 13, padding: '10px 12px', outline: 'none', fontFamily: 'var(--font-mono)', marginBottom: 12 }} />
        {err && <p style={{ fontSize: 11.5, color: 'var(--err)', marginBottom: 10 }}>{err}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={test} disabled={!key.trim() || state === 'testing'}
            style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1px solid var(--accent)', background: 'var(--accent)', color: 'var(--accent-text-on)', fontSize: 13, fontWeight: 600, cursor: key.trim() ? 'pointer' : 'default', opacity: key.trim() ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {state === 'testing' && <Loader size={13} className="spin" />}{state === 'ok' && <Check size={14} />}
            {state === 'ok' ? 'Ready!' : state === 'testing' ? 'Validating…' : 'Validate & start'}
          </button>
          <button onClick={finish} style={{ padding: '10px 16px', borderRadius: 9, border: '1px solid var(--line-2)', background: 'var(--surface-3)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Skip</button>
        </div>
      </div>
    </div>
  )
}
