import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Artist, SortMode } from '../../shared/types'
import { SearchInput } from './SearchInput'
import { compareText } from '../hooks/useTrackSort'

interface ArtistGridViewProps {
  artists: Artist[]
  sortMode: SortMode
  onSelectArtist: (key: string) => void
}

// The view unmounts whenever another tab takes over the content area; keeping the last
// scroll position at module level lets a remount restore it. Session-only, same trick as
// AlbumGridView.
let savedScrollTop = 0

export function ArtistGridView({ artists, sortMode, onSelectArtist }: ArtistGridViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const hasArtists = artists.length > 0
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el && savedScrollTop > 0) el.scrollTop = savedScrollTop
  }, [hasArtists])

  const query = searchQuery.trim().toLowerCase()
  const filteredArtists = useMemo(
    () => (query ? artists.filter((a) => a.name.toLowerCase().includes(query)) : artists),
    [artists, query]
  )

  const sortedArtists = useMemo(
    () => [...filteredArtists].sort((a, b) => compareText(a.name, b.name, sortMode)),
    [filteredArtists, sortMode]
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-4 px-6 py-6">
        <h1 className="flex-shrink-0 text-lg font-semibold">Artists</h1>
        {artists.length > 0 && (
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search artists…" />
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          savedScrollTop = e.currentTarget.scrollTop
        }}
        className="flex-1 overflow-y-auto px-6 pb-6"
      >
        {artists.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-500">
            <p>No artists yet.</p>
            <p className="text-sm">Scan a folder from the Library view to get started.</p>
          </div>
        ) : sortedArtists.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-500">
            <p>No artists match &quot;{searchQuery}&quot;.</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-5">
            {sortedArtists.map((artist) => (
              <button
                key={artist.key}
                onClick={() => onSelectArtist(artist.key)}
                className="flex flex-col items-center gap-2 rounded-md p-2 text-center transition-colors hover:bg-white/5"
              >
                <div className="aspect-square w-full overflow-hidden rounded-full bg-white/5">
                  {artist.artUrl && (
                    <img
                      src={artist.artUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 w-full">
                  <div className="truncate text-sm font-medium text-gray-200">{artist.name}</div>
                  <div className="truncate text-xs text-gray-500">
                    {artist.albumCount} album{artist.albumCount === 1 ? '' : 's'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
