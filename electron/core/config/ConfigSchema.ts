export const defaultConfig = {
  version: '1.0.0',
  apiKeys: {
    anthropic: '',
    openai: '',
    openrouter: '',
    gemini: '',
    nanoBanana: '',  // Google image-gen (Nano Banana / Gemini 2.5 Flash Image)
    groq: '',
    ollama: 'http://localhost:11434',
    elevenlabs: '',
    tavily: '',
    serper: '',
    brave: '',
    firecrawl: '',
    nanobrowser: '',
    // Crypto / Web3
    alchemy: '',
    etherscan: '',
    coingecko: '',
    // Lead generation
    hunter: '',
    apollo: '',
    telegram: { botToken: '', allowedUserId: '' },
  },
  // Cached provider validation status + available models
  providers: {} as Record<string, { valid: boolean; checkedAt: number; models: string[]; error?: string }>,
  models: {
    default: 'claude-opus-4-5',
    provider: 'anthropic',
    fallback: 'gpt-4o',
    fallbackProvider: 'openai',
    imageGen: '',
    // Per-provider selected chat model — populated after user validates a key
    // and picks one from the inline dropdown.
    selections: {} as Record<string, string>,
    // Fallback chain: ordered list of "provider:model" strings, max 3 entries.
    // First entry is primary, second is fallback, third is last-resort.
    chain: [] as string[],
  },
  mcps: {
    github: { enabled: false, token: '' },
    supabase: { enabled: false, url: '', serviceKey: '' },
    vercel: { enabled: false, token: '' },
    railway: { enabled: false, token: '' },
    slack: { enabled: false, botToken: '', teamId: '' },
    gmail: { enabled: false },
    cloudflare: { enabled: false, apiToken: '', accountId: '' },
    netlify: { enabled: false, token: '' },
    stripe: { enabled: false, secretKey: '' },
    custom: [] as any[],
  },
  skills: { installed: [] as string[], enabled: [] as string[] },
  packs: { installed: [] as string[] },
  tools: {
    // Computer use (screenshot + mouse + keyboard). Enabled by default; the agent
    // still needs macOS Screen Recording + Accessibility permissions to act.
    computerUse: { enabled: true, useNative: false },
    // Human-in-the-loop: pause for confirmation before destructive/outward actions
    // (rm -rf, sudo, file deletes, sending mail, etc.).
    requireApproval: true,
  },
  ui: { theme: 'system', fontSize: 'medium', sidebarOpen: true, accent: 'green' as 'green' | 'red' | 'blue' | 'white' },
  telegram: { enabled: false, runOnStartup: false },
}
