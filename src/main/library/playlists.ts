import { ipcMain } from 'electron'
import type { Database } from 'better-sqlite3'
import { rowsToTracks, TRACK_COLUMNS_SQL, TRACK_JOINS_SQL, type TrackRow } from './trackMapper'
import { toMediaUrl } from '../mediaProtocol'
import type { Playlist, Track } from '../../shared/types'

export function registerPlaylistHandlers(db: Database): void {
  ipcMain.handle('playlist:list', async (): Promise<Playlist[]> => {
    const rows = db
      .prepare(
        `SELECT p.id, p.name, p.description, p.user_art_path, COUNT(pt.track_id) as track_count
         FROM playlists p
         LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
         GROUP BY p.id
         ORDER BY p.created_at`
      )
      .all() as {
      id: number
      name: string
      description: string | null
      user_art_path: string | null
      track_count: number
    }[]

    const getFallbackArt = db.prepare(
      `SELECT COALESCE(t.user_art_path, alb.user_art_path, ac.image_path) as resolved_path
       FROM playlist_tracks pt
       JOIN tracks t ON t.id = pt.track_id
       LEFT JOIN albums alb ON alb.id = t.album_id
       LEFT JOIN art_cache ac ON ac.track_id = t.id
       WHERE pt.playlist_id = ?
         AND COALESCE(t.user_art_path, alb.user_art_path, ac.image_path) IS NOT NULL
       ORDER BY pt.position
       LIMIT 1`
    )

    return rows.map((r) => {
      const artPath =
        r.user_art_path ??
        (getFallbackArt.get(r.id) as { resolved_path: string } | undefined)?.resolved_path ??
        null

      return {
        id: r.id,
        name: r.name,
        description: r.description,
        artUrl: artPath ? toMediaUrl(artPath) : null,
        trackCount: r.track_count
      }
    })
  })

  ipcMain.handle('playlist:create', (_event, name: string): Playlist => {
    const result = db.prepare('INSERT INTO playlists (name) VALUES (?)').run(name)
    return {
      id: Number(result.lastInsertRowid),
      name,
      description: null,
      artUrl: null,
      trackCount: 0
    }
  })

  ipcMain.handle('playlist:rename', (_event, id: number, name: string): void => {
    db.prepare('UPDATE playlists SET name = ? WHERE id = ?').run(name, id)
  })

  ipcMain.handle(
    'playlist:setDescription',
    (_event, id: number, description: string): void => {
      db.prepare('UPDATE playlists SET description = ? WHERE id = ?').run(description || null, id)
    }
  )

  ipcMain.handle('playlist:delete', (_event, id: number): void => {
    db.prepare('DELETE FROM playlists WHERE id = ?').run(id)
  })

  ipcMain.handle('playlist:getTracks', async (_event, playlistId: number): Promise<Track[]> => {
    const rows = db
      .prepare(
        `SELECT ${TRACK_COLUMNS_SQL}, pt.added_at AS playlist_added_at
         FROM playlist_tracks pt
         JOIN tracks t ON t.id = pt.track_id
         ${TRACK_JOINS_SQL}
         WHERE pt.playlist_id = ?
         ORDER BY pt.position`
      )
      .all(playlistId) as (TrackRow & { playlist_added_at: string })[]

    const tracks = rowsToTracks(rows)
    // "Date added" in a playlist means when the track was added to THIS playlist,
    // not when it was originally added to the library.
    return tracks.map((track, i) => ({ ...track, addedAt: rows[i].playlist_added_at }))
  })

  // Duplicates are intentionally not allowed (PK on playlist_id+track_id);
  // re-adding an existing track is a silent no-op.
  ipcMain.handle('playlist:addTrack', (_event, playlistId: number, trackId: number): void => {
    const { maxPosition } = db
      .prepare('SELECT MAX(position) as maxPosition FROM playlist_tracks WHERE playlist_id = ?')
      .get(playlistId) as { maxPosition: number | null }

    db.prepare(
      `INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position, added_at)
       VALUES (?, ?, ?, datetime('now'))`
    ).run(playlistId, trackId, (maxPosition ?? -1) + 1)
  })

  ipcMain.handle('playlist:removeTrack', (_event, playlistId: number, trackId: number): void => {
    db.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?').run(
      playlistId,
      trackId
    )
  })

  ipcMain.handle(
    'playlist:reorderTracks',
    (_event, playlistId: number, orderedTrackIds: number[]): void => {
      const updatePosition = db.prepare(
        'UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND track_id = ?'
      )

      const reorder = db.transaction((trackIds: number[]) => {
        trackIds.forEach((trackId, index) => {
          updatePosition.run(index, playlistId, trackId)
        })
      })

      reorder(orderedTrackIds)
    }
  )
}
