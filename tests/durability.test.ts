import { describe, it, expect, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { atomicWriteFileSync, atomicWriteFile } from '../electron/core/util/atomicWrite'
import { safeEqual, createRateLimiter } from '../electron/core/security/http'

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'macvis-durability-'))
afterEach(() => {
  for (const f of fs.readdirSync(tmpRoot)) fs.rmSync(path.join(tmpRoot, f), { recursive: true, force: true })
})

describe('atomic writes', () => {
  it('writes content and leaves no temp file behind', () => {
    const file = path.join(tmpRoot, 'state.json')
    atomicWriteFileSync(file, '{"a":1}')
    expect(fs.readFileSync(file, 'utf-8')).toBe('{"a":1}')
    expect(fs.readdirSync(tmpRoot).filter(f => f.endsWith('.tmp'))).toEqual([])
  })

  it('creates missing parent directories', () => {
    const file = path.join(tmpRoot, 'nested', 'deep', 'state.json')
    atomicWriteFileSync(file, 'x')
    expect(fs.readFileSync(file, 'utf-8')).toBe('x')
  })

  it('replaces an existing file wholesale (no partial overwrite)', () => {
    const file = path.join(tmpRoot, 'state.json')
    atomicWriteFileSync(file, 'a'.repeat(500))
    atomicWriteFileSync(file, 'b')
    expect(fs.readFileSync(file, 'utf-8')).toBe('b')
  })

  it('async variant writes and cleans up', async () => {
    const file = path.join(tmpRoot, 'async.json')
    await atomicWriteFile(file, '{"ok":true}')
    expect(fs.readFileSync(file, 'utf-8')).toBe('{"ok":true}')
    expect(fs.readdirSync(tmpRoot).filter(f => f.endsWith('.tmp'))).toEqual([])
  })

  it('concurrent writers never interleave — the file stays parseable', async () => {
    const file = path.join(tmpRoot, 'concurrent.json')
    const payloads = Array.from({ length: 20 }, (_, i) => JSON.stringify({ n: i, pad: 'x'.repeat(2000) }))
    await Promise.all(payloads.map(p => atomicWriteFile(file, p)))
    // Whichever writer landed last, the result must be exactly one valid payload.
    const got = fs.readFileSync(file, 'utf-8')
    expect(() => JSON.parse(got)).not.toThrow()
    expect(payloads).toContain(got)
    expect(fs.readdirSync(tmpRoot).filter(f => f.endsWith('.tmp'))).toEqual([])
  })
})

describe('safeEqual', () => {
  it('matches identical secrets', () => {
    expect(safeEqual('s3cret-token', 's3cret-token')).toBe(true)
  })

  it('rejects different secrets, length mismatches, and empties', () => {
    expect(safeEqual('s3cret-token', 's3cret-tokeX')).toBe(false)
    expect(safeEqual('short', 'much-longer-token')).toBe(false)
    expect(safeEqual('', '')).toBe(false)
    expect(safeEqual(undefined, 'token')).toBe(false)
    expect(safeEqual('token', undefined)).toBe(false)
    expect(safeEqual(['token'], 'token')).toBe(false)
  })
})

describe('createRateLimiter', () => {
  it('allows up to the limit then blocks', () => {
    const limited = createRateLimiter(3, 1000)
    expect(limited('a', 0)).toBe(false)
    expect(limited('a', 1)).toBe(false)
    expect(limited('a', 2)).toBe(false)
    expect(limited('a', 3)).toBe(true)
  })

  it('resets after the window elapses', () => {
    const limited = createRateLimiter(1, 1000)
    expect(limited('a', 0)).toBe(false)
    expect(limited('a', 10)).toBe(true)
    expect(limited('a', 1500)).toBe(false)
  })

  it('tracks keys independently', () => {
    const limited = createRateLimiter(1, 1000)
    expect(limited('a', 0)).toBe(false)
    expect(limited('b', 0)).toBe(false)
    expect(limited('a', 1)).toBe(true)
    expect(limited('b', 1)).toBe(true)
  })
})
