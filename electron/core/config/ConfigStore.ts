import Conf from 'conf'
import { defaultConfig } from './ConfigSchema'

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
    if (!key) return this.store.store
    return key.split('.').reduce((obj: any, k) => obj?.[k], this.store.store)
  }

  set(key: string, value: any): void {
    this.store.set(key, value)
  }

  getAll() {
    return this.store.store
  }
}
