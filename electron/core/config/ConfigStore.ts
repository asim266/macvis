import Conf from 'conf'
import { safeStorage } from 'electron'
import { defaultConfig } from './ConfigSchema'

// Secrets (API keys, tokens, webhook secret) are encrypted at rest via Electron's
// safeStorage, which is backed by the macOS Keychain. On disk they appear as
// `mvenc1:<base64>` instead of plaintext. Encrypt/decrypt is transparent to every
// caller — get() returns plaintext, set() encrypts secret paths automatically.
const ENC_PREFIX = 'mvenc1:'

function canEncrypt(): boolean {
  try { return safeStorage.isEncryptionAvailable() } catch { return false }
}

/** A config path whose string value must be stored encrypted. */
function isSecretPath(key: string): boolean {
  if (key.startsWith('apiKeys.')) return true          // all provider/tool keys + telegram token
  if (key === 'webhooks.secret') return true
  if (key.startsWith('mcps.') && /(token|key|secret)/i.test(key)) return true
  return false
}

function encrypt(plain: string): string {
  try { return ENC_PREFIX + safeStorage.encryptString(plain).toString('base64') } catch { return plain }
}

function decryptMaybe(val: any): any {
  if (typeof val !== 'string' || !val.startsWith(ENC_PREFIX)) return val
  try { return safeStorage.decryptString(Buffer.from(val.slice(ENC_PREFIX.length), 'base64')) } catch { return '' }
}

/** Deep-copy a value with every `mvenc1:` string decrypted. */
function deepDecrypt(obj: any): any {
  if (typeof obj === 'string') return decryptMaybe(obj)
  if (Array.isArray(obj)) return obj.map(deepDecrypt)
  if (obj && typeof obj === 'object') {
    const out: any = {}
    for (const k of Object.keys(obj)) out[k] = deepDecrypt(obj[k])
    return out
  }
  return obj
}

export class ConfigStore {
  private static instance: ConfigStore
  private store: Conf<any>

  private constructor() {
    this.store = new Conf({
      projectName: 'macvis',
      defaults: defaultConfig,
    })
  }

  static getInstance(): ConfigStore {
    if (!ConfigStore.instance) {
      ConfigStore.instance = new ConfigStore()
    }
    return ConfigStore.instance
  }

  get(key?: string): any {
    if (!key) return deepDecrypt(this.store.store)
    const raw = key.split('.').reduce((obj: any, k) => obj?.[k], this.store.store)
    return deepDecrypt(raw)
  }

  set(key: string, value: any): void {
    if (canEncrypt() && isSecretPath(key) && typeof value === 'string' && value) {
      this.store.set(key, encrypt(value))
    } else {
      this.store.set(key, value)
    }
  }

  getAll() {
    return deepDecrypt(this.store.store)
  }

  /**
   * One-time migration: re-encrypt any plaintext secrets already on disk. Safe to
   * call repeatedly (already-encrypted values are skipped). No-op when safeStorage
   * is unavailable. Call once after `app.whenReady()`.
   */
  migrateSecrets(): void {
    if (!canEncrypt()) return
    const raw: any = this.store.store
    if (raw?.apiKeys) this.reencryptTree('apiKeys', raw.apiKeys)
    if (raw?.webhooks && typeof raw.webhooks.secret === 'string' && raw.webhooks.secret && !raw.webhooks.secret.startsWith(ENC_PREFIX)) {
      this.store.set('webhooks.secret', encrypt(raw.webhooks.secret))
    }
    if (raw?.mcps) this.reencryptTree('mcps', raw.mcps)
  }

  private reencryptTree(prefix: string, obj: any): void {
    for (const k of Object.keys(obj || {})) {
      const path = `${prefix}.${k}`
      const v = obj[k]
      if (typeof v === 'string') {
        if (v && !v.startsWith(ENC_PREFIX) && isSecretPath(path)) {
          this.store.set(path, encrypt(v))
        }
      } else if (v && typeof v === 'object' && !Array.isArray(v)) {
        this.reencryptTree(path, v)
      }
    }
  }
}
