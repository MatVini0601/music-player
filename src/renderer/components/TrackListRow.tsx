import { Pause, Play } from 'lucide-react'
import type { DragEvent, ReactNode } from 'react'
import type { Track } from '../../shared/types'
import { formatDateAdded, formatDuration } from '../utils/format'
import { TRACK_GRID_COLS } from '../utils/trackListGrid'

interface TrackListRowProps {
  track: Track
  index: number
  isActive: boolean
  isPlaying: boolean
  onPlay: () => void
  onTogglePlayPause?: () => void
  onSelectAlbum?: (albumId: number) => void
  actions: ReactNode
  draggable?: boolean
  isDragging?: boolean
  onDragStartRow?: (e: DragEvent<HTMLDivElement>) => void
  onDragOverRow?: (e: DragEvent<HTMLDivElement>) => void
  onDropRow?: (e: DragEvent<HTMLDivElement>) => void
  onDragEndRow?: () => void
}

export function TrackListRow({
  track,
  index,
  isActive,
  isPlaying,
  onPlay,
  onTogglePlayPause,
  onSelectAlbum,
  actions,
  draggable = false,
  isDragging = false,
  onDragStartRow,
  onDragOverRow,
  onDropRow,
  onDragEndRow
}: TrackListRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onDoubleClick={onPlay}
      onClick={onPlay}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onPlay()
      }}
      draggable={draggable}
      onDragStart={onDragStartRow}
      onDragOver={onDragOverRow}
      onDrop={onDropRow}
      onDragEnd={onDragEndRow}
      className={`group grid w-full grid-rows-[auto_auto] ${TRACK_GRID_COLS} select-none items-center gap-x-4 rounded-md px-3 py-2 text-left transition-colors ${
        isActive ? 'bg-accent/10 text-accent hover:bg-accent/15' : 'text-gray-200 hover:bg-white/5'
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="relative col-start-1 row-span-2 flex h-8 w-8 items-center justify-center self-center">
        <span
          className={`text-sm text-gray-500 transition-opacity group-hover:opacity-0 ${
            isActive && isPlaying ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {index}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            // Re-playing the already-active track is a no-op, so the visible
            // pause icon must toggle playback instead.
            if (isActive && onTogglePlayPause) onTogglePlayPause()
            else onPlay()
          }}
          className={`absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 ${
            isActive && isPlaying ? '!opacity-100' : ''
          }`}
          aria-label={isActive && isPlaying ? 'Pause' : 'Play'}
        >
          {isActive && isPlaying ? (
            <Pause size={14} fill="currentColor" />
          ) : (
            <Play size={14} fill="currentColor" />
          )}
        </button>
      </div>

      <div className="col-start-2 row-span-2 h-10 w-10 self-center overflow-hidden rounded bg-white/5">
        {track.artUrl && (
          <img
            src={track.artUrl}
            alt=""
            loading="lazy"
            draggable={false}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="col-start-3 row-start-1 min-w-0 truncate text-sm font-medium">
        {track.title}
      </div>
      <div className="col-start-3 row-start-2 min-w-0 truncate text-xs text-gray-500">
        {track.artist || 'Unknown artist'}
      </div>

      <div className="col-start-4 row-start-1 min-w-0 text-sm text-gray-500">
        {onSelectAlbum && track.albumId ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSelectAlbum(track.albumId as number)
            }}
            className="block w-full truncate text-left hover:text-white hover:underline"
          >
            {track.album}
          </button>
        ) : (
          <span className="block truncate">{track.album}</span>
        )}
      </div>

      <div className="col-start-5 row-start-1 min-w-0 truncate text-sm text-gray-500">
        {formatDateAdded(track.addedAt)}
      </div>

      <div className="col-start-6 row-start-1 text-right text-sm text-gray-500">
        {formatDuration(track.durationSeconds)}
      </div>

      <div className="col-start-7 row-start-1 flex items-center gap-2">{actions}</div>
    </div>
  )
}
