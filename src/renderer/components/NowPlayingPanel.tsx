import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { Track, TrackMetadata } from '../../shared/types'
import { TrackTagsList } from './TrackTagsList'

interface NowPlayingPanelProps {
  track: Track | null
  isOpen: boolean
  onClose: () => void
}

export function NowPlayingPanel({ track, isOpen, onClose }: NowPlayingPanelProps) {
  const [metadata, setMetadata] = useState<TrackMetadata | null>(null)

  useEffect(() => {
    if (!isOpen || !track) {
      setMetadata(null)
      return
    }

    let cancelled = false
    setMetadata(null)
    window.api.getTrackMetadata(track.id).then((result) => {
      if (!cancelled) setMetadata(result)
    })
    return () => {
      cancelled = true
    }
  }, [isOpen, track])

  return (
    <div
      className={`flex flex-shrink-0 flex-col overflow-hidden border-white/5 bg-surface/90 backdrop-blur-sm transition-all duration-200 ${
        isOpen ? 'w-80 border-l py-6 opacity-100' : 'w-0 border-l-0 py-6 opacity-0'
      }`}
    >
      <div className="flex w-80 flex-shrink-0 items-center justify-between px-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Now Playing
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 transition-colors hover:text-white"
          aria-label="Close now playing panel"
        >
          <X size={16} />
        </button>
      </div>

      {track ? (
        <div className="mt-6 min-h-0 w-80 flex-1 overflow-y-auto px-6">
          <div className="flex flex-col items-center text-center">
            <div className="aspect-square w-full overflow-hidden rounded-lg bg-white/5">
              {track.artDataUrl && (
                <img src={track.artDataUrl} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <h3 className="mt-4 w-full truncate text-lg font-semibold" title={track.title}>
              {track.title}
            </h3>
            <p className="mt-1 w-full truncate text-sm text-gray-500">
              {track.artist || 'Unknown artist'}
            </p>
          </div>

          <div className="mt-8 border-t border-white/5 pt-6">
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Tags
            </h4>
            {!metadata ? (
              <p className="text-sm text-gray-500">Loading tags…</p>
            ) : (
              <TrackTagsList metadata={metadata} />
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6 flex w-80 flex-1 items-center justify-center px-6 text-sm text-gray-500">
          Nothing playing
        </div>
      )}
    </div>
  )
}
