import { useEffect, useState } from 'react'
import type { Album, Track } from '../../shared/types'
import { useTrackSort } from '../hooks/useTrackSort'
import { TrackListRow } from './TrackListRow'
import { TrackListHeader } from './TrackListHeader'
import { CoverMenu } from './CoverMenu'
import { TrackRowMenu } from './TrackRowMenu'
import { MenuItem } from './MenuItem'

interface AlbumViewProps {
  album: Album
  currentTrack: Track | null
  isPlaying: boolean
  onPlayQueue: (tracks: Track[], index: number) => void
  onTogglePlayPause: () => void
  onAddToQueue: (track: Track) => void
  onOpenTrackEq: (track: Track) => void
  onAlbumArtChanged: () => void
}

export function AlbumView({
  album,
  currentTrack,
  isPlaying,
  onPlayQueue,
  onTogglePlayPause,
  onAddToQueue,
  onOpenTrackEq,
  onAlbumArtChanged
}: AlbumViewProps) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [coverArt, setCoverArt] = useState(album.artDataUrl)
  const { sortedTracks, sortKey, sortDirection, toggleSort } = useTrackSort(tracks)

  useEffect(() => {
    window.api.getAlbumTracks(album.id).then(setTracks)
    setCoverArt(album.artDataUrl)
  }, [album.id, album.artDataUrl])

  const changeCover = async (): Promise<void> => {
    const newArt = await window.api.setAlbumArt(album.id)
    if (newArt) {
      setCoverArt(newArt)
      onAlbumArtChanged()
    }
  }

  const clearCover = async (): Promise<void> => {
    await window.api.clearAlbumArt(album.id)
    onAlbumArtChanged()
  }

  const setTrackArt = async (trackId: number): Promise<void> => {
    const newArt = await window.api.setTrackArt(trackId)
    if (newArt) {
      setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, artDataUrl: newArt } : t)))
    }
  }

  const clearTrackArt = async (trackId: number): Promise<void> => {
    await window.api.clearTrackArt(trackId)
    window.api.getAlbumTracks(album.id).then(setTracks)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-4 px-6 py-6">
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-white/5">
          {coverArt && <img src={coverArt} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{album.title}</h1>
          <p className="truncate text-sm text-gray-500">{album.albumArtist || 'Unknown artist'}</p>
        </div>
        <CoverMenu hasCover={!!coverArt} onChangeCover={changeCover} onRemoveCover={clearCover} />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {tracks.length > 0 && (
          <TrackListHeader sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
        )}
        <div className="flex flex-col gap-1">
          {sortedTracks.map((track, index) => (
            <TrackListRow
              key={track.id}
              track={track}
              index={index + 1}
              isActive={currentTrack?.id === track.id}
              isPlaying={isPlaying}
              onPlay={() => onPlayQueue(sortedTracks, index)}
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
                      <MenuItem
                        onClick={() => {
                          setTrackArt(track.id)
                          close()
                        }}
                      >
                        Set cover
                      </MenuItem>
                      <MenuItem
                        danger
                        disabled={!track.artDataUrl}
                        onClick={() => {
                          clearTrackArt(track.id)
                          close()
                        }}
                      >
                        Clear cover
                      </MenuItem>
                    </>
                  )}
                </TrackRowMenu>
              }
            />
          ))}
        </div>
      </div>
    </div>
  )
}
