import { useMemo, useState } from 'react'
import type { Album, Artist, SortMode } from '../../shared/types'
import { compareText } from '../hooks/useTrackSort'
import { artistKey } from '../utils/artists'

interface ArtistViewProps {
  artist: Artist
  albums: Album[]
  sortMode: SortMode
  onSelectAlbum: (albumId: number) => void
}

type AlbumSort = 'alphabetical' | 'release'

const ALBUM_SORT_OPTIONS: { value: AlbumSort; label: string }[] = [
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'release', label: 'Release' }
]

export function ArtistView({ artist, albums, sortMode, onSelectAlbum }: ArtistViewProps) {
  const [albumSort, setAlbumSort] = useState<AlbumSort>('alphabetical')

  const artistAlbums = useMemo(
    () => albums.filter((a) => artistKey(a.albumArtist) === artist.key),
    [albums, artist.key]
  )

  const sortedAlbums = useMemo(() => {
    const sorted = [...artistAlbums]
    if (albumSort === 'release') {
      // Undated albums (no year on any track yet) sort after dated ones, alphabetically
      // among themselves.
      sorted.sort((a, b) => {
        if (a.year === null && b.year === null) return compareText(a.title, b.title, sortMode)
        if (a.year === null) return 1
        if (b.year === null) return -1
        return a.year - b.year
      })
    } else {
      sorted.sort((a, b) => compareText(a.title, b.title, sortMode))
    }
    return sorted
  }, [artistAlbums, albumSort, sortMode])

  const cover = artist.artUrl

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="relative flex flex-shrink-0 items-end gap-6 overflow-hidden px-8 pb-6 pt-10">
        {cover && (
          <>
            <div
              className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl"
              style={{ backgroundImage: `url(${cover})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-surface" />
          </>
        )}
        <div className="relative h-44 w-44 flex-shrink-0 overflow-hidden rounded-full bg-white/10 shadow-2xl">
          {cover && <img src={cover} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="relative min-w-0 flex-1 pb-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-200">Artist</p>
          <h1 className="mt-2 truncate text-4xl font-extrabold tracking-tight text-white">
            {artist.name}
          </h1>
          <p className="mt-3 text-sm text-gray-200">
            {artist.albumCount} album{artist.albumCount === 1 ? '' : 's'} · {artist.trackCount} track
            {artist.trackCount === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center justify-end gap-4 bg-gradient-to-b from-black/10 to-transparent px-8 py-4">
        <div className="flex flex-shrink-0 gap-0.5 rounded-md bg-white/5 p-0.5">
          {ALBUM_SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setAlbumSort(option.value)}
              className={`rounded px-3 py-1.5 text-sm transition-colors ${
                albumSort === option.value
                  ? 'bg-white/10 text-accent'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {sortedAlbums.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-500">
            <p>No albums found for this artist.</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-5">
            {sortedAlbums.map((album) => (
              <button
                key={album.id}
                onClick={() => onSelectAlbum(album.id)}
                className="flex flex-col items-start gap-2 rounded-md p-2 text-left transition-colors hover:bg-white/5"
              >
                <div className="aspect-square w-full overflow-hidden rounded bg-white/5">
                  {album.artUrl && (
                    <img
                      src={album.artUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 w-full">
                  <div className="truncate text-sm font-medium text-gray-200">{album.title}</div>
                  <div className="truncate text-xs text-gray-500">
                    {album.year ? `${album.year} · ` : ''}
                    {album.trackCount} track{album.trackCount === 1 ? '' : 's'}
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
