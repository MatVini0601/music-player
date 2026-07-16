import { useState } from 'react'
import type { Album } from '../../shared/types'
import { SearchInput } from './SearchInput'

interface AlbumGridViewProps {
  albums: Album[]
  onSelectAlbum: (albumId: number) => void
}

export function AlbumGridView({ albums, onSelectAlbum }: AlbumGridViewProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const query = searchQuery.trim().toLowerCase()
  const filteredAlbums = query
    ? albums.filter(
        (a) =>
          a.title.toLowerCase().includes(query) || a.albumArtist.toLowerCase().includes(query)
      )
    : albums

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-4 px-6 py-6">
        <h1 className="flex-shrink-0 text-lg font-semibold">Albums</h1>
        {albums.length > 0 && (
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search albums…"
          />
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {albums.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-500">
            <p>No albums yet.</p>
            <p className="text-sm">Scan a folder from the Library view to get started.</p>
          </div>
        ) : filteredAlbums.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-500">
            <p>No albums match "{searchQuery}".</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-5">
            {filteredAlbums.map((album) => (
              <button
                key={album.id}
                onClick={() => onSelectAlbum(album.id)}
                className="flex flex-col items-start gap-2 rounded-md p-2 text-left transition-colors hover:bg-white/5"
              >
                <div className="aspect-square w-full overflow-hidden rounded bg-white/5">
                  {album.artUrl && (
                    <img src={album.artUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 w-full">
                  <div className="truncate text-sm font-medium text-gray-200">{album.title}</div>
                  <div className="truncate text-xs text-gray-500">
                    {album.albumArtist || 'Unknown artist'} · {album.trackCount} track
                    {album.trackCount === 1 ? '' : 's'}
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
