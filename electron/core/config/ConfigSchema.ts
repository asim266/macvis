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
    googleMaps: '',
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
    // Auto-routing: route simple turns to a cheaper/faster model when set.
    autoRoute: false,
    routeFast: '' as string,   // "provider:model" used for simple messages
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
    // When on, file edits (write_file/edit_file/multi_edit) also pause and show a
    // diff for review before applying.
    approveEdits: false,
    // Filesystem sandbox: block writes/deletes to protected paths (keys, system dirs).
    sandbox: true,
    protectedPaths: [] as string[],
    // Native tools the user has turned off (by tool name).
    disabled: [] as string[],
  },
  // Inbound webhook trigger server (localhost only, token-gated).
  webhooks: { enabled: false, port: 8787, secret: '' },
  ui: { theme: 'system', fontSize: 'medium', sidebarOpen: true, accent: 'green' as 'green' | 'red' | 'blue' | 'white', speakResponses: false, onboarded: false },
  telegram: { enabled: false, runOnStartup: false },
}
