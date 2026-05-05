# Phase 1 — Electron Shell + React UI + Claude Chat

## Goal
A working Electron app that opens a window, shows a chat UI,
and can send messages to Claude using the user's API key.

## Deliverables checklist

- [ ] Electron window opens on macOS
- [ ] React UI loads inside the window
- [ ] Sidebar with navigation icons
- [ ] Chat page with message list and input
- [ ] Basic message sent → Claude responds (streaming)
- [ ] Tool call cards shown in real-time
- [ ] App has correct macOS title bar (traffic lights)
- [ ] App icon set

## Dependencies to install

```bash
pnpm add electron electron-vite
pnpm add react react-dom react-router-dom
pnpm add @anthropic-ai/sdk
pnpm add zustand
pnpm add tailwindcss @tailwindcss/vite
pnpm add lucide-react
pnpm add react-markdown remark-gfm
pnpm add highlight.js
pnpm add conf
pnpm add zod
pnpm add -D typescript @types/react @types/react-dom
pnpm add -D electron-builder
pnpm add -D @types/node
```

## package.json

```json
{
  "name": "macvis",
  "version": "0.1.0",
  "description": "Local-first agentic AI assistant for macOS",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build && electron-builder",
    "preview": "electron-vite preview",
    "typecheck": "tsc --noEmit"
  },
  "build": {
    "extends": "./electron-builder.yml"
  }
}
```

## electron-builder.yml

```yaml
appId: ai.macvis.app
productName: MacVis
copyright: Copyright © 2025
mac:
  target:
    - target: dmg
    - target: zip
  icon: assets/icon.icns
  hardenedRuntime: false
  gatekeeperAssess: false
  entitlementsInherit: entitlements.mac.plist
dmg:
  background: assets/dmg-background.png
  window:
    width: 540
    height: 380
  contents:
    - x: 130
      y: 220
    - x: 410
      y: 220
      type: link
      path: /Applications
directories:
  output: dist
  buildResources: assets
```

## electron/main.ts

```typescript
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { setupIPCHandlers } from './ipc'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',  // macOS native traffic lights
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0d0d0d',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // Dev: load Vite dev server. Prod: load built files
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  setupIPCHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

export function getMainWindow() {
  return mainWindow
}
```

## electron/preload.ts

```typescript
import { contextBridge, ipcRenderer } from 'electron'

// Type-safe IPC bridge exposed to renderer
contextBridge.exposeInMainWorld('macvis', {
  // Agent
  agent: {
    run: (message: string, sessionId: string) =>
      ipcRenderer.invoke('agent:run', { message, sessionId }),
    stop: (sessionId: string) =>
      ipcRenderer.invoke('agent:stop', { sessionId }),
    onStream: (cb: (data: any) => void) => {
      ipcRenderer.on('agent:stream', (_, data) => cb(data))
      return () => ipcRenderer.removeAllListeners('agent:stream')
    },
    onToolCall: (cb: (data: any) => void) => {
      ipcRenderer.on('agent:tool', (_, data) => cb(data))
      return () => ipcRenderer.removeAllListeners('agent:tool')
    },
    onDone: (cb: (data: any) => void) => {
      ipcRenderer.on('agent:done', (_, data) => cb(data))
      return () => ipcRenderer.removeAllListeners('agent:done')
    },
    onError: (cb: (data: any) => void) => {
      ipcRenderer.on('agent:error', (_, data) => cb(data))
      return () => ipcRenderer.removeAllListeners('agent:error')
    },
  },

  // Config
  config: {
    get: (key?: string) => ipcRenderer.invoke('config:get', { key }),
    set: (key: string, value: any) => ipcRenderer.invoke('config:set', { key, value }),
  },

  // MCP
  mcp: {
    list: () => ipcRenderer.invoke('mcp:list'),
    connect: (name: string) => ipcRenderer.invoke('mcp:connect', { name }),
    disconnect: (name: string) => ipcRenderer.invoke('mcp:disconnect', { name }),
    install: (name: string, command: string, args: string[]) =>
      ipcRenderer.invoke('mcp:install', { name, command, args }),
    onStatus: (cb: (data: any) => void) => {
      ipcRenderer.on('mcp:status', (_, data) => cb(data))
      return () => ipcRenderer.removeAllListeners('mcp:status')
    },
  },

  // Skills
  skills: {
    list: () => ipcRenderer.invoke('skills:list'),
    install: (url: string) => ipcRenderer.invoke('skills:install', { url }),
    uninstall: (name: string) => ipcRenderer.invoke('skills:uninstall', { name }),
  },

  // Telegram
  telegram: {
    start: () => ipcRenderer.invoke('telegram:start'),
    stop: () => ipcRenderer.invoke('telegram:stop'),
    onStatus: (cb: (data: any) => void) => {
      ipcRenderer.on('telegram:status', (_, data) => cb(data))
      return () => ipcRenderer.removeAllListeners('telegram:status')
    },
  },

  // Shell
  shell: {
    run: (command: string) => ipcRenderer.invoke('shell:run', { command }),
  },
})
```

## electron/core/agent/AgentLoop.ts

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { getMainWindow } from '../../main'
import { ConfigStore } from '../config/ConfigStore'
import { ToolBuilder } from './ToolBuilder'
import { executeTool } from '../tools'

export class AgentLoop {
  private running = new Map<string, boolean>()

