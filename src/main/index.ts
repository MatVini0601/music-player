import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron'
import { autoUpdater } from 'electron-updater'
import { join } from 'node:path'
import { getDb } from './db/db'
import { scanLibrary } from './library/scanner'
import { rowsToTracks, TRACK_COLUMNS_SQL, TRACK_JOINS_SQL, type TrackRow } from './library/trackMapper'
import { registerPlaylistHandlers } from './library/playlists'
import { registerArtworkHandlers } from './library/artwork'
import { registerLyricsHandlers } from './library/lyrics'
import { registerMetadataHandlers } from './library/metadata'
import { registerHistoryHandlers } from './library/history'
import { registerMediaProtocolPrivileges, registerMediaProtocolHandler } from './mediaProtocol'
import type { EqBand, Track, ScanResult } from '../shared/types'

registerMediaProtocolPrivileges()

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#121212',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // The application menu is removed, so re-provide the dev shortcuts it supplied.
  if (!app.isPackaged) {
    mainWindow.webContents.on('before-input-event', (_event, input) => {
      if (input.type !== 'keyDown') return
      if (input.key === 'F12') mainWindow?.webContents.toggleDevTools()
      if (input.control && input.key.toLowerCase() === 'r') mainWindow?.webContents.reload()
    })
  }

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpcHandlers(): void {
  const db = getDb()

  ipcMain.handle('library:pickFolder', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null

    const folderPath = result.filePaths[0]
    db.prepare('INSERT OR IGNORE INTO library_roots (path) VALUES (?)').run(folderPath)
    return folderPath
  })

  ipcMain.handle('library:getLibraryRoots', () => {
    const rows = db.prepare('SELECT path FROM library_roots').all() as { path: string }[]
    return rows.map((r) => r.path)
  })

  ipcMain.handle('library:removeLibraryRoot', (_event, folderPath: string): void => {
    db.prepare('DELETE FROM library_roots WHERE path = ?').run(folderPath)

    // Remove that folder's tracks: their files still exist on disk, so the scanner's
    // missing-file cleanup would never drop them. substr() instead of LIKE because
    // paths routinely contain '_' (a LIKE wildcard).
    const prefix = folderPath.replace(/[\\/]+$/, '') + '\\'
    db.prepare('DELETE FROM tracks WHERE substr(file_path, 1, ?) = ?').run(prefix.length, prefix)

    db.prepare(
      `DELETE FROM albums
       WHERE id NOT IN (SELECT DISTINCT album_id FROM tracks WHERE album_id IS NOT NULL)`
    ).run()
  })

  ipcMain.handle('library:scanLibrary', async (): Promise<ScanResult> => {
    const roots = (db.prepare('SELECT path FROM library_roots').all() as { path: string }[]).map(
      (r) => r.path
    )

    return scanLibrary(db, roots, (progress) => {
      mainWindow?.webContents.send('library:scanProgress', progress)
    })
  })

  ipcMain.handle('library:getTracks', async (): Promise<Track[]> => {
    const rows = db
      .prepare(
        `SELECT ${TRACK_COLUMNS_SQL}
         FROM tracks t
         ${TRACK_JOINS_SQL}
         ORDER BY t.artist COLLATE NOCASE, t.album COLLATE NOCASE, t.track_no`
      )
      .all() as TrackRow[]

    return rowsToTracks(rows)
  })

  ipcMain.handle('settings:getVolume', (): number => {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'volume'").get() as
      | { value: string }
      | undefined
    return row ? Number(row.value) : 1
  })

  ipcMain.handle('settings:setVolume', (_event, volume: number): void => {
    db.prepare(
      "INSERT INTO settings (key, value) VALUES ('volume', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).run(String(volume))
  })

  const defaultEqBands = (): EqBand[] =>
    [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000].map((frequency) => ({
      frequency,
      q: 1.41,
      gain: 0
    }))

  const isValidEqBands = (value: unknown): value is EqBand[] =>
    Array.isArray(value) &&
    value.length === 10 &&
    value.every(
      (b) =>
        b &&
        typeof b.frequency === 'number' &&
        typeof b.q === 'number' &&
        typeof b.gain === 'number'
    )

  ipcMain.handle('settings:getEqBands', (): EqBand[] => {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'eqBands'").get() as
      | { value: string }
      | undefined
    if (!row) return defaultEqBands()
    try {
      const parsed = JSON.parse(row.value)
      if (isValidEqBands(parsed)) return parsed
    } catch {
      // fall through to default
    }
    return defaultEqBands()
  })

  ipcMain.handle('settings:setEqBands', (_event, bands: EqBand[]): void => {
    db.prepare(
      "INSERT INTO settings (key, value) VALUES ('eqBands', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).run(JSON.stringify(bands))
  })

  ipcMain.handle('trackEq:get', (_event, trackId: number): EqBand[] | null => {
    const row = db.prepare('SELECT bands FROM track_eq WHERE track_id = ?').get(trackId) as
      | { bands: string }
      | undefined
    if (!row) return null
    try {
      const parsed = JSON.parse(row.bands)
      if (isValidEqBands(parsed)) return parsed
    } catch {
      // fall through to null
    }
    return null
  })

  ipcMain.handle('trackEq:set', (_event, trackId: number, bands: EqBand[]): void => {
    db.prepare(
      'INSERT INTO track_eq (track_id, bands) VALUES (?, ?) ON CONFLICT(track_id) DO UPDATE SET bands = excluded.bands'
    ).run(trackId, JSON.stringify(bands))
  })

  ipcMain.handle('trackEq:clear', (_event, trackId: number): void => {
    db.prepare('DELETE FROM track_eq WHERE track_id = ?').run(trackId)
  })

  ipcMain.handle('settings:getAccentColor', (): string => {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'accentColor'").get() as
      | { value: string }
      | undefined
    return row?.value ?? '#1db954'
  })

  ipcMain.handle('settings:setAccentColor', (_event, color: string): void => {
    db.prepare(
      "INSERT INTO settings (key, value) VALUES ('accentColor', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).run(color)
  })

  ipcMain.handle('settings:getSidebarCollapsed', (): boolean => {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'sidebarCollapsed'").get() as
      | { value: string }
      | undefined
    return row?.value === '1'
  })

  ipcMain.handle('settings:setSidebarCollapsed', (_event, collapsed: boolean): void => {
    db.prepare(
      "INSERT INTO settings (key, value) VALUES ('sidebarCollapsed', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).run(collapsed ? '1' : '0')
  })

  registerPlaylistHandlers(db)
  registerArtworkHandlers(db, () => mainWindow)
  registerLyricsHandlers(db)
  registerMetadataHandlers(db)
  registerHistoryHandlers(db)
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  registerMediaProtocolHandler()
  registerIpcHandlers()
  createWindow()

  // Checks the GitHub Releases feed, downloads a newer version in the background,
  // notifies the user, and installs it when the app quits. Dev builds are skipped.
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch((error) => {
      console.warn('Update check failed:', error)
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
