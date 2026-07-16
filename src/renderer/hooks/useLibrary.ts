import { useCallback, useEffect, useState } from 'react'
import type { ScanProgress, Track } from '../../shared/types'

export function useLibrary() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null)
  const [scanFailedPaths, setScanFailedPaths] = useState<string[]>([])
  const [libraryRoots, setLibraryRoots] = useState<string[]>([])

  const refreshTracks = useCallback(async () => {
    const result = await window.api.getTracks()
    setTracks(result)
  }, [])

  const refreshRoots = useCallback(async () => {
    const roots = await window.api.getLibraryRoots()
    setLibraryRoots(roots)
  }, [])

  useEffect(() => {
    refreshRoots()
    refreshTracks()

    const unsubscribe = window.api.onScanProgress(setScanProgress)
    return unsubscribe
  }, [refreshRoots, refreshTracks])

  const runScan = useCallback(async () => {
    setIsScanning(true)
    setScanProgress(null)
    setScanFailedPaths([])
    try {
      const result = await window.api.scanLibrary()
      setScanFailedPaths(result.failedPaths)
      await refreshTracks()
    } finally {
      setIsScanning(false)
      setScanProgress(null)
    }
  }, [refreshTracks])

  const pickFolderAndScan = useCallback(async () => {
    const folder = await window.api.pickFolder()
    if (!folder) return

    await refreshRoots()
    await runScan()
  }, [refreshRoots, runScan])

  const removeFolder = useCallback(
    async (path: string) => {
      await window.api.removeLibraryRoot(path)
      await refreshRoots()
      await refreshTracks()
    },
    [refreshRoots, refreshTracks]
  )

  const rescan = runScan

  return {
    tracks,
    isScanning,
    scanProgress,
    scanFailedPaths,
    libraryRoots,
    hasLibraryRoots: libraryRoots.length > 0,
    pickFolderAndScan,
    removeFolder,
    rescan
  }
}
