import { useCallback, useEffect, useState } from 'react'

export type UpdateStatus =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'available'; version: string }
  | { phase: 'upToDate' }
  | { phase: 'downloading'; percent: number }
  | { phase: 'downloaded'; version: string }
  | { phase: 'error'; message: string }

export function useAppUpdates() {
  const [appVersion, setAppVersion] = useState('')
  const [status, setStatus] = useState<UpdateStatus>({ phase: 'idle' })
  // The popup can be dismissed ("Later") without losing the status shown in Settings.
  const [popupDismissed, setPopupDismissed] = useState(false)

  useEffect(() => {
    window.api.getAppVersion().then(setAppVersion)

    return window.api.onUpdateEvent((event) => {
      switch (event.type) {
        case 'available':
          setStatus({ phase: 'available', version: event.version })
          setPopupDismissed(false)
          break
        case 'upToDate':
          setStatus({ phase: 'upToDate' })
          break
        case 'downloading':
          setStatus({ phase: 'downloading', percent: event.percent })
          break
        case 'downloaded':
          setStatus({ phase: 'downloaded', version: event.version })
          setPopupDismissed(false)
          break
        case 'error':
          setStatus({ phase: 'error', message: event.message })
          break
      }
    })
  }, [])

  const checkForUpdates = useCallback(() => {
    setStatus({ phase: 'checking' })
    window.api.checkForUpdates()
  }, [])

  const downloadUpdate = useCallback(() => {
    setStatus({ phase: 'downloading', percent: 0 })
    window.api.downloadUpdate()
  }, [])

  const installUpdate = useCallback(() => {
    window.api.installUpdate()
  }, [])

  const dismissPopup = useCallback(() => setPopupDismissed(true), [])

  const showPopup =
    !popupDismissed && (status.phase === 'available' || status.phase === 'downloaded')

  return { appVersion, status, showPopup, checkForUpdates, downloadUpdate, installUpdate, dismissPopup }
}
