import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('macvis', {
  agent: {
    run: (message: string, sessionId: string) =>
      ipcRenderer.invoke('agent:run', { message, sessionId }),
    stop: (sessionId: string) =>
      ipcRenderer.invoke('agent:stop', { sessionId }),
    onStream: (cb: (data: any) => void) => {
      const handler = (_: any, data: any) => cb(data)
      ipcRenderer.on('agent:stream', handler)
      return () => ipcRenderer.removeListener('agent:stream', handler)
    },
    onToolCall: (cb: (data: any) => void) => {
      const handler = (_: any, data: any) => cb(data)
      ipcRenderer.on('agent:tool', handler)
      return () => ipcRenderer.removeListener('agent:tool', handler)
    },
    onDone: (cb: (data: any) => void) => {
      const handler = (_: any, data: any) => cb(data)
      ipcRenderer.on('agent:done', handler)
      return () => ipcRenderer.removeListener('agent:done', handler)
    },
    onError: (cb: (data: any) => void) => {
      const handler = (_: any, data: any) => cb(data)
      ipcRenderer.on('agent:error', handler)
      return () => ipcRenderer.removeListener('agent:error', handler)
    },
  },

  config: {
    get: (key?: string) => ipcRenderer.invoke('config:get', { key }),
    set: (key: string, value: any) => ipcRenderer.invoke('config:set', { key, value }),
  },

  mcp: {
    list: () => ipcRenderer.invoke('mcp:list'),
    connect: (name: string) => ipcRenderer.invoke('mcp:connect', { name }),
    disconnect: (name: string) => ipcRenderer.invoke('mcp:disconnect', { name }),
    install: (name: string, command: string, args: string[]) =>
      ipcRenderer.invoke('mcp:install', { name, command, args }),
    onStatus: (cb: (data: any) => void) => {
      const handler = (_: any, data: any) => cb(data)
      ipcRenderer.on('mcp:status', handler)
      return () => ipcRenderer.removeListener('mcp:status', handler)
    },
  },

  skills: {
    list: () => ipcRenderer.invoke('skills:list'),
    install: (url: string) => ipcRenderer.invoke('skills:install', { url }),
    uninstall: (name: string) => ipcRenderer.invoke('skills:uninstall', { name }),
  },

  telegram: {
    start: () => ipcRenderer.invoke('telegram:start'),
    stop: () => ipcRenderer.invoke('telegram:stop'),
    onStatus: (cb: (data: any) => void) => {
      const handler = (_: any, data: any) => cb(data)
      ipcRenderer.on('telegram:status', handler)
      return () => ipcRenderer.removeListener('telegram:status', handler)
    },
  },

  shell: {
    run: (command: string) => ipcRenderer.invoke('shell:run', { command }),
  },

  provider: {
    validate: (provider: string, key: string) =>
      ipcRenderer.invoke('provider:validate', { provider, key }),
    listAll: () => ipcRenderer.invoke('provider:listAll'),
  },

  sessions: {
    list: () => ipcRenderer.invoke('sessions:list'),
    load: (id: string) => ipcRenderer.invoke('sessions:load', { id }),
    delete: (id: string) => ipcRenderer.invoke('sessions:delete', { id }),
    rename: (id: string, title: string) => ipcRenderer.invoke('sessions:rename', { id, title }),
  },

  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    openInFinder: (path: string) => ipcRenderer.invoke('projects:openInFinder', { path }),
    openInEditor: (path: string) => ipcRenderer.invoke('projects:openInEditor', { path }),
    openInBrowser: (path: string) => ipcRenderer.invoke('projects:openInBrowser', { path }),
    run: (path: string) => ipcRenderer.invoke('projects:run', { path }),
    delete: (path: string) => ipcRenderer.invoke('projects:delete', { path }),
    workspaceDir: () => ipcRenderer.invoke('projects:workspaceDir'),
  },
})
