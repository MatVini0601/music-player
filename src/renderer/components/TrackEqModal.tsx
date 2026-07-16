import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { RotateCcw, X } from 'lucide-react'
import type { Track } from '../../shared/types'
import { createDefaultEqBands, type EqBand } from '../utils/eq'
import { EqBandsEditor } from './EqBandsEditor'

interface TrackEqModalProps {
  track: Track
  globalBands: EqBand[]
  onSetTrackEq: (trackId: number, bands: EqBand[]) => void
  onClearTrackEq: (trackId: number) => void
  onClose: () => void
}

export function TrackEqModal({
  track,
  globalBands,
  onSetTrackEq,
  onClearTrackEq,
  onClose
}: TrackEqModalProps) {
  const [bands, setBands] = useState<EqBand[] | null>(null)
  const [hasOverride, setHasOverride] = useState(false)

  useEffect(() => {
    let cancelled = false
    window.api.getTrackEq(track.id).then((override) => {
      if (cancelled) return
      setBands(override ?? globalBands.map((b) => ({ ...b })))
      setHasOverride(override !== null)
    })
    return () => {
      cancelled = true
    }
  }, [track.id, globalBands])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const changeBand = (bandIndex: number, patch: Partial<EqBand>): void => {
    if (!bands) return
    const next = bands.map((band, i) => (i === bandIndex ? { ...band, ...patch } : band))
    setBands(next)
    setHasOverride(true)
    onSetTrackEq(track.id, next)
  }

  const resetFlat = (): void => {
    const defaults = createDefaultEqBands()
    setBands(defaults)
    setHasOverride(true)
    onSetTrackEq(track.id, defaults)
  }

  const useGlobal = (): void => {
    onClearTrackEq(track.id)
    setBands(globalBands.map((b) => ({ ...b })))
    setHasOverride(false)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-fit max-w-[90vw] animate-pop-in rounded-lg border border-white/10 bg-surface-raised p-6 shadow-2xl"
      >
        <div className="mb-1 flex items-center justify-between gap-4">
          <h2 className="min-w-0 truncate text-lg font-semibold text-white">
            Equalizer — {track.title}
          </h2>
          <div className="flex flex-shrink-0 items-center gap-4">
            <button
              onClick={resetFlat}
              title="Reset to flat"
              aria-label="Reset track equalizer to flat"
              className="text-gray-400 transition-colors hover:text-white"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={onClose}
              aria-label="Close track equalizer"
              className="text-gray-400 transition-colors hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="mb-5 flex items-center gap-3">
          <p className="text-xs text-gray-500">
            {hasOverride
              ? 'This track uses its own equalizer settings.'
              : 'This track uses the global equalizer. Adjust a band to customize it.'}
          </p>
          {hasOverride && (
            <button onClick={useGlobal} className="text-xs text-accent hover:underline">
              Use global EQ
            </button>
          )}
        </div>

        {bands ? (
          <div className="max-h-[70vh] overflow-auto">
            <EqBandsEditor bands={bands} onChangeBand={changeBand} />
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-gray-500">Loading…</p>
        )}
      </div>
    </div>,
    document.body
  )
}
