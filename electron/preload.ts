import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('macvis', {
  agent: {
    run: (message: string, sessionId: string, attachments?: any[]) =>
      ipcRenderer.invoke('agent:run', { message, sessionId, attachments }),
    stop: (sessionId: string) =>
      ipcRenderer.invoke('agent:stop', { sessionId }),
    approve: (id: string, ok: boolean) =>
      ipcRenderer.invoke('agent:approve', { id, ok }),
    onApproval: (cb: (data: any) => void) => {
      const handler = (_: any, data: any) => cb(data)
      ipcRenderer.on('agent:approval', handler)
      return () => ipcRenderer.removeListener('agent:approval', handler)
    },
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
    onProvider: (cb: (data: any) => void) => {
      const handler = (_: any, data: any) => cb(data)
      ipcRenderer.on('agent:provider', handler)
      return () => ipcRenderer.removeListener('agent:provider', handler)
    },
    onStatus: (cb: (data: any) => void) => {
      const handler = (_: any, data: any) => cb(data)
      ipcRenderer.on('agent:status', handler)
      return () => ipcRenderer.removeListener('agent:status', handler)
    },
    onTodos: (cb: (data: any) => void) => {
      const handler = (_: any, data: any) => cb(data)
      ipcRenderer.on('agent:todos', handler)
      return () => ipcRenderer.removeListener('agent:todos', handler)
    },
  },

  config: {
    get: (key?: string) => ipcRenderer.invoke('config:get', { key }),
    set: (key: string, value: any) => ipcRenderer.invoke('config:set', { key, value }),
  },

  mcp: {
    list: () => ipcRenderer.invoke('mcp:list'),
    registry: () => ipcRenderer.invoke('mcp:registry'),
    connect: (id: string) => ipcRenderer.invoke('mcp:connect', { id }),
    disconnect: (id: string) => ipcRenderer.invoke('mcp:disconnect', { id }),
    installCustom: (name: string, command: string, args: string[], env?: Record<string, string>) =>
      ipcRenderer.invoke('mcp:installCustom', { name, command, args, env }),
    uninstallCustom: (id: string) => ipcRenderer.invoke('mcp:uninstallCustom', { id }),
    autoConnectEnabled: () => ipcRenderer.invoke('mcp:autoConnectEnabled'),
    onStatus: (cb: (data: any) => void) => {
      const handler = (_: any, data: any) => cb(data)
      ipcRenderer.on('mcp:status', handler)
      return () => ipcRenderer.removeListener('mcp:status', handler)
    },
  },

  skills: {
    list: () => ipcRenderer.invoke('skills:list'),
    install: (source: string) => ipcRenderer.invoke('skills:install', { source }),
    uninstall: (id: string) => ipcRenderer.invoke('skills:uninstall', { id }),
    enable: (id: string) => ipcRenderer.invoke('skills:enable', { id }),
    disable: (id: string) => ipcRenderer.invoke('skills:disable', { id }),
    read: (id: string) => ipcRenderer.invoke('skills:read', { id }),
  },

  teams: {
    roles: () => ipcRenderer.invoke('teams:roles'),
    create: (goal: string, roles?: string[]) => ipcRenderer.invoke('teams:create', { goal, roles }),
    list: () => ipcRenderer.invoke('teams:list'),
    get: (id: string) => ipcRenderer.invoke('teams:get', { id }),
    respond: (id: string, decision: any) => ipcRenderer.invoke('teams:respond', { id, decision }),
    stop: (id: string) => ipcRenderer.invoke('teams:stop', { id }),
    onUpdate: (cb: (data: any) => void) => {
      const handler = (_: any, data: any) => cb(data)
      ipcRenderer.on('team:update', handler)
      return () => ipcRenderer.removeListener('team:update', handler)
    },
    onHitl: (cb: (data: any) => void) => {
      const handler = (_: any, data: any) => cb(data)
      ipcRenderer.on('team:hitl', handler)
      return () => ipcRenderer.removeListener('team:hitl', handler)
    },
  },

  scheduler: {
    list: () => ipcRenderer.invoke('scheduler:list'),
    create: (input: any) => ipcRenderer.invoke('scheduler:create', input),
    update: (id: string, patch: any) => ipcRenderer.invoke('scheduler:update', { id, patch }),
    remove: (id: string) => ipcRenderer.invoke('scheduler:remove', { id }),
    runNow: (id: string) => ipcRenderer.invoke('scheduler:runNow', { id }),
    onUpdate: (cb: (data: any) => void) => {
      const handler = (_: any, data: any) => cb(data)
      ipcRenderer.on('scheduler:update', handler)
      return () => ipcRenderer.removeListener('scheduler:update', handler)
    },
  },

  voice: {
    speak: (text: string) => ipcRenderer.invoke('voice:speak', { text }),
    stopSpeaking: () => ipcRenderer.invoke('voice:stopSpeaking'),
    transcribe: (audio: string, mimeType: string) => ipcRenderer.invoke('voice:transcribe', { audio, mimeType }),
  },

  terminal: {
    create: (cwd?: string) => ipcRenderer.invoke('terminal:create', { cwd }),
    input: (id: string, data: string) => ipcRenderer.invoke('terminal:input', { id, data }),
    kill: (id: string) => ipcRenderer.invoke('terminal:kill', { id }),
    onData: (cb: (data: any) => void) => {
      const handler = (_: any, data: any) => cb(data)
      ipcRenderer.on('terminal:data', handler)
      return () => ipcRenderer.removeListener('terminal:data', handler)
    },
  },

  packs: {
    registry: () => ipcRenderer.invoke('packs:registry'),
    list: () => ipcRenderer.invoke('packs:list'),
    install: (packId: string) => ipcRenderer.invoke('packs:install', { packId }),
    uninstall: (packId: string) => ipcRenderer.invoke('packs:uninstall', { packId }),
    onStatus: (cb: (data: any) => void) => {
      const handler = (_: any, data: any) => cb(data)
      ipcRenderer.on('pack:status', handler)
      return () => ipcRenderer.removeListener('pack:status', handler)
    },
  },

  telegram: {
    start: () => ipcRenderer.invoke('telegram:start'),
    stop: () => ipcRenderer.invoke('telegram:stop'),
    status: () => ipcRenderer.invoke('telegram:status'),
    onStatus: (cb: (data: any) => void) => {
      const handler = (_: any, data: any) => cb(data)
      ipcRenderer.on('telegram:status', handler)
      return () => ipcRenderer.removeListener('telegram:status', handler)
    },
    onMessage: (cb: (data: any) => void) => {
      const handler = (_: any, data: any) => cb(data)
      ipcRenderer.on('telegram:message', handler)
      return () => ipcRenderer.removeListener('telegram:message', handler)
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

  updater: {
    onStatus: (cb: (data: any) => void) => {
      const handler = (_: any, data: any) => cb(data)
      ipcRenderer.on('updater:status', handler)
      return () => ipcRenderer.removeListener('updater:status', handler)
    },
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
