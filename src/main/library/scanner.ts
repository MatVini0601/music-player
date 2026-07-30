import { access, readdir, stat } from 'node:fs/promises'
import { join, extname, sep } from 'node:path'
import type { Database } from 'better-sqlite3'
import type { IPicture } from 'music-metadata'
import { cachePicture } from './artCache'
import { getMusicMetadata } from './musicMetadataLoader'
import type { ScanProgress, ScanResult } from '../../shared/types'

/** Tag data parsed from one file, buffered until the next chunked transaction flush. */
interface ParsedTrack {
  filePath: string
  existingId: number | null
  mtimeMs: number
  title: string
  artist: string
  album: string
  albumArtist: string
  genre: string
  /** 0 = confirmed no year tag, a real year otherwise. Never null once parsed. */
  year: number
  trackNo: number | null
  durationSeconds: number
  format: string
  picture: IPicture | undefined
}

type ParseFileFn = Awaited<ReturnType<typeof getMusicMetadata>>['parseFile']

/** How many parsed files get written per transaction. Parsing (the slow, async part) stays
 *  outside the transaction so IPC writes from the rest of the app can't interleave into it. */
const SCAN_CHUNK_SIZE = 50

/** Files parsed (and existence-checked) concurrently. Parsing is I/O-bound, so a modest
 *  pool cuts cold-scan wall time severalfold without saturating slower disks. */
const SCAN_CONCURRENCY = 8

/** Progress IPC is throttled to this interval — per-file messages made the renderer
 *  re-render for every one of thousands of files during a scan. */
const PROGRESS_INTERVAL_MS = 250

// Limited to formats Chromium's <audio> element can actually decode natively — this app
// has no transcoding layer, so anything else would scan into the library but fail to play.
export const SUPPORTED_EXTENSIONS = new Set([
  '.mp3',
  '.flac',
  '.m4a',
  '.m4b',
  '.aac',
  '.wav',
  '.ogg',
  '.opus',
  '.webm'
])

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

/** Albums left with no tracks (e.g. a file's album/album-artist tag changed between scans,
 *  moving it to a different album row, or its last track was removed) are orphaned and
 *  would otherwise linger forever. */
export function deleteOrphanedAlbums(db: Database): void {
  db.prepare(
    `DELETE FROM albums
     WHERE id NOT IN (SELECT DISTINCT album_id FROM tracks WHERE album_id IS NOT NULL)`
  ).run()
}

/** Shared tag-parsing and DB-write logic used by both a full library scan and a targeted
 *  rescan of a handful of paths (e.g. from the live filesystem watcher). */
function createTrackWriter(db: Database): {
  parseOne(filePath: string, parseFile: ParseFileFn): Promise<ParsedTrack | null>
  writeBatch(items: ParsedTrack[]): void
  removeByPath(filePath: string): boolean
} {
  const upsertTrack = db.prepare(`
    INSERT INTO tracks (file_path, title, artist, album, album_artist, genre, year, track_no, duration_seconds, format, album_id, file_mtime_ms, last_scanned_at, added_at)
    VALUES (@filePath, @title, @artist, @album, @albumArtist, @genre, @year, @trackNo, @durationSeconds, @format, @albumId, @fileMtimeMs, datetime('now'), datetime('now'))
    ON CONFLICT(file_path) DO UPDATE SET
      title = excluded.title,
      artist = excluded.artist,
      album = excluded.album,
      album_artist = excluded.album_artist,
      genre = excluded.genre,
      year = excluded.year,
      track_no = excluded.track_no,
      duration_seconds = excluded.duration_seconds,
      format = excluded.format,
      album_id = excluded.album_id,
      file_mtime_ms = excluded.file_mtime_ms,
      last_scanned_at = datetime('now')
  `)

  const getExisting = db.prepare(
    'SELECT id, file_mtime_ms, genre, year FROM tracks WHERE file_path = ?'
  )

  const upsertArt = db.prepare(`
    INSERT INTO art_cache (track_id, image_path) VALUES (?, ?)
  `)

  const clearArtForTrack = db.prepare('DELETE FROM art_cache WHERE track_id = ?')
  const deleteTrackByPath = db.prepare('DELETE FROM tracks WHERE file_path = ?')

  const writeBatch = db.transaction((items: ParsedTrack[]) => {
    for (const item of items) {
      const albumId = findOrCreateAlbum(db, item.album, item.albumArtist)
      const result = upsertTrack.run({
        filePath: item.filePath,
        title: item.title,
        artist: item.artist,
        album: item.album,
        albumArtist: item.albumArtist,
        genre: item.genre,
        year: item.year,
        trackNo: item.trackNo,
        durationSeconds: item.durationSeconds,
        format: item.format,
        albumId,
        fileMtimeMs: item.mtimeMs
      })
      const trackId = item.existingId ?? Number(result.lastInsertRowid)

      if (item.picture) {
        clearArtForTrack.run(trackId)
        upsertArt.run(trackId, cachePicture(item.picture))
      }
    }
  })

  async function parseOne(filePath: string, parseFile: ParseFileFn): Promise<ParsedTrack | null> {
    const fileStat = await stat(filePath)
    const mtimeMs = Math.floor(fileStat.mtimeMs)

    const existing = getExisting.get(filePath) as
      | { id: number; file_mtime_ms: number; genre: string | null; year: number | null }
      | undefined

    // genre/year === null means the track was scanned before that column existed;
    // re-read its tags once even though the file itself hasn't changed.
    if (
      existing &&
      existing.file_mtime_ms === mtimeMs &&
      existing.genre !== null &&
      existing.year !== null
    ) {
      return null
    }

    const metadata = await parseFile(filePath)
    const common = metadata.common

    return {
      filePath,
      existingId: existing?.id ?? null,
      mtimeMs,
      title: common.title ?? filePath.split(/[\\/]/).pop() ?? filePath,
      artist: common.artist ?? '',
      album: common.album ?? '',
      albumArtist: common.albumartist ?? common.artist ?? '',
      genre: common.genre?.length ? common.genre.join(', ') : '',
      year: common.year ?? 0,
      trackNo: common.track?.no ?? null,
      durationSeconds: metadata.format.duration ?? 0,
      format: extname(filePath).toLowerCase().slice(1),
      picture: common.picture?.[0]
    }
  }

  function removeByPath(filePath: string): boolean {
    return deleteTrackByPath.run(filePath).changes > 0
  }

  return { parseOne, writeBatch, removeByPath }
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT'
}

