import { useCallback, useEffect, useState } from 'react'
import type { Album, Track } from '../../shared/types'

export function useHomeData() {
  const [recentAlbums, setRecentAlbums] = useState<Album[]>([])
  const [recentTracks, setRecentTracks] = useState<Track[]>([])

  const refresh = useCallback(async () => {
    const [albums, tracks] = await Promise.all([
      window.api.getRecentAlbums(),
      window.api.getRecentTracks()
    ])
    setRecentAlbums(albums)
    setRecentTracks(tracks)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { recentAlbums, recentTracks, refresh }
}
