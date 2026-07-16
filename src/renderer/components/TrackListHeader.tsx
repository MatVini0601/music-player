import { ChevronDown, ChevronUp } from 'lucide-react'
import { TRACK_GRID_COLS } from '../utils/trackListGrid'
import type { TrackSortDirection, TrackSortKey } from '../hooks/useTrackSort'

interface TrackListHeaderProps {
  dateLabel?: string
  sortKey?: TrackSortKey | null
  sortDirection?: TrackSortDirection
  onSort?: (key: TrackSortKey) => void
}

interface SortableLabelProps {
  label: string
  columnKey: TrackSortKey
  sortKey: TrackSortKey | null
  sortDirection: TrackSortDirection
  onSort: (key: TrackSortKey) => void
  alignRight?: boolean
}

function SortableLabel({
  label,
  columnKey,
  sortKey,
  sortDirection,
  onSort,
  alignRight = false
}: SortableLabelProps) {
  const isActive = sortKey === columnKey

  return (
    <button
      onClick={() => onSort(columnKey)}
      className={`flex min-w-0 items-center gap-1 transition-colors hover:text-white ${
        alignRight ? 'justify-end' : ''
      } ${isActive ? 'text-accent' : ''}`}
      title={`Sort by ${label.toLowerCase()}`}
    >
      <span className="truncate">{label}</span>
      {isActive &&
        (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
    </button>
  )
}

export function TrackListHeader({
  dateLabel = 'Date added',
  sortKey = null,
  sortDirection = 'asc',
  onSort
}: TrackListHeaderProps) {
  return (
    <div className={`grid w-full ${TRACK_GRID_COLS} gap-x-4 px-3 pb-2 text-xs text-gray-500`}>
      <div className="text-center">#</div>
      <div />
      {onSort ? (
        <>
          <SortableLabel
            label="Title"
            columnKey="title"
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={onSort}
          />
          <SortableLabel
            label="Album"
            columnKey="album"
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={onSort}
          />
          <SortableLabel
            label={dateLabel}
            columnKey="added"
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={onSort}
          />
          <SortableLabel
            label="Duration"
            columnKey="duration"
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={onSort}
            alignRight
          />
        </>
      ) : (
        <>
          <div className="min-w-0">Title</div>
          <div className="min-w-0">Album</div>
          <div className="min-w-0">{dateLabel}</div>
          <div className="text-right">Duration</div>
        </>
      )}
      <div />
    </div>
  )
}
