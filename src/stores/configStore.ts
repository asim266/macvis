import { create } from 'zustand'

interface ConfigStore {
  config: any
  loaded: boolean
  load: () => Promise<void>
  set: (key: string, value: any) => Promise<void>
}

declare global {
  interface Window {
    macvis: any
  }
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  config: null,
  loaded: false,

  load: async () => {
    const config = await window.macvis.config.get()
    set({ config, loaded: true })
  },

  set: async (key, value) => {
    await window.macvis.config.set(key, value)
    const config = await window.macvis.config.get()
    set({ config })
  },
}))
