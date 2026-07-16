import { ipcMain } from 'electron'
import type { Database } from 'better-sqlite3'
import {
  rowsToAlbums,
  rowsToTracks,
  TRACK_COLUMNS_SQL,
  TRACK_JOINS_SQL,
  type AlbumRow,
  type TrackRow
} from './trackMapper'
import type { Album, Track } from '../../shared/types'

const RECENT_ALBUMS_LIMIT = 6
const RECENT_TRACKS_LIMIT = 20

export function registerHistoryHandlers(db: Database): void {
  ipcMain.handle('history:recordPlay', (_event, trackId: number): void => {
    // played_at defaults to datetime('now'), consistent with the other tables.
    db.prepare('INSERT INTO play_history (track_id) VALUES (?)').run(trackId)
  })

  ipcMain.handle('library:getRecentAlbums', async (): Promise<Album[]> => {
    const rows = db
      .prepare(
        `SELECT alb.id, alb.title, alb.album_artist, alb.user_art_path,
                (SELECT COUNT(*) FROM tracks WHERE album_id = alb.id) as track_count,
                MAX(ph.played_at) as last_played
         FROM play_history ph
         JOIN tracks t ON t.id = ph.track_id
         JOIN albums alb ON alb.id = t.album_id
         GROUP BY alb.id
         ORDER BY last_played DESC
         LIMIT ${RECENT_ALBUMS_LIMIT}`
      )
      .all() as AlbumRow[]

    return rowsToAlbums(db, rows)
  })

  ipcMain.handle('library:getRecentTracks', async (): Promise<Track[]> => {
    const rows = db
      .prepare(
        `SELECT ${TRACK_COLUMNS_SQL}, MAX(ph.played_at) as last_played
         FROM play_history ph
         JOIN tracks t ON t.id = ph.track_id
         ${TRACK_JOINS_SQL}
         GROUP BY t.id
         ORDER BY last_played DESC
         LIMIT ${RECENT_TRACKS_LIMIT}`
      )
      .all() as TrackRow[]

    return rowsToTracks(rows)
  })
}
