import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { Track } from '../../shared/types'
import { formatDuration } from '../utils/format'

interface QueuePanelProps {
  queue: Track[]
  currentIndex: number
  playOrder: number[]
  history: Track[]
  isOpen: boolean
  onJumpTo: (index: number) => void
  onRemove: (index: number) => void
  onClose: () => void
}

interface QueueRowProps {
  track: Track
  isCurrent: boolean
  onClick: () => void
  onRemove?: () => void
}

function QueueRow({ track, isCurrent, onClick, onRemove }: QueueRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick()
      }}
      className={`group flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors ${
        isCurrent ? 'bg-accent/10 text-accent' : 'text-gray-300 hover:bg-white/5'
      }`}
    >
      <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded bg-white/5">
        {track.artDataUrl && (
          <img src={track.artDataUrl} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{track.title}</div>
        <div className="truncate text-xs text-gray-500">{track.artist || 'Unknown artist'}</div>
      </div>
      <div className="flex-shrink-0 text-xs text-gray-500 group-hover:hidden">
        {formatDuration(track.durationSeconds)}
      </div>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="hidden flex-shrink-0 text-gray-500 transition-colors hover:text-red-400 group-hover:block"
          aria-label="Remove from queue"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

export function QueuePanel({
  queue,
  currentIndex,
  playOrder,
  history,
  isOpen,
  onJumpTo,
  onRemove,
  onClose
}: QueuePanelProps) {
  const currentTrack = currentIndex >= 0 ? (queue[currentIndex] ?? null) : null
  // Everything after the current track in actual play order (shuffled when shuffle is on),
  // as queue indices so jump/remove still target the right track.
  const currentPos = playOrder.indexOf(currentIndex)
  const upNextIndices = currentPos >= 0 ? playOrder.slice(currentPos + 1) : playOrder
  const scrollRef = useRef<HTMLDivElement>(null)
  const nowPlayingRef = useRef<HTMLDivElement>(null)

  // Open with "Now playing" anchored to the top; the history stays above the
  // fold, reachable by scrolling up. Re-anchors when the track changes.
  useEffect(() => {
    if (!isOpen) return
    const container = scrollRef.current
    const target = nowPlayingRef.current
    if (!container || !target) return
    container.scrollTop +=
      target.getBoundingClientRect().top - container.getBoundingClientRect().top
  }, [isOpen, currentIndex])

  const jumpToHistoryTrack = (track: Track): void => {
    const index = queue.findIndex((t) => t.id === track.id)
    if (index >= 0) onJumpTo(index)
  }

  return (
    <div
      className={`flex flex-shrink-0 flex-col overflow-hidden border-white/5 bg-surface/90 backdrop-blur-sm transition-all duration-200 ${
        isOpen ? 'w-80 border-l px-6 py-6 opacity-100' : 'w-0 border-l-0 px-0 py-6 opacity-0'
      }`}
    >
      <div className="flex w-64 items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Queue</h2>
        <button
          onClick={onClose}
          className="text-gray-500 transition-colors hover:text-white"
          aria-label="Close queue panel"
        >
          <X size={16} />
        </button>
      </div>

      {!currentTrack && history.length === 0 && upNextIndices.length === 0 ? (
        <div className="mt-6 flex w-64 flex-1 items-center justify-center text-sm text-gray-500">
          Queue is empty
        </div>
      ) : (
        <div ref={scrollRef} className="mt-4 w-64 flex-1 overflow-y-auto">
          {history.length > 0 && (
            <>
              <div className="mb-1 text-xs text-gray-500">Play history</div>
              <div className="flex flex-col gap-0.5">
                {history.map((track, index) => (
                  <QueueRow
                    key={`${track.id}-${index}`}
                    track={track}
                    isCurrent={false}
                    onClick={() => jumpToHistoryTrack(track)}
                  />
                ))}
              </div>
            </>
          )}

          {currentTrack && (
            <div ref={nowPlayingRef} className={history.length > 0 ? 'pt-4' : ''}>
              <div className="mb-1 text-xs text-gray-500">Now playing</div>
              <QueueRow track={currentTrack} isCurrent onClick={() => onJumpTo(currentIndex)} />
            </div>
          )}

          {upNextIndices.length > 0 && (
            <>
              <div className="mb-1 mt-4 text-xs text-gray-500">Up next</div>
              <div className="flex flex-col gap-0.5">
                {upNextIndices.map((index) => {
                  const track = queue[index]
                  if (!track) return null
                  return (
                    <QueueRow
                      key={`${track.id}-${index}`}
                      track={track}
                      isCurrent={false}
                      onClick={() => onJumpTo(index)}
                      onRemove={() => onRemove(index)}
                    />
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
