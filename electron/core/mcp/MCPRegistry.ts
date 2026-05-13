// Registry of well-known MCP servers, organized for the UI
// Each entry defines how to spawn the server + which config keys to map to env vars

export interface MCPServerDef {
  /** Unique id used in config / IPC */
  id: string
  /** Display name shown in UI */
  name: string
  /** Short description for the card */
  description: string
  /** Category for grouping */
  category: 'deployment' | 'database' | 'comms' | 'search' | 'payments' | 'productivity' | 'utility' | 'media' | 'custom'
  /** Vendor: "official" (Anthropic), "vendor" (provider), "community" */
  source: 'official' | 'vendor' | 'community'
  /** Featured at top of Integrations page for quick-connect */
  featured?: boolean
  /** Accent color for the featured card (CSS oklch or hex) */
  brandColor?: string
  /** Display icon (emoji or character) */
  icon: string
  /** Command to spawn (e.g. "npx") */
  command: string
  /** Args passed to command. May contain placeholders like {{token}} */
  args: string[]
  /** Env vars to inject from config. Maps env-var-name → config key (e.g. "GITHUB_TOKEN" → "mcps.github.token") */
  env?: Record<string, string>
  /** Config inputs the user needs to provide */
  inputs?: Array<{
    /** UI label */
    label: string
    /** Config key (e.g. "mcps.github.token") */
    configKey: string
    /** Placeholder hint */
    placeholder?: string
    /** Input type */
    type?: 'text' | 'password' | 'path'
    /** Helper text */
    hint?: string
  }>
  /** Documentation URL */
  docsUrl?: string
  /** Setup hint shown above inputs */
  setupHint?: string
}

