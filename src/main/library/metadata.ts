import { ipcMain } from 'electron'
import type { Database } from 'better-sqlite3'
import { getMusicMetadata } from './musicMetadataLoader'
import type { TrackMetadata } from '../../shared/types'

export function registerMetadataHandlers(db: Database): void {
  ipcMain.handle(
    'library:getTrackMetadata',
    async (_event, trackId: number): Promise<TrackMetadata | null> => {
      const row = db.prepare('SELECT file_path FROM tracks WHERE id = ?').get(trackId) as
        | { file_path: string }
        | undefined
      if (!row) return null

      try {
        const { parseFile } = await getMusicMetadata()
        const metadata = await parseFile(row.file_path)
        const common = metadata.common
        const format = metadata.format

        return {
          title: common.title ?? null,
          artist: common.artist ?? null,
          album: common.album ?? null,
          albumArtist: common.albumartist ?? null,
          trackNo: common.track?.no ?? null,
          trackOf: common.track?.of ?? null,
          discNo: common.disk?.no ?? null,
          discOf: common.disk?.of ?? null,
          year: common.year ?? null,
          genre: common.genre?.length ? common.genre.join(', ') : null,
          composer: common.composer?.length ? common.composer.join(', ') : null,
          durationSeconds: format.duration ?? null,
          container: format.container ?? null,
          codec: format.codec ?? null,
          bitrateKbps: format.bitrate ? Math.round(format.bitrate / 1000) : null,
          sampleRateHz: format.sampleRate ?? null,
          bitsPerSample: format.bitsPerSample ?? null,
          lossless: format.lossless ?? null,
          filePath: row.file_path
        }
      } catch {
        return null
      }
    }
  )
}
