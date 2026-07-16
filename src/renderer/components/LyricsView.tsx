import { useEffect, useRef, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import type { LyricsResult, Track } from '../../shared/types'
import { formatLrcTimestamp } from '../utils/format'
import { useDominantColor } from '../hooks/useDominantColor'

interface LyricsViewProps {
  track: Track | null
  currentTime: number
}

function linesToEditableText(result: LyricsResult): string {
  if (!result.isSynced) return result.lines.map((line) => line.text).join('\n')
  return result.lines
    .map((line) => `[${formatLrcTimestamp(line.time ?? 0)}]${line.text}`)
    .join('\n')
}

export function LyricsView({ track, currentTime }: LyricsViewProps) {
  const [lyrics, setLyrics] = useState<LyricsResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [draftText, setDraftText] = useState('')
  const lineRefs = useRef<(HTMLDivElement | null)[]>([])
  const heroColor = useDominantColor(track?.artDataUrl ?? null)

  useEffect(() => {
    if (!track) {
      setLyrics(null)
      return
    }

    setIsLoading(true)
    setLyrics(null)
    setIsEditing(false)
    window.api.getLyrics(track.id).then((result) => {
      setLyrics(result)
      setIsLoading(false)
    })
  }, [track?.id])

  const activeIndex = lyrics?.isSynced
    ? lyrics.lines.reduce(
        (acc, line, index) => (line.time !== null && line.time <= currentTime ? index : acc),
        -1
      )
    : -1

  useEffect(() => {
    if (activeIndex < 0 || isEditing) return
    lineRefs.current[activeIndex]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [activeIndex, isEditing])

  const startEditing = (): void => {
    setDraftText(lyrics ? linesToEditableText(lyrics) : '')
    setIsEditing(true)
  }

  const saveLyrics = async (): Promise<void> => {
    if (!track) return
    const result = await window.api.setLyrics(track.id, draftText)
    setLyrics(result)
    setIsEditing(false)
  }

  const clearLyrics = async (): Promise<void> => {
    if (!track) return
    await window.api.clearLyrics(track.id)
    setIsLoading(true)
    setIsEditing(false)
    const result = await window.api.getLyrics(track.id)
    setLyrics(result)
    setIsLoading(false)
  }

  return (
    <div
      className="flex h-full flex-col overflow-hidden px-10 py-10 transition-[background] duration-500"
      style={{
        background: heroColor ? `linear-gradient(to bottom, ${heroColor}, #121212)` : undefined
      }}
    >
      {track && !isLoading && (
        <div className="mb-6 flex flex-shrink-0 items-center justify-end gap-3">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="text-sm text-gray-400 transition-colors hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={saveLyrics}
                className="rounded-md bg-accent px-3 py-1 text-sm font-medium text-black transition-opacity hover:opacity-90"
              >
                Save
              </button>
            </>
          ) : (
            <>
              {lyrics && (
                <button
                  onClick={clearLyrics}
                  title="Clear lyrics"
                  aria-label="Clear lyrics"
                  className="text-gray-500 transition-colors hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button
                onClick={startEditing}
                title={lyrics ? 'Edit lyrics' : 'Add lyrics'}
                aria-label={lyrics ? 'Edit lyrics' : 'Add lyrics'}
                className="text-gray-500 transition-colors hover:text-white"
              >
                <Pencil size={16} />
              </button>
            </>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1 items-start gap-10 overflow-hidden">
        <div className="flex w-72 flex-shrink-0 flex-col items-center">
          <div className="aspect-square w-full overflow-hidden rounded-lg bg-white/5 shadow-lg">
            {track?.artDataUrl && (
              <img src={track.artDataUrl} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          {track && (
            <div className="mt-4 w-full text-center">
              <h2 className="truncate text-lg font-semibold">{track.title}</h2>
              <p className="mt-1 truncate text-sm text-gray-500">
                {track.artist || 'Unknown artist'}
              </p>
            </div>
          )}
        </div>

        <div className="relative min-w-0 flex-1 self-stretch overflow-hidden">
          <div
            className="h-full overflow-y-auto"
            style={{
              maskImage: 'linear-gradient(to bottom, black 0%, black calc(100% - 6rem), transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(to bottom, black 0%, black calc(100% - 6rem), transparent 100%)'
            }}
          >
            {!track ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                Nothing playing
              </div>
            ) : isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                Loading lyrics…
              </div>
            ) : isEditing ? (
              <textarea
                autoFocus
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                placeholder={
                  'Paste plain lyrics, or synced lyrics in .lrc format, e.g.\n[00:12.34]First line\n[00:16.00]Second line'
                }
                className="h-full w-full resize-none rounded-md bg-white/5 p-3 text-sm text-gray-100 outline-none placeholder:text-gray-600"
              />
            ) : !lyrics ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-gray-500">
                <p>No lyrics found for this track.</p>
                <button onClick={startEditing} className="text-accent hover:underline">
                  Add lyrics
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 pb-[50%]">
                {lyrics.lines.map((line, index) => (
                  <div
                    key={index}
                    ref={(el) => {
                      lineRefs.current[index] = el
                    }}
                    className={`text-3xl font-medium transition-colors ${
                      lyrics.isSynced
                        ? index === activeIndex
                          ? 'text-accent'
                          : 'text-gray-500'
                        : 'text-gray-200'
                    }`}
                  >
                    {line.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
