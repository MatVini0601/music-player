import { useCallback, useEffect, useState } from 'react'
import type { ArtistAlbumSort } from '../../shared/types'

export function useArtistAlbumSort() {
  const [albumSort, setAlbumSortState] = useState<ArtistAlbumSort>('alphabetical')

  useEffect(() => {
    window.api.getArtistAlbumSort().then(setAlbumSortState)
  }, [])

  const setAlbumSort = useCallback((sort: ArtistAlbumSort) => {
    setAlbumSortState(sort)
    window.api.setArtistAlbumSort(sort)
  }, [])

  return { albumSort, setAlbumSort }
}