  async run(message: string, sessionId: string) {
    const config = ConfigStore.getInstance()
    const apiKey = config.get('apiKeys.anthropic') as string

    if (!apiKey) {
      this.emit('agent:error', { error: 'No Anthropic API key set. Go to Settings.', sessionId })
      return
    }

    this.running.set(sessionId, true)
    const client = new Anthropic({ apiKey })
    const tools = await ToolBuilder.buildAll(config)
    let messages: any[] = [{ role: 'user', content: message }]

    try {
      while (this.running.get(sessionId)) {
        const stream = await client.messages.stream({
          model: config.get('models.default') as string || 'claude-opus-4-5',
          max_tokens: 8096,
          tools,
          messages,
        })

        let assistantContent: any[] = []

        // Stream text chunks to renderer
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            this.emit('agent:stream', { type: 'text', content: chunk.delta.text, sessionId })
            assistantContent.push({ type: 'text', text: chunk.delta.text })
          }
          if (chunk.type === 'content_block_start' && chunk.content_block.type === 'tool_use') {
            this.emit('agent:tool', { name: chunk.content_block.name, status: 'running', sessionId })
          }
        }

        const finalMessage = await stream.finalMessage()

        // Check for tool use
        if (finalMessage.stop_reason !== 'tool_use') {
          break
        }

        // Execute tools
        const toolUseBlocks = finalMessage.content.filter((b: any) => b.type === 'tool_use')
        const toolResults = []

        for (const toolUse of toolUseBlocks) {
          this.emit('agent:tool', { name: toolUse.name, input: toolUse.input, status: 'running', sessionId })

          const result = await executeTool(toolUse.name, toolUse.input, config)

          this.emit('agent:tool', { name: toolUse.name, result, status: 'done', sessionId })

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: typeof result === 'string' ? result : JSON.stringify(result),
          })
        }

        messages = [
          ...messages,
          { role: 'assistant', content: finalMessage.content },
          { role: 'user', content: toolResults },
        ]
      }
    } catch (err: any) {
      this.emit('agent:error', { error: err.message, sessionId })
    } finally {
      this.running.delete(sessionId)
      this.emit('agent:done', { sessionId })
    }
  }

  stop(sessionId: string) {
    this.running.set(sessionId, false)
  }

  private emit(channel: string, data: any) {
    getMainWindow()?.webContents.send(channel, data)
  }
}

export const agentLoop = new AgentLoop()
```

## src/stores/chatStore.ts

```typescript
import { create } from 'zustand'
import { nanoid } from 'nanoid'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
  timestamp: number
}

export interface ToolCall {
  name: string
  input?: any
  result?: string
  status: 'running' | 'done' | 'error'
}

export interface Session {
  id: string
  title: string
  messages: Message[]
  createdAt: number
}

interface ChatStore {
  sessions: Session[]
  activeSessionId: string
  isStreaming: boolean

  createSession: () => string
  setActiveSession: (id: string) => void
  addMessage: (sessionId: string, message: Omit<Message, 'id' | 'timestamp'>) => string
  appendStream: (sessionId: string, messageId: string, text: string) => void
  updateToolCall: (sessionId: string, toolCall: ToolCall) => void
  setStreaming: (v: boolean) => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  sessions: [],
  activeSessionId: '',
  isStreaming: false,

  createSession: () => {
    const id = nanoid()
    const session: Session = {
      id,
      title: 'New chat',
      messages: [],
      createdAt: Date.now(),
    }
    set(s => ({ sessions: [...s.sessions, session], activeSessionId: id }))
    return id
  },

  setActiveSession: (id) => set({ activeSessionId: id }),

  addMessage: (sessionId, msg) => {
    const id = nanoid()
    set(s => ({
      sessions: s.sessions.map(session =>
        session.id === sessionId
          ? { ...session, messages: [...session.messages, { ...msg, id, timestamp: Date.now() }] }
          : session
      ),
    }))
    return id
  },

  appendStream: (sessionId, messageId, text) => {
    set(s => ({
      sessions: s.sessions.map(session =>
        session.id === sessionId
          ? {
              ...session,
              messages: session.messages.map(m =>
                m.id === messageId ? { ...m, content: m.content + text } : m
              ),
            }
          : session
      ),
    }))
  },

  updateToolCall: (sessionId, toolCall) => {
    set(s => ({
      sessions: s.sessions.map(session => {
        if (session.id !== sessionId) return session
        const lastMsg = session.messages[session.messages.length - 1]
        if (!lastMsg || lastMsg.role !== 'assistant') return session
        const existing = lastMsg.toolCalls || []
        const idx = existing.findIndex(t => t.name === toolCall.name)
        const updated = idx >= 0
          ? existing.map((t, i) => i === idx ? toolCall : t)
          : [...existing, toolCall]
        return {
          ...session,
          messages: session.messages.map((m, i) =>
            i === session.messages.length - 1 ? { ...m, toolCalls: updated } : m
          ),
        }
      }),
    }))
  },

  setStreaming: (v) => set({ isStreaming: v }),
}))
```

## Testing Phase 1

After building, verify:

1. `pnpm dev` opens Electron window
2. Window has macOS traffic light buttons
3. Chat input accepts text
4. Entering an Anthropic API key in Settings works
5. Sending a message streams back a response
6. Tool calls show as cards (test with "list files in my home dir")
7. Multiple sessions work via tabs
