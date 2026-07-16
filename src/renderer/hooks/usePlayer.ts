import { useCallback, useEffect, useRef, useState } from 'react'
import type { Track } from '../../shared/types'
import { createDefaultEqBands, type EqBand } from '../utils/eq'

export interface PlayerState {
  queue: Track[]
  currentIndex: number
  currentTrack: Track | null
  history: Track[]
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  eqBands: EqBand[]
  trackEqBands: EqBand[] | null
}

export interface PlayerControls {
  playQueue: (tracks: Track[], startIndex: number) => void
  addToQueue: (track: Track) => void
  removeFromQueue: (index: number) => void
  jumpTo: (index: number) => void
  togglePlayPause: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  setEqBand: (bandIndex: number, patch: Partial<EqBand>) => void
  resetEq: () => void
  setTrackEq: (trackId: number, bands: EqBand[]) => void
  clearTrackEq: (trackId: number) => void
  next: () => void
  previous: () => void
}

export function usePlayer(): PlayerState & PlayerControls {
  const audioRef = useRef<HTMLAudioElement>(new Audio())
  const [queue, setQueue] = useState<Track[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(1)
  const lastNonZeroVolumeRef = useRef(1)
  const [eqBands, setEqBandsState] = useState<EqBand[]>(createDefaultEqBands)
  const [trackEqBands, setTrackEqBands] = useState<EqBand[] | null>(null)
  const eqFiltersRef = useRef<BiquadFilterNode[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const [history, setHistory] = useState<Track[]>([])
  const previousTrackRef = useRef<Track | null>(null)

  const currentTrack = currentIndex >= 0 ? (queue[currentIndex] ?? null) : null

  // Tracks the actual chronological play order (not queue position), so jumping around the
  // queue doesn't misrepresent skipped-over tracks as "history".
  useEffect(() => {
    const previousTrack = previousTrackRef.current
    if (previousTrack && currentTrack && previousTrack.id !== currentTrack.id) {
      setHistory((prev) => [...prev, previousTrack])
    }
    previousTrackRef.current = currentTrack
  }, [currentTrack])

  useEffect(() => {
    const audio = audioRef.current
    audio.crossOrigin = 'anonymous'

    // Guarded against React StrictMode's double-invoked effects: an <audio> element can only
    // ever be connected to one MediaElementSourceNode, so this setup must run at most once.
    if (!audioContextRef.current) {
      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const context = new AudioContextCtor()
      const source = context.createMediaElementSource(audio)

      const filters = createDefaultEqBands().map((band) => {
        const filter = context.createBiquadFilter()
        filter.type = 'peaking'
        filter.frequency.value = band.frequency
        filter.Q.value = band.q
        filter.gain.value = band.gain
        return filter
      })

      filters.reduce((prevNode: AudioNode, filter) => {
        prevNode.connect(filter)
        return filter
      }, source)
      filters[filters.length - 1].connect(context.destination)

      audioContextRef.current = context
      eqFiltersRef.current = filters

      window.api.getEqBands().then(setEqBandsState)
    }

    const resumeContext = (): void => {
      const context = audioContextRef.current
      if (context && context.state === 'suspended') context.resume().catch(() => {})
    }
    audio.addEventListener('play', resumeContext)

    return () => {
      audio.removeEventListener('play', resumeContext)
    }
  }, [])

  // Whatever EQ is active — the current track's override, else the global one —
  // gets pushed into the live filter graph.
  useEffect(() => {
    const bands = trackEqBands ?? eqBands
    eqFiltersRef.current.forEach((filter, i) => {
      const band = bands[i]
      if (!band) return
      filter.frequency.value = band.frequency
      filter.Q.value = band.q
      filter.gain.value = band.gain
    })
  }, [trackEqBands, eqBands])

  useEffect(() => {
    if (!currentTrack) {
      setTrackEqBands(null)
      return
    }

    let cancelled = false
    window.api.getTrackEq(currentTrack.id).then((override) => {
      if (!cancelled) setTrackEqBands(override)
    })
    return () => {
      cancelled = true
    }
  }, [currentTrack])

  useEffect(() => {
    const audio = audioRef.current
    const onTimeUpdate = (): void => setCurrentTime(audio.currentTime)
    const onLoadedMetadata = (): void => setDuration(audio.duration)
    const onEnded = (): void => setCurrentIndex((i) => (i + 1 < queue.length ? i + 1 : i))
    const onPlay = (): void => setIsPlaying(true)
    const onPause = (): void => setIsPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, [queue.length])

  useEffect(() => {
    const audio = audioRef.current
    if (!currentTrack) return

    audio.src = currentTrack.mediaUrl
    audio.play().catch(() => setIsPlaying(false))
    window.api.recordPlay(currentTrack.id)
  }, [currentTrack?.mediaUrl])

  useEffect(() => {
    window.api.getVolume().then((savedVolume) => {
      audioRef.current.volume = savedVolume
      setVolumeState(savedVolume)
      if (savedVolume > 0) lastNonZeroVolumeRef.current = savedVolume
    })
  }, [])

  const playQueue = useCallback((tracks: Track[], startIndex: number) => {
    previousTrackRef.current = null
    setHistory([])
    setQueue(tracks)
    setCurrentIndex(startIndex)
  }, [])

  const addToQueue = useCallback(
    (track: Track) => {
      if (queue.length === 0) {
        setQueue([track])
        setCurrentIndex(0)
      } else {
        setQueue((prev) => [...prev, track])
      }
    },
    [queue.length]
  )

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const jumpTo = useCallback(
    (index: number) => {
      if (index >= 0 && index < queue.length) setCurrentIndex(index)
    },
    [queue.length]
  )

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current
    if (audio.paused) audio.play().catch(() => {})
    else audio.pause()
  }, [])

  const seek = useCallback((time: number) => {
    audioRef.current.currentTime = time
    setCurrentTime(time)
  }, [])

  const setVolume = useCallback((v: number) => {
    if (v > 0) lastNonZeroVolumeRef.current = v
    audioRef.current.volume = v
    setVolumeState(v)
    window.api.setVolume(v)
  }, [])

  const toggleMute = useCallback(() => {
    setVolume(volume > 0 ? 0 : lastNonZeroVolumeRef.current || 1)
  }, [volume, setVolume])

  const setEqBand = useCallback((bandIndex: number, patch: Partial<EqBand>) => {
    setEqBandsState((prev) => {
      const next = prev.map((band, i) => (i === bandIndex ? { ...band, ...patch } : band))
      window.api.setEqBands(next)
      return next
    })
  }, [])

  const resetEq = useCallback(() => {
    const defaults = createDefaultEqBands()
    setEqBandsState(defaults)
    window.api.setEqBands(defaults)
  }, [])

  const setTrackEq = useCallback(
    (trackId: number, bands: EqBand[]) => {
      window.api.setTrackEq(trackId, bands)
      if (currentTrack?.id === trackId) setTrackEqBands(bands)
    },
    [currentTrack]
  )

  const clearTrackEq = useCallback(
    (trackId: number) => {
      window.api.clearTrackEq(trackId)
      if (currentTrack?.id === trackId) setTrackEqBands(null)
    },
    [currentTrack]
  )

  const next = useCallback(() => {
    setCurrentIndex((i) => (i + 1 < queue.length ? i + 1 : i))
  }, [queue.length])

  const previous = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : i))
  }, [])

  return {
    queue,
    currentIndex,
    currentTrack,
    history,
    isPlaying,
    currentTime,
    duration,
    volume,
    eqBands,
    trackEqBands,
    playQueue,
    addToQueue,
    removeFromQueue,
    jumpTo,
    togglePlayPause,
    seek,
    setVolume,
    toggleMute,
    setEqBand,
    resetEq,
    setTrackEq,
    clearTrackEq,
    next,
    previous
  }
}
