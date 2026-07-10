import { ipcMain } from 'electron'
import { ConfigStore } from '../core/config/ConfigStore'
import { defaultConfig } from '../core/config/ConfigSchema'

// Only top-level config namespaces that actually exist may be written, and no
// path segment may be a prototype-pollution vector. Prevents a compromised
// renderer from injecting arbitrary keys (or __proto__) into config.json.
const ALLOWED_ROOTS = new Set(Object.keys(defaultConfig))
const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor'])

function isSettableKey(key: unknown): key is string {
  if (typeof key !== 'string' || !key) return false
  const segments = key.split('.')
  if (!ALLOWED_ROOTS.has(segments[0])) return false
  return segments.every(s => s.length > 0 && !FORBIDDEN_SEGMENTS.has(s))
}

export function setupConfigHandlers() {
  const config = ConfigStore.getInstance()

  ipcMain.handle('config:get', async (_, { key }) => {
    return config.get(key)
  })

  ipcMain.handle('config:set', async (_, { key, value }) => {
    if (!isSettableKey(key)) return { ok: false, error: `Rejected config key: ${String(key)}` }
    config.set(key, value)
    return { ok: true }
  })
}
