import { ipcMain } from 'electron'
import { validateProvider, type ProviderName } from '../core/agent/ProviderValidator'
import { ConfigStore } from '../core/config/ConfigStore'

export function setupProviderHandlers() {
  ipcMain.handle('provider:validate', async (_, { provider, key }: { provider: ProviderName; key: string }) => {
    const result = await validateProvider(provider, key)
    // Cache the result in config
    const config = ConfigStore.getInstance()
    config.set(`providers.${provider}`, {
      valid: result.valid,
      checkedAt: Date.now(),
      models: result.models || [],
      error: result.error,
    })
    return result
  })

  ipcMain.handle('provider:listAll', async () => {
    // Aggregate cached models from all providers
    const config = ConfigStore.getInstance()
    const providers = config.get('providers') || {}
    const result: Record<string, { valid: boolean; models: string[]; checkedAt: number; error?: string }> = {}
    for (const [name, data] of Object.entries(providers)) {
      result[name] = data as any
    }
    return result
  })
}
