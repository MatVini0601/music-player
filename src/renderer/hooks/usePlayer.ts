import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Track } from '../../shared/types'
import { createDefaultEqBands, type EqBand } from '../utils/eq'

export type RepeatMode = 'off' | 'all' | 'one'

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
  isShuffle: boolean
  repeatMode: RepeatMode
  /** Queue indices in the order they will actually play (shuffled when shuffle is on). */
  playOrder: number[]
  /** Selected audio output device id; '' means the system default. */
  audioOutputId: string
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
  toggleShuffle: () => void
  toggleRepeat: () => void
  setAudioOutput: (deviceId: string) => void
}

/**
 * Audio flows through the AudioContext (EQ graph), so the output device is set on the
 * context, not the <audio> element. '' routes back to the system default.
 */
function applySinkId(context: AudioContext | null, deviceId: string): void {
  const sinkable = context as (AudioContext & { setSinkId?: (id: string) => Promise<void> }) | null
  sinkable?.setSinkId?.(deviceId).catch((error) => {
    console.warn(`Could not switch audio output to "${deviceId}":`, error)
  })
}

/** A permutation of queue indices starting with firstIndex (the playing track keeps playing). */
function buildShuffleOrder(length: number, firstIndex: number): number[] {
  const rest: number[] = []
  for (let i = 0; i < length; i++) {
    if (i !== firstIndex) rest.push(i)
  }
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  return firstIndex >= 0 && firstIndex < length ? [firstIndex, ...rest] : rest
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
  const [isShuffle, setIsShuffle] = useState(false)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off')
  // When shuffle is on, playback follows this permutation of queue indices instead of
  // sequential order. It always contains every queue index exactly once.
  const [shuffleOrder, setShuffleOrder] = useState<number[]>([])
  const [audioOutputId, setAudioOutputId] = useState('')

  const currentTrack = currentIndex >= 0 ? (queue[currentIndex] ?? null) : null

  const playOrder = useMemo(
    () => (isShuffle && shuffleOrder.length > 0 ? shuffleOrder : queue.map((_, i) => i)),
    [isShuffle, shuffleOrder, queue]
  )

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
    const onPlay = (): void => setIsPlaying(true)
    const onPause = (): void => setIsPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, [])

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

  useEffect(() => {
    window.api.getAudioOutput().then((deviceId) => {
      setAudioOutputId(deviceId)
      // Missing device (unplugged since last run) rejects and playback stays on the default.
      if (deviceId) applySinkId(audioContextRef.current, deviceId)
    })
  }, [])

  const setAudioOutput = useCallback((deviceId: string) => {
    setAudioOutputId(deviceId)
    window.api.setAudioOutput(deviceId)
    applySinkId(audioContextRef.current, deviceId)
  }, [])

  const playQueue = useCallback(
    (tracks: Track[], startIndex: number) => {
      previousTrackRef.current = null
      setHistory([])
      setQueue(tracks)
      setCurrentIndex(startIndex)
      if (isShuffle) setShuffleOrder(buildShuffleOrder(tracks.length, startIndex))
    },
    [isShuffle]
  )

  const addToQueue = useCallback(
    (track: Track) => {
      if (queue.length === 0) {
        setQueue([track])
        setCurrentIndex(0)
        if (isShuffle) setShuffleOrder([0])
        return
      }

      const newIndex = queue.length
      setQueue((prev) => [...prev, track])
      if (isShuffle) {
        // Drop the new track somewhere in the not-yet-played part of the shuffle order.
        setShuffleOrder((order) => {
          const currentPos = Math.max(order.indexOf(currentIndex), 0)
          const insertAt = currentPos + 1 + Math.floor(Math.random() * (order.length - currentPos))
          const next = [...order]
          next.splice(insertAt, 0, newIndex)
          return next
        })
      }
    },
    [queue.length, isShuffle, currentIndex]
  )

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index))
    // Queue indices above the removed one shift down; keep the pointer and shuffle
    // order aimed at the same tracks.
    setCurrentIndex((i) => (index < i ? i - 1 : i))
    setShuffleOrder((order) =>
      order.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i))
    )
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
    setCurrentIndex((i) => {
      if (queue.length === 0) return i
      if (isShuffle && shuffleOrder.length > 0) {
        const pos = shuffleOrder.indexOf(i)
        if (pos === -1) return shuffleOrder[0]
        if (pos + 1 < shuffleOrder.length) return shuffleOrder[pos + 1]
        return repeatMode === 'all' ? shuffleOrder[0] : i
      }
      if (i + 1 < queue.length) return i + 1
      return repeatMode === 'all' ? 0 : i
    })
  }, [queue.length, isShuffle, shuffleOrder, repeatMode])

  const previous = useCallback(() => {
    setCurrentIndex((i) => {
      if (queue.length === 0) return i
      if (isShuffle && shuffleOrder.length > 0) {
        const pos = shuffleOrder.indexOf(i)
        if (pos > 0) return shuffleOrder[pos - 1]
        return repeatMode === 'all' ? shuffleOrder[shuffleOrder.length - 1] : i
      }
      if (i > 0) return i - 1
      return repeatMode === 'all' ? queue.length - 1 : i
    })
  }, [queue.length, isShuffle, shuffleOrder, repeatMode])

  const toggleShuffle = useCallback(() => {
    if (isShuffle) {
      setIsShuffle(false)
      setShuffleOrder([])
    } else {
      setIsShuffle(true)
      setShuffleOrder(buildShuffleOrder(queue.length, currentIndex))
    }
  }, [isShuffle, queue.length, currentIndex])

  const toggleRepeat = useCallback(() => {
    setRepeatMode((mode) => (mode === 'off' ? 'all' : mode === 'all' ? 'one' : 'off'))
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    const onEnded = (): void => {
      // Cases where the queue index doesn't change (repeat-one, or repeat-all with a
      // single track) never re-trigger the src effect, so restart the audio directly.
      if (repeatMode === 'one' || (repeatMode === 'all' && queue.length === 1)) {
        audio.currentTime = 0
        audio.play().catch(() => {})
        return
      }
      next()
    }

    audio.addEventListener('ended', onEnded)
    return () => audio.removeEventListener('ended', onEnded)
  }, [repeatMode, queue.length, next])

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
    isShuffle,
    repeatMode,
    playOrder,
    audioOutputId,
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
    previous,
    toggleShuffle,
    toggleRepeat,
    setAudioOutput
  }
}
