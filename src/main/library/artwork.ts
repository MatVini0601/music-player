import { dialog, ipcMain, type BrowserWindow } from 'electron'
import type { Database } from 'better-sqlite3'
import { cacheImageFile } from './artCache'
import {
  rowsToAlbums,
  rowsToTracks,
  TRACK_COLUMNS_SQL,
  TRACK_JOINS_SQL,
  type AlbumRow,
  type TrackRow
} from './trackMapper'
import { toMediaUrl } from '../mediaProtocol'
import type { Album, Track } from '../../shared/types'

const IMAGE_FILTERS = [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]

async function pickImageFile(mainWindow: BrowserWindow | null): Promise<string | null> {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: IMAGE_FILTERS
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
}

export function registerArtworkHandlers(
  db: Database,
  getMainWindow: () => BrowserWindow | null
): void {
  ipcMain.handle('library:getAlbums', async (): Promise<Album[]> => {
    const rows = db
      .prepare(
        `SELECT a.id, a.title, a.album_artist, a.user_art_path, COUNT(t.id) as track_count
         FROM albums a
         LEFT JOIN tracks t ON t.album_id = a.id
         GROUP BY a.id
         ORDER BY a.title COLLATE NOCASE`
      )
      .all() as AlbumRow[]

    return rowsToAlbums(db, rows)
  })

  ipcMain.handle('library:getAlbumTracks', async (_event, albumId: number): Promise<Track[]> => {
    const rows = db
      .prepare(
        `SELECT ${TRACK_COLUMNS_SQL}
         FROM tracks t
         ${TRACK_JOINS_SQL}
         WHERE t.album_id = ?
         ORDER BY t.track_no`
      )
      .all(albumId) as TrackRow[]

    return rowsToTracks(rows)
  })

  ipcMain.handle('artwork:setAlbumArt', async (_event, albumId: number): Promise<string | null> => {
    const filePath = await pickImageFile(getMainWindow())
    if (!filePath) return null

    const cachedPath = cacheImageFile(filePath)
    db.prepare('UPDATE albums SET user_art_path = ? WHERE id = ?').run(cachedPath, albumId)
    return toMediaUrl(cachedPath)
  })

  ipcMain.handle('artwork:clearAlbumArt', (_event, albumId: number): void => {
    db.prepare('UPDATE albums SET user_art_path = NULL WHERE id = ?').run(albumId)
  })

  ipcMain.handle('artwork:setTrackArt', async (_event, trackId: number): Promise<string | null> => {
    const filePath = await pickImageFile(getMainWindow())
    if (!filePath) return null

    const cachedPath = cacheImageFile(filePath)
    db.prepare('UPDATE tracks SET user_art_path = ? WHERE id = ?').run(cachedPath, trackId)
    return toMediaUrl(cachedPath)
  })

  ipcMain.handle('artwork:clearTrackArt', (_event, trackId: number): void => {
    db.prepare('UPDATE tracks SET user_art_path = NULL WHERE id = ?').run(trackId)
  })

  ipcMain.handle(
    'artwork:setPlaylistArt',
    async (_event, playlistId: number): Promise<string | null> => {
      const filePath = await pickImageFile(getMainWindow())
      if (!filePath) return null

      const cachedPath = cacheImageFile(filePath)
      db.prepare('UPDATE playlists SET user_art_path = ? WHERE id = ?').run(cachedPath, playlistId)
      return toMediaUrl(cachedPath)
    }
  )

  ipcMain.handle('artwork:clearPlaylistArt', (_event, playlistId: number): void => {
    db.prepare('UPDATE playlists SET user_art_path = NULL WHERE id = ?').run(playlistId)
  })
}
