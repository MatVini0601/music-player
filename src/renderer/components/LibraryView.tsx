import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { Playlist, Track } from '../../shared/types'
import { TrackListRow } from './TrackListRow'
import { TrackListHeader } from './TrackListHeader'
import { LibraryTrackMenu } from './LibraryTrackMenu'
import { SearchInput } from './SearchInput'
import { useTrackSort } from '../hooks/useTrackSort'

interface LibraryViewProps {
  tracks: Track[]
  currentTrack: Track | null
  isPlaying: boolean
  isScanning: boolean
  scanLabel: string | null
  scanFailedPaths: string[]
  hasLibraryRoots: boolean
  playlists: Playlist[]
  onPickFolder: () => void
  onRescan: () => void
  onPlayQueue: (tracks: Track[], index: number) => void
  onTogglePlayPause: () => void
  onAddToQueue: (track: Track) => void
  onOpenTrackEq: (track: Track) => void
  onAddTrackToExistingPlaylist: (playlistId: number, trackId: number) => void
  onCreatePlaylistAndAddTrack: (name: string, trackId: number) => void
}

export function LibraryView({
  tracks,
  currentTrack,
  isPlaying,
  isScanning,
  scanLabel,
  scanFailedPaths,
  hasLibraryRoots,
  playlists,
  onPickFolder,
  onRescan,
  onPlayQueue,
  onTogglePlayPause,
  onAddToQueue,
  onOpenTrackEq,
  onAddTrackToExistingPlaylist,
  onCreatePlaylistAndAddTrack
}: LibraryViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const { sortedTracks, sortKey, sortDirection, toggleSort } = useTrackSort(tracks)

  const query = searchQuery.trim().toLowerCase()
  const filteredTracks = query
    ? sortedTracks.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.artist.toLowerCase().includes(query) ||
          t.album.toLowerCase().includes(query)
      )
    : sortedTracks

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-4 px-6 py-6">
        <h1 className="flex-shrink-0 text-lg font-semibold">Library</h1>
        <div className="flex items-center gap-4">
          {tracks.length > 0 && <SearchInput value={searchQuery} onChange={setSearchQuery} />}
          {isScanning && (
            <span className="text-xs text-gray-500">{scanLabel ?? 'Scanning…'}</span>
          )}
          {!isScanning && scanFailedPaths.length > 0 && (
            <span
              className="cursor-help text-xs text-amber-500"
              title={
                scanFailedPaths.slice(0, 20).join('\n') +
                (scanFailedPaths.length > 20 ? `\n…and ${scanFailedPaths.length - 20} more` : '')
              }
            >
              {scanFailedPaths.length} {scanFailedPaths.length === 1 ? 'item' : 'items'} couldn't be
              read
            </span>
          )}
          {hasLibraryRoots && (
            <button
              onClick={onRescan}
              disabled={isScanning}
              title="Rescan"
              aria-label="Rescan library"
              className="text-gray-400 transition-colors hover:text-white disabled:opacity-40"
            >
              <RefreshCw size={16} className={isScanning ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {tracks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-500">
            <p>No tracks yet.</p>
            <p className="text-sm">Add a folder with MP3 or FLAC files to get started.</p>
            <button
              onClick={onPickFolder}
              disabled={isScanning}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Add Folder
            </button>
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-500">
            <p>No tracks match "{searchQuery}".</p>
          </div>
        ) : (
          <>
            <TrackListHeader
              dateLabel="Date uploaded"
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={toggleSort}
            />
            <div className="flex flex-col gap-1">
              {filteredTracks.map((track, index) => (
                <TrackListRow
                  key={track.id}
                  track={track}
                  index={index + 1}
                  isActive={currentTrack?.id === track.id}
                  isPlaying={isPlaying}
                  onPlay={() => onPlayQueue(sortedTracks, sortedTracks.indexOf(track))}
                  onTogglePlayPause={onTogglePlayPause}
                  actions={
                    <LibraryTrackMenu
                      playlists={playlists}
                      onAddToQueue={() => onAddToQueue(track)}
                      onOpenEqualizer={() => onOpenTrackEq(track)}
                      onAddToExistingPlaylist={(playlistId) =>
                        onAddTrackToExistingPlaylist(playlistId, track.id)
                      }
                      onCreatePlaylistAndAdd={(name) => onCreatePlaylistAndAddTrack(name, track.id)}
                    />
                  }
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
