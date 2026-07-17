import { useCallback, useEffect, useState } from 'react'

export function useDominantColorBg() {
  const [dominantColorBg, setDominantColorBgState] = useState(true)

  useEffect(() => {
    window.api.getDominantColorBg().then(setDominantColorBgState)
  }, [])

  const setDominantColorBg = useCallback((enabled: boolean) => {
    setDominantColorBgState(enabled)
    window.api.setDominantColorBg(enabled)
  }, [])

  return { dominantColorBg, setDominantColorBg }
}
