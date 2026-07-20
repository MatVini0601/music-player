import type { Database } from 'better-sqlite3'
import { toMediaUrl } from '../mediaProtocol'
import type { Album, Track } from '../../shared/types'

export const TRACK_COLUMNS_SQL = `t.id, t.file_path, t.title, t.artist, t.album, t.album_artist, t.album_id, t.genre, t.track_no,
                t.duration_seconds, t.format, t.user_art_path, t.added_at, ac.image_path, alb.user_art_path AS album_art_path`

export const TRACK_JOINS_SQL = `LEFT JOIN art_cache ac ON ac.track_id = t.id
         LEFT JOIN albums alb ON alb.id = t.album_id`

export interface TrackRow {
  id: number
  file_path: string
  title: string
  artist: string
  album: string
  album_artist: string
  album_id: number | null
  genre: string | null
  track_no: number | null
  duration_seconds: number
  format: string
  image_path: string | null
  user_art_path: string | null
  album_art_path: string | null
  added_at: string
}

export interface AlbumRow {
  id: number
  title: string
  album_artist: string
  user_art_path: string | null
  track_count: number
}

export function rowsToAlbums(db: Database, rows: AlbumRow[]): Album[] {
  const getFallbackArt = db.prepare(
    `SELECT ac.image_path
     FROM tracks t
     JOIN art_cache ac ON ac.track_id = t.id
     WHERE t.album_id = ?
     ORDER BY t.track_no
     LIMIT 1`
  )

  const getGenres = db.prepare(
    `SELECT DISTINCT genre FROM tracks WHERE album_id = ? AND genre IS NOT NULL AND genre != ''`
  )

  const getYear = db.prepare(
    `SELECT year FROM tracks
     WHERE album_id = ? AND year IS NOT NULL AND year != 0
     ORDER BY track_no
     LIMIT 1`
  )

  return rows.map((r) => {
    const artPath =
      r.user_art_path ??
      (getFallbackArt.get(r.id) as { image_path: string } | undefined)?.image_path ??
      null

    // Track genre strings can be multi-valued ("Rock, Indie"); split them and dedupe
    // case-insensitively, keeping the first spelling seen.
    const genresByKey = new Map<string, string>()
    for (const row of getGenres.all(r.id) as { genre: string }[]) {
      for (const part of row.genre.split(',')) {
        const genre = part.trim()
        if (genre && !genresByKey.has(genre.toLowerCase())) {
          genresByKey.set(genre.toLowerCase(), genre)
        }
      }
    }

    const year = (getYear.get(r.id) as { year: number } | undefined)?.year ?? null

    return {
      id: r.id,
      title: r.title,
      albumArtist: r.album_artist,
      trackCount: r.track_count,
      artUrl: artPath ? toMediaUrl(artPath) : null,
      genres: [...genresByKey.values()].sort((a, b) => a.localeCompare(b)),
      year
    }
  })
}

export function rowsToTracks(rows: TrackRow[]): Track[] {
  return rows.map((r) => {
    const resolvedArtPath = r.user_art_path ?? r.album_art_path ?? r.image_path

    return {
      id: r.id,
      filePath: r.file_path,
      title: r.title,
      artist: r.artist,
      album: r.album,
      albumArtist: r.album_artist,
      albumId: r.album_id,
      genre: r.genre ?? '',
      trackNo: r.track_no,
      durationSeconds: r.duration_seconds,
      format: r.format,
      artUrl: resolvedArtPath ? toMediaUrl(resolvedArtPath) : null,
      mediaUrl: toMediaUrl(r.file_path),
      addedAt: r.added_at
    }
  })
}
