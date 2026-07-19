import { dialog, ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import type { Database } from 'better-sqlite3'
import type { EqBand, EqExportResult, EqImportResult } from '../../shared/types'

/**
 * Export/import of equalizer settings (global + per-track) as a JSON file, so a user
 * can carry them to another machine. track_id is a local autoincrement and file paths
 * can differ between PCs, so entries carry both the path and the track's tags; import
 * matches by exact path first, then falls back to title+artist+album (+duration guard).
 */

const EXPORT_TYPE = 'fermata-eq'
const EXPORT_VERSION = 1

/** Re-encoding or container differences shift duration slightly; same song stays within this. */
const DURATION_TOLERANCE_SECONDS = 2

interface EqExportEntry {
  filePath: string
  title: string
  artist: string
  album: string
  durationSeconds: number
  bands: EqBand[]
}

interface EqExportFile {
  type: typeof EXPORT_TYPE
  version: number
  exportedAt: string
  globalEq: EqBand[] | null
  tracks: EqExportEntry[]
}

const isValidBands = (value: unknown): value is EqBand[] =>
  Array.isArray(value) &&
  value.length === 10 &&
  value.every(
    (b) =>
      b &&
      typeof b.frequency === 'number' &&
      typeof b.q === 'number' &&
      typeof b.gain === 'number'
  )

export function registerEqTransferHandlers(
  db: Database,
  getWindow: () => BrowserWindow | null
): void {
  ipcMain.handle('eq:export', async (): Promise<EqExportResult> => {
    const window = getWindow()
    if (!window) return { status: 'canceled' }

    const rows = db
      .prepare(
        `SELECT te.bands, t.file_path, t.title, t.artist, t.album, t.duration_seconds
         FROM track_eq te
         JOIN tracks t ON t.id = te.track_id`
      )
      .all() as {
      bands: string
      file_path: string
      title: string
      artist: string
      album: string
      duration_seconds: number
    }[]

    const tracks: EqExportEntry[] = []
    for (const row of rows) {
      try {
        const bands = JSON.parse(row.bands)
        if (isValidBands(bands)) {
          tracks.push({
            filePath: row.file_path,
            title: row.title,
            artist: row.artist,
            album: row.album,
            durationSeconds: row.duration_seconds,
            bands
          })
        }
      } catch {
        // corrupt row — leave it out of the export
      }
    }

    let globalEq: EqBand[] | null = null
    const globalRow = db.prepare("SELECT value FROM settings WHERE key = 'eqBands'").get() as
      | { value: string }
      | undefined
    if (globalRow) {
      try {
        const parsed = JSON.parse(globalRow.value)
        if (isValidBands(parsed)) globalEq = parsed
      } catch {
        // unreadable global EQ — export without it
      }
    }

    const result = await dialog.showSaveDialog(window, {
      title: 'Export equalizer settings',
      defaultPath: 'fermata-eq.json',
      filters: [{ name: 'Fermata EQ export', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return { status: 'canceled' }

    const payload: EqExportFile = {
      type: EXPORT_TYPE,
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      globalEq,
      tracks
    }
    await writeFile(result.filePath, JSON.stringify(payload, null, 2), 'utf8')
    return { status: 'saved', filePath: result.filePath, trackCount: tracks.length }
  })

  ipcMain.handle('eq:import', async (): Promise<EqImportResult> => {
    const window = getWindow()
    if (!window) return { status: 'canceled' }

    const picked = await dialog.showOpenDialog(window, {
      title: 'Import equalizer settings',
      filters: [{ name: 'Fermata EQ export', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (picked.canceled || picked.filePaths.length === 0) return { status: 'canceled' }

    let parsed: unknown
    try {
      parsed = JSON.parse(await readFile(picked.filePaths[0], 'utf8'))
    } catch {
      return { status: 'error', message: 'The file could not be read as JSON.' }
    }

    const file = parsed as Partial<EqExportFile> | null
    if (!file || file.type !== EXPORT_TYPE || !Array.isArray(file.tracks)) {
      return { status: 'error', message: 'This is not a Fermata EQ export file.' }
    }

    const byPath = db.prepare('SELECT id FROM tracks WHERE file_path = ? COLLATE NOCASE')
    const byTags = db.prepare(
      `SELECT id, duration_seconds FROM tracks
       WHERE title = ? COLLATE NOCASE AND artist = ? COLLATE NOCASE AND album = ? COLLATE NOCASE`
    )

    // Later entries win on collision (e.g. two exported duplicates matching one track here).
    const bandsByTrackId = new Map<number, EqBand[]>()
    let matchedEntries = 0

    for (const entry of file.tracks) {
      const e = entry as Partial<EqExportEntry> | null
      if (!e || !isValidBands(e.bands)) continue

      let ids: number[] = []
      if (typeof e.filePath === 'string' && e.filePath) {
        ids = (byPath.all(e.filePath) as { id: number }[]).map((r) => r.id)
      }
      if (ids.length === 0 && typeof e.title === 'string') {
        const candidates = byTags.all(
          e.title,
          typeof e.artist === 'string' ? e.artist : '',
          typeof e.album === 'string' ? e.album : ''
        ) as { id: number; duration_seconds: number }[]
        ids = candidates
          .filter(
            (c) =>
              typeof e.durationSeconds !== 'number' ||
              !Number.isFinite(e.durationSeconds) ||
              Math.abs(c.duration_seconds - e.durationSeconds) <= DURATION_TOLERANCE_SECONDS
          )
          .map((c) => c.id)
      }

      if (ids.length > 0) {
        matchedEntries++
        for (const id of ids) bandsByTrackId.set(id, e.bands)
      }
    }

    const upsertTrackEq = db.prepare(
      'INSERT INTO track_eq (track_id, bands) VALUES (?, ?) ON CONFLICT(track_id) DO UPDATE SET bands = excluded.bands'
    )
    const upsertGlobal = db.prepare(
      "INSERT INTO settings (key, value) VALUES ('eqBands', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )

    const globalEq = isValidBands(file.globalEq) ? file.globalEq : null
    const applyAll = db.transaction(() => {
      for (const [trackId, bands] of bandsByTrackId) {
        upsertTrackEq.run(trackId, JSON.stringify(bands))
      }
      if (globalEq) upsertGlobal.run(JSON.stringify(globalEq))
    })
    applyAll()

    return {
      status: 'imported',
      totalEntries: file.tracks.length,
      matchedEntries,
      appliedTracks: bandsByTrackId.size,
      globalApplied: globalEq !== null
    }
  })
}
