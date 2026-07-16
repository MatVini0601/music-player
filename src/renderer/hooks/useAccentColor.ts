import { useCallback, useEffect, useState } from 'react'

export const DEFAULT_ACCENT_COLOR = '#1db954'

function applyAccentColor(hex: string): void {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  if ([r, g, b].some(Number.isNaN)) return
  document.documentElement.style.setProperty('--accent', `${r} ${g} ${b}`)
}

export function useAccentColor() {
  const [accentColor, setAccentColorState] = useState(DEFAULT_ACCENT_COLOR)

  useEffect(() => {
    window.api.getAccentColor().then((saved) => {
      setAccentColorState(saved)
      applyAccentColor(saved)
    })
  }, [])

  const setAccentColor = useCallback((color: string) => {
    setAccentColorState(color)
    applyAccentColor(color)
    window.api.setAccentColor(color)
  }, [])

  return { accentColor, setAccentColor }
}
