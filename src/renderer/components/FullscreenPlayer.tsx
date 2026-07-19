import { useEffect, useState } from 'react'
import { Info, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react'
import type { Track, TrackMetadata } from '../../shared/types'
import { useDominantColor } from '../hooks/useDominantColor'
import { usePlaybackTime } from '../hooks/usePlaybackTime'
import { formatDuration } from '../utils/format'
import { TrackTagsList } from './TrackTagsList'

interface FullscreenPlayerProps {
  track: Track | null
  isPlaying: boolean
  duration: number
  onTogglePlayPause: () => void
  onSeek: (time: number) => void
  onNext: () => void
  onPrevious: () => void
  onClose: () => void
  dominantColorBg: boolean
}

export function FullscreenPlayer({
  track,
  isPlaying,
  duration,
  onTogglePlayPause,
  onSeek,
  onNext,
  onPrevious,
  onClose,
  dominantColorBg
}: FullscreenPlayerProps) {
  const currentTime = usePlaybackTime()
  const cover = track?.artUrl ?? null
  const bgColor = useDominantColor(dominantColorBg ? cover : null)
  const [showTags, setShowTags] = useState(false)
  const [metadata, setMetadata] = useState<TrackMetadata | null>(null)

  useEffect(() => {
    if (!showTags || !track) return
    let cancelled = false
    setMetadata(null)
    window.api.getTrackMetadata(track.id).then((result) => {
      if (!cancelled) setMetadata(result)
    })
    return () => {
      cancelled = true
    }
  }, [showTags, track])

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col p-10 transition-[background] duration-500"
      style={{
        background: bgColor ? `linear-gradient(to bottom, ${bgColor}, #0a0a0a)` : '#0a0a0a'
      }}
    >
      <div className="absolute right-6 top-6 z-10 flex items-center gap-4">
        <button
          onClick={() => setShowTags((v) => !v)}
          disabled={!track}
          title="Track tags"
          aria-label="Toggle track tags"
          className={`transition-colors disabled:opacity-30 ${
            showTags ? 'text-accent' : 'text-gray-300 hover:text-white'
          }`}
        >
          <Info size={22} />
        </button>
        <button
          onClick={onClose}
          className="text-gray-300 transition-colors hover:text-white"
          aria-label="Exit fullscreen"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-stretch">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div className="aspect-square w-full max-w-[min(70vh,70vw)] overflow-hidden rounded-lg bg-white/5 shadow-2xl">
              {cover && <img src={cover} alt="" className="h-full w-full object-cover" />}
            </div>
          </div>

          <div className="mt-6">
            <h1 className="truncate text-3xl font-bold text-white">
              {track?.title ?? 'Nothing playing'}
            </h1>
            <p className="mt-1 truncate text-lg text-gray-300">{track?.artist ?? ''}</p>
          </div>

          <div className="mt-5 flex items-center gap-3 text-xs text-gray-400">
            <span className="w-10 text-right">{formatDuration(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onChange={(e) => onSeek(Number(e.target.value))}
              disabled={!track}
              className="h-1 flex-1 accent-accent"
            />
            <span className="w-10">{formatDuration(duration)}</span>
          </div>

          <div className="mt-4 flex items-center justify-center gap-8">
            <button
              onClick={onPrevious}
              disabled={!track}
              className="text-gray-300 transition-colors hover:text-white disabled:opacity-30"
              aria-label="Previous"
            >
              <SkipBack size={22} fill="currentColor" />
            </button>
            <button
              onClick={onTogglePlayPause}
              disabled={!track}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause size={22} fill="currentColor" />
              ) : (
                <Play size={22} fill="currentColor" className="ml-0.5" />
              )}
            </button>
            <button
              onClick={onNext}
              disabled={!track}
              className="text-gray-300 transition-colors hover:text-white disabled:opacity-30"
              aria-label="Next"
            >
              <SkipForward size={22} fill="currentColor" />
            </button>
          </div>
        </div>

        <div
          className={`flex-shrink-0 overflow-hidden transition-all duration-300 ${
            showTags ? 'ml-10 mr-24 w-96 opacity-100' : 'ml-0 mr-0 w-0 opacity-0'
          }`}
        >
          <div className="h-full w-96 overflow-y-auto pr-8 pt-10">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Track tags
            </h2>
            {!metadata ? (
              <p className="text-sm text-gray-500">Loading tags…</p>
            ) : (
              <TrackTagsList metadata={metadata} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
