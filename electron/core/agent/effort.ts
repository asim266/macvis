// Which Claude models accept the `output_config.effort` parameter.
//
// Sending `effort` to a model that doesn't support it (Haiku 4.5, Sonnet 4.5,
// and older) returns an HTTP 400, so the provider MUST gate on this before
// attaching it — otherwise the fast-route model (Haiku) would 400 on every
// simple turn. Pure (no SDK import) so it is unit-testable.
//
// Supported (per the Claude model reference): Opus 4.5/4.6/4.7/4.8, Sonnet 5,
// Sonnet 4.6, Fable 5, Mythos 5. Not supported: Haiku (any), Sonnet 4.5, older.
export function modelSupportsEffort(model: string): boolean {
  if (!model) return false
  const m = model.toLowerCase()
  if (m.includes('haiku')) return false
  if (m.includes('sonnet-4-5') || m.includes('sonnet-4.5')) return false
  return /(opus-4-[5-9]|opus-4\.[5-9]|sonnet-5|sonnet-4-6|sonnet-4\.6|fable-5|mythos-5)/.test(m)
}

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'
const VALID: ReadonlySet<string> = new Set(['low', 'medium', 'high', 'xhigh', 'max'])

/** Normalize a configured effort value, falling back to 'high' if invalid/unset. */
export function normalizeEffort(value: unknown): Effort {
  return (typeof value === 'string' && VALID.has(value) ? value : 'high') as Effort
}
