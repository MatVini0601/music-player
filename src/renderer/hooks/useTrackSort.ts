import { useCallback, useEffect, useMemo, useState } from 'react'
import type { LibrarySort, SortMode, Track } from '../../shared/types'

export type TrackSortKey = LibrarySort['key']
export type TrackSortDirection = LibrarySort['direction']

/**
 * Sort key for text columns: ignores punctuation/symbols ("(", quotes, *, §, …)
 * and a leading "The ", so e.g. "(Don't Fear) The Reaper" sorts under D.
 * Symbol-only titles ("★", "?") would normalize to nothing, so they keep
 * their original text and group at the top.
 */
function sortableText(value: string): string {
  const stripped = value
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/^\s*the\s+/i, '')
    .trim()
  return stripped || value.trim()
}

function compareText(a: string, b: string, mode: SortMode): number {
  if (mode === 'normal') {
    return a.trim().localeCompare(b.trim(), undefined, { sensitivity: 'base' })
  }
  return sortableText(a).localeCompare(sortableText(b), undefined, { sensitivity: 'base' })
}

function compareTracks(a: Track, b: Track, key: TrackSortKey, mode: SortMode): number {
  switch (key) {
    case 'title':
      return compareText(a.title, b.title, mode)
    case 'album':
      return compareText(a.album, b.album, mode)
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
export function useTrackSort(tracks: Track[], options?: { persisted?: boolean }) {
  const persisted = options?.persisted ?? false
  const [sortKey, setSortKey] = useState<TrackSortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<TrackSortDirection>('asc')
  const [sortMode, setSortMode] = useState<SortMode>('ignoreSpecials')

  // Views mount fresh on navigation, so reading the setting once per mount is enough
  // to pick up changes made in Settings.
  useEffect(() => {
    window.api.getSortMode().then(setSortMode)
  }, [])

  useEffect(() => {
    if (!persisted) return
    window.api.getLibrarySort().then((saved) => {
      if (saved) {
        setSortKey(saved.key)
        setSortDirection(saved.direction)
      }
    })
  }, [persisted])

  const toggleSort = useCallback(
    (key: TrackSortKey) => {
      let next: LibrarySort | null
      if (sortKey !== key) {
        next = { key, direction: 'asc' }
      } else if (sortDirection === 'asc') {
        next = { key, direction: 'desc' }
      } else {
        next = null
      }

      setSortKey(next?.key ?? null)
      setSortDirection(next?.direction ?? 'asc')
      if (persisted) window.api.setLibrarySort(next)
    },
    [sortKey, sortDirection, persisted]
  )

  const sortedTracks = useMemo(() => {
    if (!sortKey) return tracks
    const sorted = [...tracks].sort((a, b) => compareTracks(a, b, sortKey, sortMode))
    if (sortDirection === 'desc') sorted.reverse()
    return sorted
  }, [tracks, sortKey, sortDirection, sortMode])

  return { sortedTracks, sortKey, sortDirection, toggleSort }
}
