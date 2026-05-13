import { AnthropicProvider } from './AnthropicProvider'
import { OpenAIProvider } from './OpenAIProvider'
import { GeminiProvider } from './GeminiProvider'
import type { ChatProvider } from './types'

export type ProviderName = 'anthropic' | 'openai' | 'openrouter' | 'groq' | 'ollama' | 'gemini'

const REGISTRY: Record<ProviderName, () => ChatProvider> = {
  anthropic: () => new AnthropicProvider(),
  openai: () => new OpenAIProvider('openai'),
  openrouter: () => new OpenAIProvider('openrouter'),
  groq: () => new OpenAIProvider('groq'),
  ollama: () => new OpenAIProvider('ollama'),
  gemini: () => new GeminiProvider(),
}

const cache = new Map<ProviderName, ChatProvider>()

export function getProvider(name: ProviderName): ChatProvider {
  if (cache.has(name)) return cache.get(name)!
  const factory = REGISTRY[name]
  if (!factory) throw new Error(`Unknown provider: ${name}`)
  const provider = factory()
  cache.set(name, provider)
  return provider
}

export function parseProviderModel(spec: string): { provider: ProviderName; model: string } | null {
  if (!spec || !spec.includes(':')) return null
  const [provider, ...rest] = spec.split(':')
  if (!REGISTRY[provider as ProviderName]) return null
  return { provider: provider as ProviderName, model: rest.join(':') }
}

export * from './types'
