import type { TrackMetadata } from '../../shared/types'
import { formatDuration } from '../utils/format'

function TagRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-gray-500">{label}</span>
      <span className="break-words text-sm text-gray-200">{value}</span>
    </div>
  )
}

function formatTrackPosition(no: number | null, of: number | null): string | null {
  if (no === null) return null
  return of !== null ? `${no} / ${of}` : String(no)
}

export function TrackTagsList({ metadata }: { metadata: TrackMetadata }) {
  return (
    <div className="flex flex-col gap-4">
      <TagRow label="Title" value={metadata.title} />
      <TagRow label="Artist" value={metadata.artist} />
      <TagRow label="Album" value={metadata.album} />
      <TagRow label="Album artist" value={metadata.albumArtist} />
      <TagRow label="Track" value={formatTrackPosition(metadata.trackNo, metadata.trackOf)} />
      <TagRow label="Disc" value={formatTrackPosition(metadata.discNo, metadata.discOf)} />
      <TagRow label="Year" value={metadata.year !== null ? String(metadata.year) : null} />
      <TagRow label="Genre" value={metadata.genre} />
      <TagRow label="Composer" value={metadata.composer} />
      <TagRow
        label="Duration"
        value={metadata.durationSeconds !== null ? formatDuration(metadata.durationSeconds) : null}
      />
    </div>
  )
}
