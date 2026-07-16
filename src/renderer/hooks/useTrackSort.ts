import { useCallback, useMemo, useState } from 'react'
import type { Track } from '../../shared/types'

export type TrackSortKey = 'title' | 'album' | 'added' | 'duration'
export type TrackSortDirection = 'asc' | 'desc'

/** Sort key for text columns: ignores a leading "The " and the characters . ' ’ - */
function sortableText(value: string): string {
  return value
    .replace(/^\s*the\s+/i, '')
    .replace(/[.'’-]/g, '')
    .trim()
}

function compareText(a: string, b: string): number {
  return sortableText(a).localeCompare(sortableText(b), undefined, { sensitivity: 'base' })
}

function compareTracks(a: Track, b: Track, key: TrackSortKey): number {
  switch (key) {
    case 'title':
      return compareText(a.title, b.title)
    case 'album':
      return compareText(a.album, b.album)
    case 'added':
      // addedAt is "YYYY-MM-DD HH:MM:SS", so plain string comparison is chronological.
      return a.addedAt < b.addedAt ? -1 : a.addedAt > b.addedAt ? 1 : 0
    case 'duration':
      return a.durationSeconds - b.durationSeconds
  }
}

/**
 * Column sorting for track lists. Clicking a column cycles asc → desc → cleared,
 * where cleared falls back to the list's natural order (scan order, playlist
 * position, album track number, …).
 */
export function useTrackSort(tracks: Track[]) {
  const [sortKey, setSortKey] = useState<TrackSortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<TrackSortDirection>('asc')

  const toggleSort = useCallback(
    (key: TrackSortKey) => {
      if (sortKey !== key) {
        setSortKey(key)
        setSortDirection('asc')
      } else if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else {
        setSortKey(null)
      }
    },
    [sortKey, sortDirection]
  )

  const sortedTracks = useMemo(() => {
    if (!sortKey) return tracks
    const sorted = [...tracks].sort((a, b) => compareTracks(a, b, sortKey))
    if (sortDirection === 'desc') sorted.reverse()
    return sorted
  }, [tracks, sortKey, sortDirection])

  return { sortedTracks, sortKey, sortDirection, toggleSort }
}