/** Rescans a small, explicit set of paths (e.g. changed files reported by the live library
 *  watcher) — no directory walk and no whole-library missing-file sweep, so its cost is
 *  proportional to the batch size, not the library size. */
export async function scanPaths(
  db: Database,
  paths: string[]
): Promise<{ upserted: number; removed: number }> {
  if (paths.length === 0) return { upserted: 0, removed: 0 }

  const writer = createTrackWriter(db)
  const { parseFile } = await getMusicMetadata()

  const items: ParsedTrack[] = []
  let removed = 0

  for (const filePath of paths) {
    try {
      const item = await writer.parseOne(filePath, parseFile)
      if (item) items.push(item)
    } catch (error) {
      if (isNotFoundError(error)) {
        if (writer.removeByPath(filePath)) removed++
      } else {
        console.warn(`Watcher: failed to process ${filePath}:`, error)
      }
    }
  }

  if (items.length > 0) writer.writeBatch(items)
  if (removed > 0) deleteOrphanedAlbums(db)

  return { upserted: items.length, removed }
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

  const writer = createTrackWriter(db)

  let addedOrUpdated = 0
  const pending: ParsedTrack[] = []

  const flushPending = (): void => {
    if (pending.length === 0) return
    const items = pending.splice(0, pending.length)
    try {
      writer.writeBatch(items)
      addedOrUpdated += items.length
    } catch (error) {
      console.warn('Scan: failed to write chunk to database:', error)
      failedFiles.push(...items.map((item) => item.filePath))
    }
  }

  const { parseFile } = await getMusicMetadata()

  let processed = 0
  let lastProgressAt = 0
  const reportProgress = (currentFile: string): void => {
    const now = Date.now()
    if (processed < allFiles.length && now - lastProgressAt < PROGRESS_INTERVAL_MS) return
    lastProgressAt = now
    onProgress({ scanned: processed, total: allFiles.length, currentFile })
  }

  // A small pool of workers pulls from a shared cursor. Everything that touches shared
  // state (pending, the DB, the counters) is synchronous, so the workers can't race —
  // only the file I/O (stat/parseFile) actually overlaps.
  let nextFileIndex = 0
  const parseWorker = async (): Promise<void> => {
    while (nextFileIndex < allFiles.length) {
      const filePath = allFiles[nextFileIndex++]

      // A single unreadable or corrupt file must not abort the whole scan — skip it and
      // report it in the result instead.
      try {
        const item = await writer.parseOne(filePath, parseFile)
        if (item) {
          pending.push(item)
          if (pending.length >= SCAN_CHUNK_SIZE) flushPending()
        }
      } catch (error) {
        console.warn(`Scan: failed to process ${filePath}:`, error)
        failedFiles.push(filePath)
      }

      processed++
      reportProgress(filePath)
    }
  }

  await Promise.all(Array.from({ length: SCAN_CONCURRENCY }, parseWorker))
  flushPending()

  const allTracks = db.prepare('SELECT id, file_path FROM tracks').all() as {
    id: number
    file_path: string
  }[]

  // Tracks under a directory we couldn't read (unplugged drive, permission denied) look
  // missing but may well still exist — deleting them would silently wipe that part of
  // the library. Leave them alone until the directory is readable again.
  const unreadablePrefixes = unreadableDirs.map((dir) => dir.replace(/[\\/]+$/, '') + sep)

  // Async existence checks: the old sync loop stat'ed every library file back to back on
  // the main process, which could freeze all IPC for seconds on a slow or waking disk.
  const missingIds: number[] = []
  let nextTrackIndex = 0
  const checkWorker = async (): Promise<void> => {
    while (nextTrackIndex < allTracks.length) {
      const track = allTracks[nextTrackIndex++]
      if (unreadablePrefixes.some((prefix) => track.file_path.startsWith(prefix))) continue
      try {
        await access(track.file_path)
      } catch {
        missingIds.push(track.id)
      }
    }
  }
  await Promise.all(Array.from({ length: SCAN_CONCURRENCY }, checkWorker))

  const deleteTrack = db.prepare('DELETE FROM tracks WHERE id = ?')
  const deleteMissing = db.transaction((ids: number[]) => {
    for (const id of ids) deleteTrack.run(id)
  })
  if (missingIds.length > 0) deleteMissing(missingIds)
  const removed = missingIds.length

  deleteOrphanedAlbums(db)

  const totalTracks = (
    db.prepare('SELECT COUNT(*) as count FROM tracks').get() as { count: number }
  ).count

  return { addedOrUpdated, removed, totalTracks, failedPaths: [...unreadableDirs, ...failedFiles] }
}
