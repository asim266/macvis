// Built-in installable skills. Each id maps to a bundled `skills/<id>/SKILL.md`
// file (shipped via electron-builder extraResources). Lightweight metadata here
// powers the catalog UI without reading every file up front.

export interface CatalogSkill {
  id: string
  name: string
  description: string
  icon: string
  category: string
  tags?: string[]
}

export const SKILL_CATALOG: CatalogSkill[] = [
  // ─── Web development ──────────────────────────────────────────────
  { id: 'web-html-css', name: 'HTML & CSS', description: 'Modern semantic HTML, responsive CSS, flexbox/grid layouts.', icon: '🌐', category: 'web' },
  { id: 'react', name: 'React', description: 'Build React 18/19 apps with hooks, components, and state patterns.', icon: '⚛️', category: 'web' },
  { id: 'nextjs', name: 'Next.js', description: 'App Router, server components, routing, and deployment.', icon: '▲', category: 'web' },
  { id: 'tailwind', name: 'Tailwind CSS', description: 'Utility-first styling, theming, and design systems.', icon: '🎨', category: 'web' },

  // ─── Crypto / Web3 ────────────────────────────────────────────────
  { id: 'solidity-foundry', name: 'Solidity + Foundry', description: 'Write, test, and deploy smart contracts with Foundry.', icon: '⟠', category: 'crypto' },
  { id: 'ethers-web3', name: 'ethers.js / web3', description: 'Read chains, send txns, interact with contracts from JS.', icon: '🔗', category: 'crypto' },
  { id: 'wallet-safety', name: 'Wallet & Key Safety', description: 'Never leak keys; safe signing, testnets, and approvals.', icon: '🔐', category: 'crypto' },

  // ─── Scripting ────────────────────────────────────────────────────
  { id: 'bash-scripting', name: 'Bash Scripting', description: 'Robust shell scripts: pipes, traps, args, error handling.', icon: '🐚', category: 'scripting' },
  { id: 'python-automation', name: 'Python Automation', description: 'Scripts for files, APIs, scraping, and data wrangling.', icon: '🐍', category: 'scripting' },
  { id: 'applescript-macos', name: 'AppleScript / JXA', description: 'Automate native macOS apps via osascript.', icon: '🍎', category: 'scripting' },

  // ─── Automation ───────────────────────────────────────────────────
  { id: 'mac-automation', name: 'Mac Automation', description: 'Drive the desktop: screenshots, clicks, app workflows.', icon: '🖱', category: 'automation' },
  { id: 'browser-automation', name: 'Browser Automation', description: 'Automate web tasks, forms, and scraping flows.', icon: '🕸', category: 'automation' },
  { id: 'workflow-cron', name: 'Scheduled Workflows', description: 'Build cron/launchd jobs and recurring automations.', icon: '⏱', category: 'automation' },

  // ─── Lead generation ──────────────────────────────────────────────
  { id: 'lead-scraping', name: 'Lead Scraping', description: 'Find and extract prospect data from the web ethically.', icon: '🎯', category: 'leadgen' },
  { id: 'email-outreach', name: 'Email Outreach', description: 'Write & sequence cold emails that get replies (CAN-SPAM aware).', icon: '✉️', category: 'leadgen' },
  { id: 'crm-enrich', name: 'CRM & Enrichment', description: 'Enrich, dedupe, and sync leads into a CRM/sheet.', icon: '📇', category: 'leadgen' },

  // ─── Data & AI ────────────────────────────────────────────────────
  { id: 'data-sql', name: 'SQL & Databases', description: 'Query, model, and optimize SQL across Postgres/SQLite.', icon: '🗄', category: 'data' },
  { id: 'data-analysis', name: 'Data Analysis', description: 'Clean, analyze, and visualize datasets (pandas/CSV).', icon: '📊', category: 'data' },

  // ─── DevOps ───────────────────────────────────────────────────────
  { id: 'docker-deploy', name: 'Docker & Deploy', description: 'Containerize apps and ship to cloud platforms.', icon: '🐳', category: 'devops' },
  { id: 'ci-cd', name: 'CI/CD', description: 'GitHub Actions pipelines for test, build, and deploy.', icon: '🔁', category: 'devops' },

  // ─── Mobile ───────────────────────────────────────────────────────
  { id: 'react-native-expo', name: 'React Native + Expo', description: 'Build and ship cross-platform mobile apps.', icon: '📱', category: 'mobile' },

  // ─── Content & media ──────────────────────────────────────────────
  { id: 'copywriting', name: 'Copywriting', description: 'Persuasive landing-page, ad, and product copy.', icon: '✍️', category: 'content' },
  { id: 'tts-media', name: 'Text-to-Speech & Media', description: 'Generate voiceovers and media assets (ElevenLabs).', icon: '🔊', category: 'content' },
]

export function findCatalogSkill(id: string): CatalogSkill | undefined {
  return SKILL_CATALOG.find(s => s.id === id)
}
