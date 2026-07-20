import { useEffect, useState } from 'react'
import { Play } from 'lucide-react'
import type { DragEvent } from 'react'
import type { Playlist, Track } from '../../shared/types'
import { TrackListRow } from './TrackListRow'
import { TrackListHeader } from './TrackListHeader'
import { CoverMenu } from './CoverMenu'
import { TrackRowMenu } from './TrackRowMenu'
import { MenuItem } from './MenuItem'
import { SearchInput } from './SearchInput'
import { useTrackSort } from '../hooks/useTrackSort'
import { formatTotalDuration } from '../utils/format'

interface PlaylistViewProps {
  playlist: Playlist
  currentTrack: Track | null
  isPlaying: boolean
  onPlayQueue: (tracks: Track[], index: number) => void
  onTogglePlayPause: () => void
  onSelectAlbum: (albumId: number) => void
  onAddToQueue: (track: Track) => void
  onOpenTrackEq: (track: Track) => void
  onSetDescription: (id: number, description: string) => void
  onArtChanged: () => void
}

export function PlaylistView({
  playlist,
  currentTrack,
  isPlaying,
  onPlayQueue,
  onTogglePlayPause,
  onSelectAlbum,
  onAddToQueue,
  onOpenTrackEq,
  onSetDescription,
  onArtChanged
}: PlaylistViewProps) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState(playlist.description ?? '')
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const { sortedTracks, sortKey, sortDirection, toggleSort } = useTrackSort(tracks)

  const query = searchQuery.trim().toLowerCase()
  const isSearching = query.length > 0
  // Manual drag-reordering only makes sense when the list is shown in its stored
  // playlist order — searching or sorting both present a different order.
  const canReorder = !isSearching && sortKey === null
  const filteredTracks = isSearching
    ? sortedTracks.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.artist.toLowerCase().includes(query) ||
          t.album.toLowerCase().includes(query)
      )
    : sortedTracks

  useEffect(() => {
    window.api.getPlaylistTracks(playlist.id).then(setTracks)
  }, [playlist.id])

  useEffect(() => {
    setDescriptionDraft(playlist.description ?? '')
  }, [playlist.id, playlist.description])

  const removeTrack = async (trackId: number): Promise<void> => {
    await window.api.removeTrackFromPlaylist(playlist.id, trackId)
    setTracks((prev) => prev.filter((t) => t.id !== trackId))
  }

  const reorder = async (fromIndex: number, toIndex: number): Promise<void> => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= tracks.length) return

    const next = [...tracks]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    setTracks(next)

    await window.api.reorderPlaylistTracks(
      playlist.id,
      next.map((t) => t.id)
    )
  }

  const submitDescription = (): void => {
    onSetDescription(playlist.id, descriptionDraft.trim())
    setIsEditingDescription(false)
  }

  const changeCover = async (): Promise<void> => {
    const newArt = await window.api.setPlaylistArt(playlist.id)
    if (newArt) onArtChanged()
  }

  const clearCover = async (): Promise<void> => {
    await window.api.clearPlaylistArt(playlist.id)
    onArtChanged()
  }

  const cover = playlist.artUrl
  const totalSeconds = tracks.reduce((sum, t) => sum + t.durationSeconds, 0)

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
        <div className="relative h-44 w-44 flex-shrink-0 overflow-hidden rounded bg-white/10 shadow-2xl">
          {cover && <img src={cover} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="relative min-w-0 flex-1 pb-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-200">Playlist</p>
          <h1 className="mt-2 truncate text-4xl font-extrabold tracking-tight text-white">
            {playlist.name}
          </h1>
          {isEditingDescription ? (
            <textarea
              autoFocus
              value={descriptionDraft}
              onChange={(e) => setDescriptionDraft(e.target.value)}
              onBlur={submitDescription}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submitDescription()
                }
                if (e.key === 'Escape') {
                  setDescriptionDraft(playlist.description ?? '')
                  setIsEditingDescription(false)
                }
              }}
              placeholder="Add a description…"
              rows={2}
              className="mt-3 w-full max-w-xl resize-none rounded-md bg-black/20 px-2 py-1 text-sm text-gray-100 outline-none"
            />
          ) : (
            <p
              onClick={() => setIsEditingDescription(true)}
              className="mt-3 max-w-xl cursor-text truncate text-sm text-gray-200 hover:text-white"
            >
              {playlist.description || 'Add a description…'}
            </p>
          )}
          <p className="mt-3 text-sm text-gray-200">
            {tracks.length} track{tracks.length === 1 ? '' : 's'}
            {tracks.length > 0 && ` · ${formatTotalDuration(totalSeconds)}`}
          </p>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-4 bg-gradient-to-b from-black/10 to-transparent px-8 py-4">
        <button
          onClick={() => onPlayQueue(sortedTracks, 0)}
          disabled={tracks.length === 0}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-black transition-transform hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
          aria-label="Play playlist"
          title="Play playlist"
        >
          <Play size={20} fill="currentColor" className="ml-0.5" />
        </button>
        <CoverMenu hasCover={!!cover} onChangeCover={changeCover} onRemoveCover={clearCover} />
        <div className="flex-1" />
        {tracks.length > 0 && (
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search tracks…" />
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {tracks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-500">
            <p>This playlist is empty.</p>
            <p className="text-sm">Add tracks from the Library view.</p>
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-gray-500">
            <p>No tracks match "{searchQuery}".</p>
          </div>
        ) : (
          <>
            <TrackListHeader sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} />
            <div className="flex flex-col gap-1">
              {filteredTracks.map((track) => {
                const realIndex = tracks.indexOf(track)
                const displayIndex = sortKey === null ? realIndex : sortedTracks.indexOf(track)
                return (
                  <TrackListRow
                    key={track.id}
                    track={track}
                    index={displayIndex + 1}
                    isActive={currentTrack?.id === track.id}
                    isPlaying={isPlaying}
                    onPlay={() => onPlayQueue(sortedTracks, sortedTracks.indexOf(track))}
                    onTogglePlayPause={onTogglePlayPause}
                    onSelectAlbum={onSelectAlbum}
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
                              danger
                              onClick={() => {
                                removeTrack(track.id)
                                close()
                              }}
                            >
                              Remove from playlist
                            </MenuItem>
                          </>
                        )}
                      </TrackRowMenu>
                    }
                    draggable={canReorder}
                    isDragging={draggedIndex === realIndex}
                    onDragStartRow={
                      canReorder
                        ? (e: DragEvent<HTMLDivElement>) => {
                            e.dataTransfer.effectAllowed = 'move'
                            e.dataTransfer.setData('text/plain', String(track.id))
                            setDraggedIndex(realIndex)
                          }
                        : undefined
                    }
                    onDragOverRow={
                      canReorder
                        ? (e: DragEvent<HTMLDivElement>) => {
                            e.preventDefault()
                            e.dataTransfer.dropEffect = 'move'
                          }
                        : undefined
                    }
                    onDropRow={
                      canReorder
                        ? (e: DragEvent<HTMLDivElement>) => {
                            e.preventDefault()
                            if (draggedIndex !== null) reorder(draggedIndex, realIndex)
                            setDraggedIndex(null)
                          }
                        : undefined
                    }
                    onDragEndRow={canReorder ? () => setDraggedIndex(null) : undefined}
                  />
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
