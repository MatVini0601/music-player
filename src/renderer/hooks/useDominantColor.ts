import { useEffect, useState } from 'react'
import { getDominantColor } from '../utils/dominantColor'

export function useDominantColor(imageDataUrl: string | null): string | null {
  const [color, setColor] = useState<string | null>(null)

  useEffect(() => {
    if (!imageDataUrl) {
      setColor(null)
      return
    }

    let cancelled = false
    getDominantColor(imageDataUrl).then((result) => {
      if (!cancelled) setColor(result)
    })

    return () => {
      cancelled = true
    }
  }, [imageDataUrl])

  return color
}
