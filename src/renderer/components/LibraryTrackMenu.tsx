import { useState } from 'react'
import type { Playlist } from '../../shared/types'
import { TrackRowMenu } from './TrackRowMenu'
import { MenuItem } from './MenuItem'

interface LibraryTrackMenuProps {
  playlists: Playlist[]
  onAddToQueue: () => void
  onOpenEqualizer: () => void
  onAddToExistingPlaylist: (playlistId: number) => void
  onCreatePlaylistAndAdd: (name: string) => void
}

export function LibraryTrackMenu({
  playlists,
  onAddToQueue,
  onOpenEqualizer,
  onAddToExistingPlaylist,
  onCreatePlaylistAndAdd
}: LibraryTrackMenuProps) {
  const [newName, setNewName] = useState('')

  return (
    <TrackRowMenu>
      {(close) => (
        <>
          <MenuItem
            onClick={() => {
              onAddToQueue()
              close()
            }}
          >
            Add to queue
          </MenuItem>
          <MenuItem
            onClick={() => {
              onOpenEqualizer()
              close()
            }}
          >
            Equalizer
          </MenuItem>

          {playlists.length > 0 && <div className="my-1 border-t border-white/10" />}
          {playlists.map((playlist) => (
            <MenuItem
              key={playlist.id}
              onClick={() => {
                onAddToExistingPlaylist(playlist.id)
                close()
              }}
            >
              Add to {playlist.name}
            </MenuItem>
          ))}

          <div className="mt-1 flex gap-1 border-t border-white/10 pt-1">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim()) {
                  onCreatePlaylistAndAdd(newName.trim())
                  setNewName('')
                  close()
                }
                if (e.key === 'Escape') close()
              }}
              placeholder="New playlist…"
              className="min-w-0 flex-1 rounded bg-surface px-2 py-1 text-xs text-gray-100 outline-none"
            />
          </div>
        </>
      )}
    </TrackRowMenu>
  )
}
