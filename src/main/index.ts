import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron'
import { join } from 'node:path'
import { registerUpdateHandlers, checkForUpdatesOnStartup } from './updates'
import { getDb } from './db/db'
import { scanLibrary } from './library/scanner'
import { rowsToTracks, TRACK_COLUMNS_SQL, TRACK_JOINS_SQL, type TrackRow } from './library/trackMapper'
import { registerPlaylistHandlers } from './library/playlists'
import { registerArtworkHandlers } from './library/artwork'
import { registerLyricsHandlers } from './library/lyrics'
import { registerMetadataHandlers } from './library/metadata'
import { registerHistoryHandlers } from './library/history'
import { registerMediaProtocolPrivileges, registerMediaProtocolHandler } from './mediaProtocol'
import type { EqBand, LibrarySort, SortMode, Track, ScanResult } from '../shared/types'

// The default userData path is derived from productName ("Fermata"), but existing installs
// already have their library at the historical %APPDATA%\music-player — pin it so the rename
// doesn't strand their data. Dev (npm run dev) gets its own sibling profile: sharing one
// library.db with the installed build leaks dev-scanned tracks into the real library (and
// mediaProtocol doesn't gate playback by extension, so the old build would play them too).
// Must run before anything calls app.getPath('userData') (db.ts, artCache.ts, updates.ts).
app.setPath(
  'userData',
  join(app.getPath('appData'), app.isPackaged ? 'music-player' : 'music-player-dev')
)

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

  // Every simple setting is one row in the settings table; a registration declares
  // only its storage key, (de)serialization, and fallback. Channel names are unchanged.
  // A fromStored that throws falls back; a toStored returning null deletes the row.
  function registerSetting<T>(
    channel: string,
    key: string,
    spec: {
      fromStored: (stored: string) => T
      toStored: (value: T) => string | null
      fallback: () => T
    }
  ): void {
    ipcMain.handle(`settings:get${channel}`, (): T => {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
        | { value: string }
        | undefined
      if (!row) return spec.fallback()
      try {
        return spec.fromStored(row.value)
      } catch {
        return spec.fallback()
      }
    })

    ipcMain.handle(`settings:set${channel}`, (_event, value: T): void => {
      const stored = spec.toStored(value)
      if (stored === null) {
        db.prepare('DELETE FROM settings WHERE key = ?').run(key)
        return
      }
      db.prepare(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
      ).run(key, stored)
    })
  }

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

  const isValidLibrarySort = (value: unknown): value is LibrarySort =>
    !!value &&
    typeof value === 'object' &&
    ['title', 'album', 'added', 'duration'].includes((value as LibrarySort).key) &&
    ['asc', 'desc'].includes((value as LibrarySort).direction)

  registerSetting<number>('Volume', 'volume', {
    fromStored: (stored) => {
      const volume = Number(stored)
      if (Number.isNaN(volume)) throw new Error('invalid volume')
      return volume
    },
    toStored: String,
    fallback: () => 1
  })

  registerSetting<EqBand[]>('EqBands', 'eqBands', {
    fromStored: (stored) => {
      const parsed = JSON.parse(stored)
      if (!isValidEqBands(parsed)) throw new Error('invalid eq bands')
      return parsed
    },
    toStored: (bands) => JSON.stringify(bands),
    fallback: defaultEqBands
  })

  registerSetting<string>('AccentColor', 'accentColor', {
    fromStored: (stored) => stored,
    toStored: (color) => color,
    fallback: () => '#1db954'
  })

  registerSetting<boolean>('SidebarCollapsed', 'sidebarCollapsed', {
    fromStored: (stored) => stored === '1',
    toStored: (collapsed) => (collapsed ? '1' : '0'),
    fallback: () => false
  })

  registerSetting<boolean>('DominantColorBg', 'dominantColorBg', {
    fromStored: (stored) => stored === '1',
    toStored: (enabled) => (enabled ? '1' : '0'),
    fallback: () => true
  })

  registerSetting<SortMode>('SortMode', 'sortMode', {
    fromStored: (stored) => {
      if (stored !== 'normal' && stored !== 'ignoreSpecials') throw new Error('invalid sort mode')
      return stored
    },
    toStored: (mode) => mode,
    fallback: () => 'ignoreSpecials'
  })

  registerSetting<string>('AudioOutput', 'audioOutput', {
    fromStored: (stored) => stored,
    toStored: (deviceId) => deviceId,
    fallback: () => ''
  })

  registerSetting<string>('LastSeenVersion', 'lastSeenVersion', {
    fromStored: (stored) => stored,
    toStored: (version) => version,
    fallback: () => ''
  })

  registerSetting<LibrarySort | null>('LibrarySort', 'librarySort', {
    fromStored: (stored) => {
      const parsed = JSON.parse(stored)
      if (!isValidLibrarySort(parsed)) throw new Error('invalid library sort')
      return parsed
    },
    toStored: (sort) =>
      isValidLibrarySort(sort)
        ? JSON.stringify({ key: sort.key, direction: sort.direction })
        : null,
    fallback: () => null
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
  registerUpdateHandlers(() => mainWindow)
  createWindow()
  checkForUpdatesOnStartup()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