export const MCP_REGISTRY: MCPServerDef[] = [
  // ─── DEPLOYMENT ────────────────────────────────────────────────────────────
  {
    id: 'github',
    name: 'GitHub',
    description: 'Repos, PRs, issues, Actions, push files',
    category: 'deployment',
    source: 'official',
    featured: true,
    brandColor: 'oklch(70% 0.005 280)',
    icon: '🐙',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: { GITHUB_PERSONAL_ACCESS_TOKEN: 'mcps.github.token' },
    inputs: [{
      label: 'Personal Access Token',
      configKey: 'mcps.github.token',
      placeholder: 'ghp_...',
      type: 'password',
      hint: 'Scopes needed: repo, workflow, read:org',
    }],
    docsUrl: 'https://github.com/settings/tokens/new',
  },
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Deploy projects, manage domains and env vars',
    category: 'deployment',
    source: 'vendor',
    featured: true,
    brandColor: 'oklch(95% 0.005 0)',
    icon: '▲',
    command: 'npx',
    args: ['-y', '@vercel/mcp-adapter'],
    env: { VERCEL_TOKEN: 'mcps.vercel.token' },
    inputs: [{
      label: 'Access Token',
      configKey: 'mcps.vercel.token',
      type: 'password',
    }],
    docsUrl: 'https://vercel.com/account/tokens',
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    description: 'DNS, Workers, Pages, R2 storage',
    category: 'deployment',
    source: 'official',
    icon: '🌤',
    command: 'npx',
    args: ['-y', '@cloudflare/mcp-server-cloudflare'],
    env: {
      CLOUDFLARE_API_TOKEN: 'mcps.cloudflare.apiToken',
      CLOUDFLARE_ACCOUNT_ID: 'mcps.cloudflare.accountId',
    },
    inputs: [
      { label: 'API Token', configKey: 'mcps.cloudflare.apiToken', type: 'password' },
      { label: 'Account ID', configKey: 'mcps.cloudflare.accountId', type: 'text' },
    ],
    docsUrl: 'https://dash.cloudflare.com/profile/api-tokens',
  },
  {
    id: 'netlify',
    name: 'Netlify',
    description: 'Deploy sites, manage forms and functions',
    category: 'deployment',
    source: 'vendor',
    icon: '🔷',
    command: 'npx',
    args: ['-y', '@netlify/mcp'],
    env: { NETLIFY_AUTH_TOKEN: 'mcps.netlify.token' },
    inputs: [{
      label: 'Auth Token',
      configKey: 'mcps.netlify.token',
      type: 'password',
    }],
    docsUrl: 'https://app.netlify.com/user/applications#personal-access-tokens',
  },
  {
    id: 'railway',
    name: 'Railway',
    description: 'Deploy services, manage databases',
    category: 'deployment',
    source: 'community',
    featured: true,
    brandColor: 'oklch(58% 0.18 290)',
    icon: '🚂',
    command: 'npx',
    args: ['-y', '@jasontanswe/railway-mcp'],
    env: { RAILWAY_API_TOKEN: 'mcps.railway.token' },
    inputs: [{
      label: 'API Token',
      configKey: 'mcps.railway.token',
      type: 'password',
    }],
    docsUrl: 'https://railway.com/account/tokens',
  },

  // ─── DATABASES ─────────────────────────────────────────────────────────────
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Database, auth, storage, edge functions',
    category: 'database',
    source: 'official',
    featured: true,
    brandColor: 'oklch(72% 0.16 150)',
    icon: '🟢',
    command: 'npx',
    args: ['-y', '@supabase/mcp-server-supabase'],
    env: { SUPABASE_ACCESS_TOKEN: 'mcps.supabase.serviceKey' },
    inputs: [{
      label: 'Access Token',
      configKey: 'mcps.supabase.serviceKey',
      type: 'password',
      hint: 'Personal access token from supabase.com/dashboard/account/tokens',
    }],
    docsUrl: 'https://supabase.com/dashboard/account/tokens',
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'Query any Postgres database directly',
    category: 'database',
    source: 'official',
    icon: '🐘',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres', '{{connectionString}}'],
    inputs: [{
      label: 'Connection String',
      configKey: 'mcps.postgres.connectionString',
      placeholder: 'postgresql://user:pass@host:5432/db',
      type: 'password',
    }],
  },
  {
    id: 'sqlite',
    name: 'SQLite',
    description: 'Query SQLite databases on your machine',
    category: 'database',
    source: 'official',
    icon: '💎',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sqlite', '{{dbPath}}'],
    inputs: [{
      label: 'Database File Path',
      configKey: 'mcps.sqlite.dbPath',
      placeholder: '/path/to/database.sqlite',
      type: 'path',
    }],
  },

  // ─── SEARCH ────────────────────────────────────────────────────────────────
  {
    id: 'brave-search',
    name: 'Brave Search',
    description: 'Privacy-focused web search',
    category: 'search',
    source: 'official',
    icon: '🦁',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    env: { BRAVE_API_KEY: 'apiKeys.brave' },
    inputs: [{
      label: 'API Key',
      configKey: 'apiKeys.brave',
      type: 'password',
      hint: 'Free tier: 2000 queries/month',
    }],
    docsUrl: 'https://api-dashboard.search.brave.com',
  },
  {
    id: 'fetch',
    name: 'Fetch',
    description: 'Fetch web content as markdown (no key needed)',
    category: 'search',
    source: 'official',
    icon: '🌐',
    command: 'uvx',
    args: ['mcp-server-fetch'],
    setupHint: 'Requires uv installed. brew install uv',
  },
  {
    id: 'firecrawl',
    name: 'Firecrawl',
    description: 'Crawl entire sites, extract structured data',
    category: 'search',
    source: 'vendor',
    icon: '🕷',
    command: 'npx',
    args: ['-y', 'firecrawl-mcp'],
    env: { FIRECRAWL_API_KEY: 'apiKeys.firecrawl' },
    inputs: [{
      label: 'API Key',
      configKey: 'apiKeys.firecrawl',
      type: 'password',
    }],
    docsUrl: 'https://firecrawl.dev',
  },

  // ─── COMMUNICATION ─────────────────────────────────────────────────────────
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send messages, read channels, search history',
    category: 'comms',
    source: 'official',
    icon: '💬',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-slack'],
    env: {
      SLACK_BOT_TOKEN: 'mcps.slack.botToken',
      SLACK_TEAM_ID: 'mcps.slack.teamId',
    },
    inputs: [
      { label: 'Bot Token', configKey: 'mcps.slack.botToken', placeholder: 'xoxb-...', type: 'password' },
      { label: 'Team ID', configKey: 'mcps.slack.teamId', placeholder: 'T01234567', type: 'text' },
    ],
    docsUrl: 'https://api.slack.com/apps',
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'Issues, projects, cycles, comments',
    category: 'productivity',
    source: 'vendor',
    icon: '📐',
    command: 'npx',
    args: ['-y', 'mcp-remote', 'https://mcp.linear.app/sse'],
    setupHint: 'Linear MCP uses OAuth on first run — a browser window opens for sign-in.',
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Pages, databases, search, blocks',
    category: 'productivity',
    source: 'vendor',
    icon: '📓',
    command: 'npx',
    args: ['-y', '@notionhq/notion-mcp-server'],
    env: { OPENAPI_MCP_HEADERS: 'mcps.notion.authHeader' },
    inputs: [{
      label: 'Internal Integration Token',
      configKey: 'mcps.notion.authHeader',
      placeholder: '{"Authorization":"Bearer secret_..."}',
      type: 'password',
      hint: 'JSON value: {"Authorization":"Bearer secret_xxx","Notion-Version":"2022-06-28"}',
    }],
    docsUrl: 'https://www.notion.so/profile/integrations',
  },

  // ─── PAYMENTS ──────────────────────────────────────────────────────────────
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Customers, charges, subscriptions, refunds',
    category: 'payments',
    source: 'vendor',
    icon: '💳',
    command: 'npx',
    args: ['-y', '@stripe/mcp', '--tools=all'],
    env: { STRIPE_SECRET_KEY: 'mcps.stripe.secretKey' },
    inputs: [{
      label: 'Secret Key',
      configKey: 'mcps.stripe.secretKey',
      placeholder: 'sk_live_... or sk_test_...',
      type: 'password',
    }],
    docsUrl: 'https://dashboard.stripe.com/apikeys',
  },

  // ─── UTILITY (no API key needed) ───────────────────────────────────────────
  {
    id: 'filesystem',
    name: 'Filesystem (sandboxed)',
    description: 'Restricted file ops on a specific directory',
    category: 'utility',
    source: 'official',
    icon: '📁',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '{{path}}'],
    inputs: [{
      label: 'Allowed Directory',
      configKey: 'mcps.filesystem.path',
      placeholder: '/Users/you/projects',
      type: 'path',
      hint: 'Server will only allow access inside this folder',
    }],
  },
  {
    id: 'memory',
    name: 'Memory',
    description: 'Persistent knowledge graph the agent can write to',
    category: 'utility',
    source: 'official',
    icon: '🧠',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
  },
  {
    id: 'sequential-thinking',
    name: 'Sequential Thinking',
    description: 'Forces step-by-step planning before action',
    category: 'utility',
    source: 'official',
    icon: '🧩',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
  },
  {
    id: 'time',
    name: 'Time',
    description: 'Timezone conversions, date math',
    category: 'utility',
    source: 'official',
    icon: '⏰',
    command: 'uvx',
    args: ['mcp-server-time'],
    setupHint: 'Requires uv installed. brew install uv',
  },

  // ─── MEDIA ─────────────────────────────────────────────────────────────────
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    description: 'Text-to-speech, voice cloning',
    category: 'media',
    source: 'vendor',
    icon: '🔊',
    command: 'uvx',
    args: ['elevenlabs-mcp'],
    env: { ELEVENLABS_API_KEY: 'apiKeys.elevenlabs' },
    inputs: [{
      label: 'API Key',
      configKey: 'apiKeys.elevenlabs',
      type: 'password',
    }],
    setupHint: 'Requires uv installed. brew install uv',
    docsUrl: 'https://elevenlabs.io/app/settings/api-keys',
  },
]

export function findServer(id: string): MCPServerDef | undefined {
  return MCP_REGISTRY.find(s => s.id === id)
}

export const MCP_CATEGORIES: Record<string, string> = {
  deployment: 'Deployment & DevOps',
  database: 'Databases',
  search: 'Web & Search',
  comms: 'Communication',
  productivity: 'Productivity',
  payments: 'Payments',
  utility: 'Utilities',
  media: 'Media',
  custom: 'Custom',
}
