import { useCallback, useEffect, useState } from 'react'
import type { SortMode } from '../../shared/types'

export function useSortMode() {
  const [sortMode, setSortModeState] = useState<SortMode>('ignoreSpecials')

  useEffect(() => {
    window.api.getSortMode().then(setSortModeState)
  }, [])

  const setSortMode = useCallback((mode: SortMode) => {
    setSortModeState(mode)
    window.api.setSortMode(mode)
  }, [])

  return { sortMode, setSortMode }
}
