import { autoUpdater } from 'electron-updater'
import { dialog, app } from 'electron'
import { getMainWindow } from '../../main'

/**
 * Wire up electron-updater to check GitHub Releases for new versions.
 * Quietly checks at startup; downloads in the background; prompts the user
 * to restart once the update has finished downloading.
 *
 * Notes:
 * - Update checks run only in packaged production builds (not in `pnpm dev`)
 * - GitHub Releases is the update channel (configured in electron-builder.yml)
 * - Unsigned builds DO update — Gatekeeper accepts them on relaunch via xattr,
 *   but for the smoothest UX, sign + notarize (see issue #2)
 */
export function setupAutoUpdater() {
  // Skip in dev — electron-builder doesn't emit update metadata in dev
  if (!app.isPackaged) {
    console.log('[updater] skipping (dev mode)')
    return
  }

  // Don't auto-download until we ask — we'll let it download in the background but
  // prompt the user before quitting/installing
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    console.log('[updater] checking for updates...')
  })

  autoUpdater.on('update-available', info => {
    console.log('[updater] update available:', info.version)
    getMainWindow()?.webContents.send('updater:status', {
      status: 'available',
      version: info.version,
    })
  })

  autoUpdater.on('update-not-available', () => {
    console.log('[updater] up to date')
  })

  autoUpdater.on('download-progress', p => {
    getMainWindow()?.webContents.send('updater:status', {
      status: 'downloading',
      percent: Math.round(p.percent),
      transferred: p.transferred,
      total: p.total,
    })
  })

  autoUpdater.on('update-downloaded', info => {
    console.log('[updater] downloaded:', info.version)
    getMainWindow()?.webContents.send('updater:status', {
      status: 'downloaded',
      version: info.version,
    })

    // Prompt the user — restart now or later
    dialog
      .showMessageBox({
        type: 'info',
        buttons: ['Restart now', 'Later'],
        defaultId: 0,
        cancelId: 1,
        title: 'MacVis update ready',
        message: `MacVis ${info.version} is ready to install.`,
        detail: 'Restart the app to apply the update. Your chat history and settings are preserved.',
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall()
        }
      })
  })

  autoUpdater.on('error', err => {
    console.warn('[updater] error:', err?.message || err)
    getMainWindow()?.webContents.send('updater:status', {
      status: 'error',
      error: err?.message || String(err),
    })
  })

  // Kick off the first check 4s after launch so the window has time to paint
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(err => {
      console.warn('[updater] initial check failed:', err?.message || err)
    })
  }, 4_000)

  // Check again every 6 hours while the app is open
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 6 * 60 * 60 * 1_000)
}
