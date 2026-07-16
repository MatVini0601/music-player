import { app, ipcMain, type BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateEvent } from '../shared/types'

export function registerUpdateHandlers(getMainWindow: () => BrowserWindow | null): void {
  // Updates are user-driven: the app only checks and reports. Downloading requires
  // explicit confirmation in the UI, and the downloaded update applies on quit.
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  const send = (event: UpdateEvent): void => {
    getMainWindow()?.webContents.send('updates:event', event)
  }

  autoUpdater.on('update-available', (info) => send({ type: 'available', version: info.version }))
  autoUpdater.on('update-not-available', () => send({ type: 'upToDate' }))
  autoUpdater.on('download-progress', (progress) =>
    send({ type: 'downloading', percent: progress.percent })
  )
  autoUpdater.on('update-downloaded', (info) => send({ type: 'downloaded', version: info.version }))
  autoUpdater.on('error', (error) => send({ type: 'error', message: error.message }))

  ipcMain.handle('updates:getAppVersion', (): string => app.getVersion())

  ipcMain.handle('updates:check', (): void => {
    if (!app.isPackaged) {
      send({ type: 'error', message: 'Updates only work in the installed app' })
      return
    }
    autoUpdater.checkForUpdates().catch((error) => {
      send({ type: 'error', message: String(error?.message ?? error) })
    })
  })

  ipcMain.handle('updates:download', (): void => {
    autoUpdater.downloadUpdate().catch((error) => {
      send({ type: 'error', message: String(error?.message ?? error) })
    })
  })

  ipcMain.handle('updates:install', (): void => {
    autoUpdater.quitAndInstall()
  })
}

export function checkForUpdatesOnStartup(): void {
  if (!app.isPackaged) return
  // Delayed so the renderer has subscribed to update events before results arrive,
  // and so the check never competes with app startup.
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((error) => {
      console.warn('Startup update check failed:', error)
    })
  }, 5000)
}
