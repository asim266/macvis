// Compact unified-style line diff for the edit/approval UI.

function lcsMatrix(a: string[], b: string[]): number[][] {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  return dp
}

/** Produce a unified-ish diff (+/- lines) between two texts. */
export function unifiedDiff(before: string, after: string, contextLabel = ''): string {
  if (before === after) return `${contextLabel}\n(no changes)`
  const a = before.split('\n')
  const b = after.split('\n')
  const dp = lcsMatrix(a, b)
  const lines: string[] = []
  let i = 0, j = 0
  let added = 0, removed = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { lines.push('  ' + a[i]); i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { lines.push('- ' + a[i]); removed++; i++ }
    else { lines.push('+ ' + b[j]); added++; j++ }
  }
  while (i < a.length) { lines.push('- ' + a[i]); removed++; i++ }
  while (j < b.length) { lines.push('+ ' + b[j]); added++; j++ }

  // Collapse long runs of unchanged context to keep the diff readable.
  const out: string[] = []
  let ctxRun = 0
  for (const ln of lines) {
    if (ln.startsWith('  ')) {
      ctxRun++
      if (ctxRun <= 3) out.push(ln)
      else if (ctxRun === 4) out.push('  …')
    } else { ctxRun = 0; out.push(ln) }
  }
  const header = `${contextLabel}  (+${added} −${removed})`
  return `${header}\n\`\`\`diff\n${out.join('\n').slice(0, 6000)}\n\`\`\``
}

export function newFileDiff(content: string, label = ''): string {
  const lines = content.split('\n')
  const body = lines.slice(0, 200).map(l => '+ ' + l).join('\n')
  return `${label}  (new file, +${lines.length})\n\`\`\`diff\n${body}${lines.length > 200 ? '\n  …' : ''}\n\`\`\``
}
