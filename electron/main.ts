import { app, BrowserWindow, ipcMain, shell, session, globalShortcut, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { setupIPCHandlers } from './ipc'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function showWindow() {
  if (!mainWindow) { createWindow(); return }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function setupTrayAndHotkey() {
  // Global quick-launch: ⌘⇧M brings MacVis to the front from anywhere.
  try { globalShortcut.register('CommandOrControl+Shift+M', showWindow) }
  catch (err) { console.error('globalShortcut error:', err) }

  // Menu-bar tray icon.
  try {
    const img = nativeImage.createFromPath(join(__dirname, '../../assets/icon.png')).resize({ width: 18, height: 18 })
    img.setTemplateImage(true)
    tray = new Tray(img)
    tray.setToolTip('MacVis')
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Open MacVis  (⌘⇧M)', click: showWindow },
      { type: 'separator' },
      { label: 'Quit MacVis', click: () => app.quit() },
    ]))
    tray.on('click', showWindow)
  } catch (err) { console.error('Tray setup error:', err) }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0d0d0d',
    icon: join(__dirname, '../../assets/icon.png'),
    vibrancy: 'under-window',
    visualEffectState: 'active',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  const devUrl = process.env.ELECTRON_RENDERER_URL || process.env.VITE_DEV_SERVER_URL
  if (devUrl) {
    mainWindow.loadURL(devUrl)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Only open http(s) links externally; never let the renderer navigate itself
  // to another origin (that origin would inherit the window.macvis bridge).
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  const isAppUrl = (url: string) => devUrl ? url.startsWith(devUrl) : url.startsWith('file://')
  const lockNav = (e: Electron.Event, url: string) => { if (!isAppUrl(url)) e.preventDefault() }
  mainWindow.webContents.on('will-navigate', lockNav)
  mainWindow.webContents.on('will-redirect', lockNav)
}

app.whenReady().then(async () => {
  // Local-first desktop app: grant only the permissions the app actually needs
  // (mic for voice input). Deny everything else instead of blanket-approving.
  const ALLOWED_PERMISSIONS = new Set(['media', 'audioCapture', 'clipboard-read', 'clipboard-sanitized-write'])
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => cb(ALLOWED_PERMISSIONS.has(permission)))

  // Content-Security-Policy for the packaged app (file:// load). The renderer
  // talks to the main process only over IPC — no direct network — so lock
  // connect-src to self. Skipped in dev so Vite HMR keeps working.
  const devUrl = process.env.ELECTRON_RENDERER_URL || process.env.VITE_DEV_SERVER_URL
  if (!devUrl) {
    const CSP = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "media-src 'self' blob: data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'none'",
      "frame-src 'none'",
      "worker-src 'self' blob:",
    ].join('; ')
    session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
      cb({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [CSP] } })
    })
  }

  // Encrypt any plaintext API keys already on disk (safeStorage / Keychain-backed).
  // Safe to run every boot; a no-op once everything is encrypted.
  import('./core/config/ConfigStore').then(({ ConfigStore }) => {
    try { ConfigStore.getInstance().migrateSecrets() } catch (err) { console.error('Secret migration error:', err) }
  })

  setupIPCHandlers()
  createWindow()
  setupTrayAndHotkey()

  // Auto-updater (no-op in dev; uses GitHub Releases in packaged builds)
  import('./core/updater/AutoUpdater').then(({ setupAutoUpdater }) => {
    setupAutoUpdater()
  })

  // Auto-connect any MCP servers the user enabled in a previous session.
  // Done lazily so the window opens fast — spawning npx can take a few seconds.
  setTimeout(() => {
    import('./core/mcp/MCPManager').then(({ MCPManager }) => {
      MCPManager.getInstance().connectAllEnabled().catch(err => {
        console.error('MCP auto-connect error:', err)
      })
    })

    // Start the task scheduler (fires saved schedules on their cadence)
    import('./core/scheduler/Scheduler').then(({ Scheduler }) => {
      try { Scheduler.start() } catch (err) { console.error('Scheduler start error:', err) }
    })

    // Auto-start the webhook trigger server if enabled
    import('./core/config/ConfigStore').then(({ ConfigStore }) => {
      if (ConfigStore.getInstance().get('webhooks.enabled')) {
        import('./core/webhooks/WebhookServer').then(({ WebhookServer }) => {
          WebhookServer.start().then(r => { if (!r.ok) console.warn('Webhook server start failed:', r.error) })
        })
      }
    })

    // Auto-start Telegram bot if configured to run on startup
    import('./core/config/ConfigStore').then(({ ConfigStore }) => {
      const config = ConfigStore.getInstance()
      if (config.get('telegram.runOnStartup')) {
        import('./core/telegram/TelegramBot').then(({ startTelegramBot }) => {
          startTelegramBot().then(r => {
            if (!r.ok) console.warn('Telegram auto-start failed:', r.error)
          })
        })
      }
    })
  }, 1500)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

export function getMainWindow() {
  return mainWindow
}
