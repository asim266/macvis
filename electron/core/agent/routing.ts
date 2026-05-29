// Heuristic task-complexity classifier for model routing.
// Pure + unit-testable. "complex" → keep the strong primary model; "simple" →
// a cheaper/faster model can handle it (when one is configured).

const COMPLEX_PATTERNS = [
  /```/,
  /\b(refactor|debug|implement|architect|migrate|deploy|build (a|an|the)|write (the |a |an )?(code|script|function|component|app|program|test))\b/i,
  /\b(stack ?trace|exception|compile|typescript|regex|algorithm|optimi[sz]e)\b/i,
  /\b(repo|repository|pull request|merge|commit)\b/i,
]

export function classifyComplexity(message: string): 'simple' | 'complex' {
  const m = message || ''
  if (m.length > 280) return 'complex'
  if (m.split('\n').length > 4) return 'complex'
  for (const re of COMPLEX_PATTERNS) if (re.test(m)) return 'complex'
  return 'simple'
}
