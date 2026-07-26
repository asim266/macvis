import { redactSecrets, redactValues } from './redact'

// Config-aware redaction. `redact.ts` stays pure (pattern-based, no electron
// import) so it can be unit-tested; this layer adds exact-match masking of the
// user's actual configured secret values — which catches secrets that match no
// known pattern (e.g. a bare UUID API token). Used by the audit log and by the
// MCP stderr drain. Best-effort; never throws.

/** Every configured secret string worth masking by exact match. */
export function configuredSecrets(): string[] {
  try {
    // Lazy require to avoid an import cycle (ConfigStore -> ... -> here).
    const { ConfigStore } = require('../config/ConfigStore')
    const all = ConfigStore.getInstance().getAll() || {}
    const out: string[] = []
    const walk = (o: any) => {
      if (!o || typeof o !== 'object') return
      for (const v of Object.values(o)) {
        if (typeof v === 'string' && v.length >= 12) out.push(v)
        else if (v && typeof v === 'object') walk(v)
      }
    }
    walk(all.apiKeys); walk(all.mcps); walk(all.webhooks); walk(all.telegram)
    return out
  } catch { return [] }
}

/** Mask pattern-matched secrets AND exact configured secret values. */
export function redactAll(text: string): string {
  return redactValues(redactSecrets(text), configuredSecrets())
}
