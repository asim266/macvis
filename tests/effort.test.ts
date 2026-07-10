import { describe, it, expect } from 'vitest'
import { modelSupportsEffort, normalizeEffort } from '../electron/core/agent/effort'

describe('modelSupportsEffort', () => {
  it('enables effort for current effort-capable models', () => {
    for (const m of ['claude-opus-4-8', 'claude-opus-4-7', 'claude-opus-4-6', 'claude-opus-4-5',
                     'claude-sonnet-5', 'claude-sonnet-4-6', 'claude-fable-5', 'claude-mythos-5']) {
      expect(modelSupportsEffort(m), m).toBe(true)
    }
  })

  it('disables effort for models that 400 on it (Haiku, Sonnet 4.5, older, non-Claude)', () => {
    for (const m of ['claude-haiku-4-5', 'claude-3-5-haiku', 'claude-sonnet-4-5',
                     'claude-3-5-sonnet', 'gpt-4o', 'gemini-2.5-flash', '']) {
      expect(modelSupportsEffort(m), m).toBe(false)
    }
  })

  it('is case-insensitive and tolerates provider prefixes', () => {
    expect(modelSupportsEffort('CLAUDE-OPUS-4-8')).toBe(true)
    expect(modelSupportsEffort('anthropic/claude-sonnet-5')).toBe(true)
  })
})

describe('normalizeEffort', () => {
  it('passes through valid levels', () => {
    for (const e of ['low', 'medium', 'high', 'xhigh', 'max']) {
      expect(normalizeEffort(e)).toBe(e)
    }
  })

  it('falls back to high for invalid/unset values', () => {
    expect(normalizeEffort('')).toBe('high')
    expect(normalizeEffort('ultra')).toBe('high')
    expect(normalizeEffort(undefined)).toBe('high')
    expect(normalizeEffort(42)).toBe('high')
  })
})
