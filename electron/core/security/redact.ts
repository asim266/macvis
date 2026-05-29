// Mask secret-looking tokens before they hit logs or persisted summaries.
// Pure + unit-testable.

const PATTERNS: RegExp[] = [
  /sk-ant-[A-Za-z0-9_-]{10,}/g,        // Anthropic
  /sk-[A-Za-z0-9]{20,}/g,              // OpenAI / generic
  /gh[pousr]_[A-Za-z0-9]{20,}/g,       // GitHub tokens
  /AIza[0-9A-Za-z_-]{20,}/g,           // Google
  /xox[baprs]-[A-Za-z0-9-]{10,}/g,     // Slack
  /glpat-[A-Za-z0-9_-]{10,}/g,         // GitLab
  /AKIA[0-9A-Z]{16}/g,                 // AWS access key id
  /\bBearer\s+[A-Za-z0-9._-]{12,}/gi,  // Bearer tokens
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{6,}/g, // JWT
]

export function redactSecrets(text: string): string {
  if (!text) return text
  let out = text
  for (const re of PATTERNS) out = out.replace(re, '«redacted»')
  return out
}
