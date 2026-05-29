import { describe, it, expect } from 'vitest'
import { unifiedDiff, newFileDiff } from '../electron/core/tools/diff'
import { parseSkill } from '../electron/core/skills/SkillParser'
import { checkProtectedPath, pathFromToolInput } from '../electron/core/security/sandbox'
import { redactSecrets } from '../electron/core/security/redact'

describe('unifiedDiff', () => {
  it('reports no changes for identical text', () => {
    expect(unifiedDiff('a\nb', 'a\nb', 'f')).toContain('(no changes)')
  })
  it('marks added and removed lines', () => {
    const d = unifiedDiff('one\ntwo\nthree', 'one\nTWO\nthree', 'f')
    expect(d).toContain('- two')
    expect(d).toContain('+ TWO')
    expect(d).toContain('+1 −1')
  })
  it('newFileDiff marks all lines added', () => {
    const d = newFileDiff('x\ny', 'f')
    expect(d).toContain('new file, +2')
    expect(d).toContain('+ x')
  })
})

describe('parseSkill', () => {
  it('parses frontmatter + body', () => {
    const raw = `---\nname: My Skill\ndescription: does things\nwhen_to_use: when needed\n---\n# Body\nhello`
    const s = parseSkill(raw)
    expect(s.name).toBe('My Skill')
    expect(s.description).toBe('does things')
    expect(s.when_to_use).toBe('when needed')
    expect(s.body).toContain('hello')
  })
  it('falls back to H1 / first paragraph without frontmatter', () => {
    const s = parseSkill('# Title\n\nfirst para here')
    expect(s.name).toBe('Title')
    expect(s.description).toContain('first para')
  })
})

describe('sandbox', () => {
  it('blocks ~/.ssh', () => {
    expect(checkProtectedPath('~/.ssh/id_rsa')).toBeTruthy()
  })
  it('blocks /etc', () => {
    expect(checkProtectedPath('/etc/hosts')).toBeTruthy()
  })
  it('allows a normal project path', () => {
    expect(checkProtectedPath('~/Documents/project/index.ts')).toBeNull()
  })
  it('only guards destructive filesystem operations', () => {
    expect(pathFromToolInput('filesystem', { operation: 'read', path: '/x' })).toBeUndefined()
    expect(pathFromToolInput('filesystem', { operation: 'delete', path: '/x' })).toBe('/x')
  })
})

describe('redactSecrets', () => {
  it('masks an OpenAI-style key', () => {
    const out = redactSecrets('key is sk-abcdef012345678901234567890 ok')
    expect(out).not.toContain('sk-abcdef012345678901234567890')
    expect(out).toContain('«redacted»')
  })
  it('masks GitHub tokens and Bearer headers', () => {
    expect(redactSecrets('ghp_abcdefghijklmnopqrstuvwxyz012345')).toContain('«redacted»')
    expect(redactSecrets('Authorization: Bearer abcdef12345678901234')).toContain('«redacted»')
  })
  it('leaves ordinary text untouched', () => {
    expect(redactSecrets('hello world, no secrets here')).toBe('hello world, no secrets here')
  })
})
