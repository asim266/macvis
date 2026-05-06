export interface ValidationResult {
  valid: boolean
  error?: string
  models?: string[]
}

export type ProviderName =
  | 'anthropic'
  | 'openai'
  | 'openrouter'
  | 'gemini'
  | 'nanoBanana'
  | 'groq'
  | 'ollama'

const TIMEOUT_MS = 12_000

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(t)
  }
}

// Anthropic
async function validateAnthropic(key: string): Promise<ValidationResult> {
  if (!key.trim()) return { valid: false, error: 'Empty key' }
  try {
    const res = await fetchWithTimeout('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { valid: false, error: `${res.status} — ${body.slice(0, 200) || res.statusText}` }
    }
    const data: any = await res.json()
    const models = (data.data || []).map((m: any) => m.id).filter(Boolean)
    return { valid: true, models }
  } catch (err: any) {
    return { valid: false, error: err.message || String(err) }
  }
}

// OpenAI
async function validateOpenAI(key: string): Promise<ValidationResult> {
  if (!key.trim()) return { valid: false, error: 'Empty key' }
  try {
    const res = await fetchWithTimeout('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { valid: false, error: `${res.status} — ${body.slice(0, 200) || res.statusText}` }
    }
    const data: any = await res.json()
    const models = (data.data || [])
      .map((m: any) => m.id)
      .filter((id: string) => id && (id.startsWith('gpt-') || id.startsWith('o1') || id.startsWith('o3') || id.startsWith('o4')))
    return { valid: true, models }
  } catch (err: any) {
    return { valid: false, error: err.message || String(err) }
  }
}

// OpenRouter — tons of models, filter to popular ones
async function validateOpenRouter(key: string): Promise<ValidationResult> {
  if (!key.trim()) return { valid: false, error: 'Empty key' }
  try {
    const res = await fetchWithTimeout('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { valid: false, error: `${res.status} — ${body.slice(0, 200) || res.statusText}` }
    }
    const data: any = await res.json()
    const models = (data.data || []).map((m: any) => m.id).filter(Boolean)
    return { valid: true, models }
  } catch (err: any) {
    return { valid: false, error: err.message || String(err) }
  }
}

// Gemini (Google AI Studio)
async function validateGemini(key: string): Promise<ValidationResult> {
  if (!key.trim()) return { valid: false, error: 'Empty key' }
  try {
    const res = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`
    )
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { valid: false, error: `${res.status} — ${body.slice(0, 200) || res.statusText}` }
    }
    const data: any = await res.json()
    const models = (data.models || [])
      .map((m: any) => (m.name || '').replace('models/', ''))
      .filter((id: string) => id && id.startsWith('gemini'))
    return { valid: true, models }
  } catch (err: any) {
    return { valid: false, error: err.message || String(err) }
  }
}

// Nano Banana — uses the same Gemini API but filters to image-capable models
async function validateNanoBanana(key: string): Promise<ValidationResult> {
  const base = await validateGemini(key)
  if (!base.valid) return base
  const imageModels = (base.models || []).filter(m =>
    m.includes('image') || m.includes('flash-image') || m.includes('nano-banana')
  )
  return { valid: true, models: imageModels.length > 0 ? imageModels : ['gemini-2.5-flash-image-preview'] }
}

// Groq
async function validateGroq(key: string): Promise<ValidationResult> {
  if (!key.trim()) return { valid: false, error: 'Empty key' }
  try {
    const res = await fetchWithTimeout('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { valid: false, error: `${res.status} — ${body.slice(0, 200) || res.statusText}` }
    }
    const data: any = await res.json()
    const models = (data.data || []).map((m: any) => m.id).filter(Boolean)
    return { valid: true, models }
  } catch (err: any) {
    return { valid: false, error: err.message || String(err) }
  }
}

// Ollama (local)
async function validateOllama(url: string): Promise<ValidationResult> {
  const base = url || 'http://localhost:11434'
  try {
    const res = await fetchWithTimeout(`${base.replace(/\/$/, '')}/api/tags`)
    if (!res.ok) return { valid: false, error: `${res.status}: ${res.statusText}` }
    const data: any = await res.json()
    const models = (data.models || []).map((m: any) => m.name || m.model).filter(Boolean)
    return { valid: true, models }
  } catch (err: any) {
    return { valid: false, error: err.message || String(err) }
  }
}

const VALIDATORS: Record<ProviderName, (key: string) => Promise<ValidationResult>> = {
  anthropic: validateAnthropic,
  openai: validateOpenAI,
  openrouter: validateOpenRouter,
  gemini: validateGemini,
  nanoBanana: validateNanoBanana,
  groq: validateGroq,
  ollama: validateOllama,
}

export async function validateProvider(provider: ProviderName, key: string): Promise<ValidationResult> {
  const fn = VALIDATORS[provider]
  if (!fn) return { valid: false, error: `Unknown provider: ${provider}` }
  return await fn(key)
}
