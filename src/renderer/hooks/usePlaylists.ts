import { useCallback, useEffect, useState } from 'react'
import type { Playlist } from '../../shared/types'

export function usePlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])

  const refresh = useCallback(async () => {
    const result = await window.api.listPlaylists()
    setPlaylists(result)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createPlaylist = useCallback(
    async (name: string) => {
      const playlist = await window.api.createPlaylist(name)
      await refresh()
      return playlist
    },
    [refresh]
  )

  const renamePlaylist = useCallback(
    async (id: number, name: string) => {
      await window.api.renamePlaylist(id, name)
      await refresh()
    },
    [refresh]
  )

  const deletePlaylist = useCallback(
    async (id: number) => {
      await window.api.deletePlaylist(id)
      await refresh()
    },
    [refresh]
  )

  const setPlaylistDescription = useCallback(
    async (id: number, description: string) => {
      await window.api.setPlaylistDescription(id, description)
      await refresh()
    },
    [refresh]
  )

  return {
    playlists,
    refresh,
    createPlaylist,
    renamePlaylist,
    deletePlaylist,
    setPlaylistDescription
  }
}
