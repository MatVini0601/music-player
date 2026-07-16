import { useCallback, useEffect, useState } from 'react'
import type { Album } from '../../shared/types'

export function useAlbums() {
  const [albums, setAlbums] = useState<Album[]>([])

  const refresh = useCallback(async () => {
    const result = await window.api.getAlbums()
    setAlbums(result)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { albums, refresh }
}
