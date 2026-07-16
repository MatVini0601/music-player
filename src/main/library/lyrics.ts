import { ipcMain } from 'electron'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname } from 'node:path'
import type { Database } from 'better-sqlite3'
import { parseLrc } from './lyricsParser'
import { getMusicMetadata } from './musicMetadataLoader'
import type { LyricsLine, LyricsResult } from '../../shared/types'

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

function toLrcPath(filePath: string): string {
  return filePath.slice(0, -extname(filePath).length) + '.lrc'
}

export function registerLyricsHandlers(db: Database): void {
  ipcMain.handle('lyrics:getForTrack', async (_event, trackId: number): Promise<LyricsResult | null> => {
    const track = db.prepare('SELECT file_path FROM tracks WHERE id = ?').get(trackId) as
      | { file_path: string }
      | undefined
    if (!track) return null

    const cached = db.prepare('SELECT raw_text, is_synced FROM lyrics WHERE track_id = ?').get(trackId) as
      | { raw_text: string; is_synced: number }
      | undefined
    if (cached) {
      return { isSynced: cached.is_synced === 1, lines: JSON.parse(cached.raw_text) as LyricsLine[] }
    }

    let lines: LyricsLine[] | null = null
    let isSynced = false
    let source: 'lrc' | 'embedded' | null = null

    const lrcPath = toLrcPath(track.file_path)
    if (existsSync(lrcPath)) {
      const text = stripBom(await readFile(lrcPath, 'utf-8'))
      const parsed = parseLrc(text)
      if (parsed.length > 0) {
        lines = parsed
        isSynced = true
        source = 'lrc'
      }
    }

    if (!lines) {
      const { parseFile } = await getMusicMetadata()
      const metadata = await parseFile(track.file_path)
      const lyricsTag = metadata.common.lyrics?.find((l) => l.syncText.length > 0) ?? metadata.common.lyrics?.[0]

      if (lyricsTag?.syncText.length) {
        lines = lyricsTag.syncText.map((entry) => ({
          time: (entry.timestamp ?? 0) / 1000,
          text: entry.text ?? ''
        }))
        isSynced = true
        source = 'embedded'
      } else if (lyricsTag?.text) {
        lines = lyricsTag.text
          .split(/\r?\n/)
          .filter((line) => line.trim().length > 0)
          .map((text) => ({ time: null, text }))
        isSynced = false
        source = 'embedded'
      }
    }

    if (!lines || lines.length === 0) return null

    db.prepare(
      'INSERT OR REPLACE INTO lyrics (track_id, source, raw_text, is_synced) VALUES (?, ?, ?, ?)'
    ).run(trackId, source, JSON.stringify(lines), isSynced ? 1 : 0)

    return { isSynced, lines }
  })

  ipcMain.handle(
    'lyrics:setForTrack',
    (_event, trackId: number, text: string): LyricsResult => {
      const parsed = parseLrc(text)
      const isSynced = parsed.length > 0
      const lines: LyricsLine[] = isSynced
        ? parsed
        : text
            .split(/\r?\n/)
            .filter((line) => line.trim().length > 0)
            .map((line) => ({ time: null, text: line }))

      db.prepare(
        'INSERT OR REPLACE INTO lyrics (track_id, source, raw_text, is_synced) VALUES (?, ?, ?, ?)'
      ).run(trackId, 'manual', JSON.stringify(lines), isSynced ? 1 : 0)

      return { isSynced, lines }
    }
  )

  ipcMain.handle('lyrics:clearForTrack', (_event, trackId: number): void => {
    db.prepare('DELETE FROM lyrics WHERE track_id = ?').run(trackId)
  })
}
