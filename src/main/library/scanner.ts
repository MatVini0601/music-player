import { readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, extname, sep } from 'node:path'
import type { Database } from 'better-sqlite3'
import { cachePicture } from './artCache'
import { getMusicMetadata } from './musicMetadataLoader'
import type { ScanProgress, ScanResult } from '../../shared/types'

const SUPPORTED_EXTENSIONS = new Set(['.mp3', '.flac'])

async function walk(dir: string, unreadableDirs: string[]): Promise<string[]> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (error) {
    console.warn(`Scan: cannot read directory ${dir}:`, error)
    unreadableDirs.push(dir)
    return []
  }

  const files: string[] = []

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath, unreadableDirs)))
    } else if (SUPPORTED_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      files.push(fullPath)
    }
  }

  return files
}

function findOrCreateAlbum(db: Database, title: string, albumArtist: string): number | null {
  if (!title) return null

  const existing = db
    .prepare('SELECT id FROM albums WHERE title = ? AND album_artist = ?')
    .get(title, albumArtist) as { id: number } | undefined

  if (existing) return existing.id

  const result = db
    .prepare('INSERT INTO albums (title, album_artist) VALUES (?, ?)')
    .run(title, albumArtist)

  return Number(result.lastInsertRowid)
}

export async function scanLibrary(
  db: Database,
  rootPaths: string[],
  onProgress: (progress: ScanProgress) => void
): Promise<ScanResult> {
  const unreadableDirs: string[] = []
  const failedFiles: string[] = []

  const allFiles: string[] = []
  for (const root of rootPaths) {
    allFiles.push(...(await walk(root, unreadableDirs)))
  }

  const upsertTrack = db.prepare(`
    INSERT INTO tracks (file_path, title, artist, album, album_artist, genre, track_no, duration_seconds, format, album_id, file_mtime_ms, last_scanned_at, added_at)
    VALUES (@filePath, @title, @artist, @album, @albumArtist, @genre, @trackNo, @durationSeconds, @format, @albumId, @fileMtimeMs, datetime('now'), datetime('now'))
    ON CONFLICT(file_path) DO UPDATE SET
      title = excluded.title,
      artist = excluded.artist,
      album = excluded.album,
      album_artist = excluded.album_artist,
      genre = excluded.genre,
      track_no = excluded.track_no,
      duration_seconds = excluded.duration_seconds,
      format = excluded.format,
      album_id = excluded.album_id,
      file_mtime_ms = excluded.file_mtime_ms,
      last_scanned_at = datetime('now')
  `)

  const getExisting = db.prepare(
    'SELECT id, file_mtime_ms, genre FROM tracks WHERE file_path = ?'
  )

  const upsertArt = db.prepare(`
    INSERT INTO art_cache (track_id, image_path) VALUES (?, ?)
  `)

  const clearArtForTrack = db.prepare('DELETE FROM art_cache WHERE track_id = ?')

  let addedOrUpdated = 0

  for (let i = 0; i < allFiles.length; i++) {
    const filePath = allFiles[i]
    onProgress({ scanned: i + 1, total: allFiles.length, currentFile: filePath })

    // A single unreadable or corrupt file must not abort the whole scan — skip it and
    // report it in the result instead.
    try {
      const fileStat = await stat(filePath)
      const mtimeMs = Math.floor(fileStat.mtimeMs)

      const existing = getExisting.get(filePath) as
        | { id: number; file_mtime_ms: number; genre: string | null }
        | undefined
      // genre === null means the track was scanned before the genre column existed;
      // re-read its tags once even though the file itself hasn't changed.
      if (existing && existing.file_mtime_ms === mtimeMs && existing.genre !== null) {
        continue
      }

      const { parseFile } = await getMusicMetadata()
      const metadata = await parseFile(filePath)
      const common = metadata.common
      const format = extname(filePath).toLowerCase() === '.flac' ? 'flac' : 'mp3'
      const albumId = findOrCreateAlbum(db, common.album ?? '', common.albumartist ?? common.artist ?? '')
      const genre = common.genre?.length ? common.genre.join(', ') : ''

      const trackId = existing
        ? existing.id
        : Number(
            upsertTrack.run({
              filePath,
              title: common.title ?? filePath.split(/[\\/]/).pop() ?? filePath,
              artist: common.artist ?? '',
              album: common.album ?? '',
              albumArtist: common.albumartist ?? common.artist ?? '',
              genre,
              trackNo: common.track?.no ?? null,
              durationSeconds: metadata.format.duration ?? 0,
              format,
              albumId,
              fileMtimeMs: mtimeMs
            }).lastInsertRowid
          )

      if (existing) {
        upsertTrack.run({
          filePath,
          title: common.title ?? filePath.split(/[\\/]/).pop() ?? filePath,
          artist: common.artist ?? '',
          album: common.album ?? '',
          albumArtist: common.albumartist ?? common.artist ?? '',
          genre,
          trackNo: common.track?.no ?? null,
          durationSeconds: metadata.format.duration ?? 0,
          format,
          albumId,
          fileMtimeMs: mtimeMs
        })
      }

      const picture = common.picture?.[0]
      if (picture) {
        clearArtForTrack.run(trackId)
        const imagePath = cachePicture(picture)
        upsertArt.run(trackId, imagePath)
      }

      addedOrUpdated++
    } catch (error) {
      console.warn(`Scan: failed to process ${filePath}:`, error)
      failedFiles.push(filePath)
    }
  }

  const allTracks = db.prepare('SELECT id, file_path FROM tracks').all() as {
    id: number
    file_path: string
  }[]

  const deleteTrack = db.prepare('DELETE FROM tracks WHERE id = ?')
  let removed = 0

  // Tracks under a directory we couldn't read (unplugged drive, permission denied) look
  // missing to existsSync but may well still exist — deleting them would silently wipe
  // that part of the library. Leave them alone until the directory is readable again.
  const unreadablePrefixes = unreadableDirs.map((dir) => dir.replace(/[\\/]+$/, '') + sep)

  for (const track of allTracks) {
    if (unreadablePrefixes.some((prefix) => track.file_path.startsWith(prefix))) continue
    if (!existsSync(track.file_path)) {
      deleteTrack.run(track.id)
      removed++
    }
  }

  // Albums left with no tracks (e.g. a file's album/album-artist tag changed between scans,
  // moving it to a different album row) are orphaned and would otherwise linger forever.
  db.prepare(
    `DELETE FROM albums
     WHERE id NOT IN (SELECT DISTINCT album_id FROM tracks WHERE album_id IS NOT NULL)`
  ).run()

  const totalTracks = (
    db.prepare('SELECT COUNT(*) as count FROM tracks').get() as { count: number }
  ).count

  return { addedOrUpdated, removed, totalTracks, failedPaths: [...unreadableDirs, ...failedFiles] }
}
