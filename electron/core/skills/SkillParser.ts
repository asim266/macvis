// Minimal SKILL.md parser. Frontmatter is a small YAML subset:
//   ---
//   name: My Skill
//   description: one-liner
//   when_to_use: when ...
//   icon: 🛠
//   ---
//   <markdown body>

export interface SkillMeta {
  name: string
  description: string
  when_to_use?: string
  icon?: string
}

export interface ParsedSkill extends SkillMeta {
  body: string
}

export function parseSkill(raw: string): ParsedSkill {
  const meta: SkillMeta = { name: '', description: '' }
  let body = raw

  const fm = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/)
  if (fm) {
    const [, front, rest] = fm
    body = rest
    for (const line of front.split('\n')) {
      const m = line.match(/^([a-zA-Z_]+)\s*:\s*(.*)$/)
      if (!m) continue
      const key = m[1].trim()
      let val = m[2].trim()
      // strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (key === 'name') meta.name = val
      else if (key === 'description') meta.description = val
      else if (key === 'when_to_use' || key === 'whenToUse') meta.when_to_use = val
      else if (key === 'icon') meta.icon = val
    }
  }

  // Fall back to first H1 / first paragraph if frontmatter omitted fields
  if (!meta.name) {
    const h1 = body.match(/^#\s+(.+)$/m)
    if (h1) meta.name = h1[1].trim()
  }
  if (!meta.description) {
    const para = body.split('\n').find(l => l.trim() && !l.startsWith('#'))
    if (para) meta.description = para.trim().slice(0, 160)
  }

  return { ...meta, body: body.trim() }
}
