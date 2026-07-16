import type { Album, Track } from '../../shared/types'
import { TrackListRow } from './TrackListRow'
import { TrackListHeader } from './TrackListHeader'
import { TrackRowMenu } from './TrackRowMenu'
import { MenuItem } from './MenuItem'

interface HomeViewProps {
  recentAlbums: Album[]
  recentTracks: Track[]
  currentTrack: Track | null
  isPlaying: boolean
  onSelectAlbum: (albumId: number) => void
  onPlayQueue: (tracks: Track[], index: number) => void
  onTogglePlayPause: () => void
  onAddToQueue: (track: Track) => void
  onOpenTrackEq: (track: Track) => void
}

export function HomeView({
  recentAlbums,
  recentTracks,
  currentTrack,
  isPlaying,
  onSelectAlbum,
  onPlayQueue,
  onTogglePlayPause,
  onAddToQueue,
  onOpenTrackEq
}: HomeViewProps) {
  const hasContent = recentAlbums.length > 0 || recentTracks.length > 0

  return (
    <div className="flex h-full flex-col overflow-y-auto px-6 py-6">
      <h1 className="text-lg font-semibold">Home</h1>

      {!hasContent ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-gray-500">
          <p>Nothing played yet.</p>
          <p className="text-sm">Play a track from your Library to see it show up here.</p>
        </div>
      ) : (
        <>
          {recentAlbums.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Recently played albums
              </h2>
              <div className="rounded-lg bg-surface-raised p-4 shadow-lg">
                <div className="grid grid-cols-3 gap-4">
                  {recentAlbums.map((album) => (
                    <button
                      key={album.id}
                      onClick={() => onSelectAlbum(album.id)}
                      className="flex items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-black/20"
                    >
                      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded bg-black/20 shadow-md">
                        {album.artUrl && (
                          <img
                            src={album.artUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-gray-200">
                          {album.title}
                        </div>
                        <div className="truncate text-xs text-gray-500">
                          {album.albumArtist || 'Unknown artist'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {recentTracks.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Recently played
              </h2>
              <TrackListHeader />
              <div className="flex flex-col gap-1">
                {recentTracks.map((track, index) => (
                  <TrackListRow
                    key={track.id}
                    track={track}
                    index={index + 1}
                    isActive={currentTrack?.id === track.id}
                    isPlaying={isPlaying}
                    onPlay={() => onPlayQueue(recentTracks, index)}
                    onTogglePlayPause={onTogglePlayPause}
                    actions={
                      <TrackRowMenu>
                        {(close) => (
                          <>
                            <MenuItem
                              onClick={() => {
                                onAddToQueue(track)
                                close()
                              }}
                            >
                              Add to queue
                            </MenuItem>
                            <MenuItem
                              onClick={() => {
                                onOpenTrackEq(track)
                                close()
                              }}
                            >
                              Equalizer
                            </MenuItem>
                          </>
                        )}
                      </TrackRowMenu>
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
