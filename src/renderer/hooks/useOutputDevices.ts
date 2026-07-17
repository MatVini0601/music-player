import { useEffect, useState } from 'react'

export interface OutputDevice {
  deviceId: string
  label: string
}

/**
 * Audio output devices as reported by the browser, kept fresh on devicechange.
 * Chromium prefixes the list with virtual "default"/"communications" entries that
 * duplicate real devices — those are dropped; an explicit "System default" option
 * (deviceId '') should cover that case in the UI.
 */
export function useOutputDevices(): OutputDevice[] {
  const [devices, setDevices] = useState<OutputDevice[]>([])

  useEffect(() => {
    let cancelled = false
    const refresh = (): void => {
      navigator.mediaDevices.enumerateDevices().then((all) => {
        if (cancelled) return
        setDevices(
          all
            .filter(
              (d) =>
                d.kind === 'audiooutput' &&
                d.deviceId !== 'default' &&
                d.deviceId !== 'communications'
            )
            .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Output device ${i + 1}` }))
        )
      })
    }

    refresh()
    navigator.mediaDevices.addEventListener('devicechange', refresh)
    return () => {
      cancelled = true
      navigator.mediaDevices.removeEventListener('devicechange', refresh)
    }
  }, [])

  return devices
}
