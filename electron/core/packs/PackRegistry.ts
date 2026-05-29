// One-click technology packs. Installing a pack installs+enables its skills,
// enables (and connects when keys are present) its MCP servers, and surfaces the
// API keys it needs. skill ids come from SkillCatalog; mcp ids from MCPRegistry.

export interface PackKeyInput {
  configKey: string
  label: string
  placeholder?: string
  docsUrl?: string
}

export interface Pack {
  id: string
  name: string
  description: string
  icon: string
  accentColor: string
  category: string
  skills: string[]
  mcps: string[]
  apiKeys?: PackKeyInput[]
  /** Optional shell setup commands — only run after explicit user confirmation. */
  setup?: { label: string; command: string }[]
}

export const PACK_REGISTRY: Pack[] = [
  {
    id: 'web-development',
    name: 'Web Development',
    description: 'Everything to design, build, and deploy modern websites and web apps.',
    icon: '🌐',
    accentColor: 'oklch(72% 0.165 235)',
    category: 'engineering',
    skills: ['web-html-css', 'react', 'nextjs', 'tailwind'],
    mcps: ['github', 'vercel', 'netlify', 'supabase'],
    apiKeys: [],
  },
  {
    id: 'crypto-web3',
    name: 'Crypto / Web3',
    description: 'Smart contracts, on-chain data, and wallet-safe transactions.',
    icon: '⟠',
    accentColor: 'oklch(70% 0.17 290)',
    category: 'engineering',
    skills: ['solidity-foundry', 'ethers-web3', 'wallet-safety'],
    mcps: ['github', 'fetch'],
    apiKeys: [
      { configKey: 'apiKeys.alchemy', label: 'Alchemy API Key', placeholder: 'alch_...', docsUrl: 'https://dashboard.alchemy.com/' },
      { configKey: 'apiKeys.etherscan', label: 'Etherscan API Key', docsUrl: 'https://etherscan.io/myapikey' },
      { configKey: 'apiKeys.coingecko', label: 'CoinGecko API Key (optional)', docsUrl: 'https://www.coingecko.com/en/api' },
    ],
    setup: [{ label: 'Install Foundry (forge/cast/anvil)', command: 'curl -L https://foundry.paradigm.xyz | bash && ~/.foundry/bin/foundryup' }],
  },
  {
    id: 'scripting',
    name: 'Scripting',
    description: 'Shell, Python, and AppleScript automation glue.',
    icon: '🐚',
    accentColor: 'oklch(74% 0.135 60)',
    category: 'automation',
    skills: ['bash-scripting', 'python-automation', 'applescript-macos'],
    mcps: ['filesystem', 'time'],
    apiKeys: [],
  },
  {
    id: 'automation',
    name: 'Automation',
    description: 'Drive the Mac and the browser; schedule recurring jobs.',
    icon: '🤖',
    accentColor: 'oklch(72% 0.155 150)',
    category: 'automation',
    skills: ['mac-automation', 'browser-automation', 'workflow-cron', 'applescript-macos'],
    mcps: ['memory', 'sequential-thinking', 'filesystem'],
    apiKeys: [],
  },
  {
    id: 'lead-generation',
    name: 'Lead Generation',
    description: 'Find prospects, enrich them, and run compliant outreach.',
    icon: '🎯',
    accentColor: 'oklch(70% 0.18 25)',
    category: 'growth',
    skills: ['lead-scraping', 'email-outreach', 'crm-enrich'],
    mcps: ['firecrawl', 'brave-search', 'notion'],
    apiKeys: [
      { configKey: 'apiKeys.firecrawl', label: 'Firecrawl API Key', docsUrl: 'https://www.firecrawl.dev/app/api-keys' },
      { configKey: 'apiKeys.serper', label: 'Serper API Key (search)', docsUrl: 'https://serper.dev/api-key' },
      { configKey: 'apiKeys.hunter', label: 'Hunter API Key (email finder, optional)', docsUrl: 'https://hunter.io/api-keys' },
      { configKey: 'apiKeys.apollo', label: 'Apollo API Key (enrichment, optional)', docsUrl: 'https://app.apollo.io/#/settings/integrations/api' },
    ],
  },
  {
    id: 'data-ai',
    name: 'Data & AI',
    description: 'Query databases, analyze datasets, and build data workflows.',
    icon: '📊',
    accentColor: 'oklch(70% 0.16 200)',
    category: 'engineering',
    skills: ['data-sql', 'data-analysis'],
    mcps: ['postgres', 'sqlite', 'supabase'],
    apiKeys: [],
  },
  {
    id: 'devops',
    name: 'DevOps',
    description: 'Containerize, set up CI/CD, and deploy to the cloud.',
    icon: '🐳',
    accentColor: 'oklch(70% 0.14 250)',
    category: 'engineering',
    skills: ['docker-deploy', 'ci-cd'],
    mcps: ['github', 'cloudflare', 'railway', 'vercel'],
    apiKeys: [],
  },
  {
    id: 'mobile',
    name: 'Mobile',
    description: 'Build and ship cross-platform mobile apps with Expo.',
    icon: '📱',
    accentColor: 'oklch(72% 0.15 310)',
    category: 'engineering',
    skills: ['react-native-expo', 'react'],
    mcps: ['github'],
    apiKeys: [],
  },
  {
    id: 'content-media',
    name: 'Content & Media',
    description: 'Write persuasive copy and generate voice/media assets.',
    icon: '🎬',
    accentColor: 'oklch(74% 0.15 340)',
    category: 'growth',
    skills: ['copywriting', 'tts-media'],
    mcps: ['elevenlabs', 'firecrawl'],
    apiKeys: [
      { configKey: 'apiKeys.elevenlabs', label: 'ElevenLabs API Key', docsUrl: 'https://elevenlabs.io/app/settings/api-keys' },
    ],
  },
]

export function findPack(id: string): Pack | undefined {
  return PACK_REGISTRY.find(p => p.id === id)
}
