// Mask secret-looking tokens before they hit logs or persisted summaries.
// Pure + unit-testable.

const PATTERNS: RegExp[] = [
  /sk-ant-[A-Za-z0-9_-]{10,}/g,        // Anthropic
  /sk-(?:proj|svcacct|admin|None)?-?[A-Za-z0-9_-]{20,}/g, // OpenAI (incl. sk-proj-/sk-svcacct-)
  /sk-or-v1-[A-Za-z0-9_-]{20,}/g,      // OpenRouter
  /gsk_[A-Za-z0-9]{20,}/g,             // Groq
  /gh[pousr]_[A-Za-z0-9]{20,}/g,       // GitHub tokens
  /glpat-[A-Za-z0-9_-]{10,}/g,         // GitLab
  /AIza[0-9A-Za-z_-]{20,}/g,           // Google
  /xox[baprs]-[A-Za-z0-9-]{10,}/g,     // Slack
  /AKIA[0-9A-Z]{16}/g,                 // AWS access key id
  /\b\d{6,}:AA[A-Za-z0-9_-]{30,}\b/g,  // Telegram bot token
  /\btvly-[A-Za-z0-9_-]{10,}/g,        // Tavily
  /\bfc-[A-Za-z0-9]{20,}/g,            // Firecrawl
  /sk_(?:live|test)_[A-Za-z0-9]{16,}/g,// Stripe / ElevenLabs
  /\bBearer\s+[A-Za-z0-9._-]{12,}/gi,  // Bearer tokens
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{6,}/g, // JWT
]

export function redactSecrets(text: string): string {
  if (!text) return text
  let out = text
  for (const re of PATTERNS) out = out.replace(re, '«redacted»')
  return out
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Redact known secret VALUES by exact match — format-independent. Pass the
 * actual configured secrets (API keys, tokens) so any occurrence is masked
 * even if a new key format isn't covered by the pattern list above. Pure.
 */
export function redactValues(text: string, values: Array<string | undefined | null>): string {
  if (!text) return text
  let out = text
  for (const v of values) {
    if (typeof v === 'string' && v.length >= 6) out = out.split(v).join('«redacted»')
  }
  return out
}
