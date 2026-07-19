import { useSyncExternalStore } from 'react'

/**
 * Playback position lives outside React state on purpose: it changes ~4×/s while music
 * plays, and as App-level state it forced the entire tree (library list, album grid,
 * panels) to re-render on every tick. As an external store, only the components that
 * actually render the position — NowPlayingBar, FullscreenPlayer, LyricsView — subscribe.
 */
type Listener = () => void

const listeners = new Set<Listener>()
let playbackTime = 0

function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Current playback position in seconds, without subscribing to updates. */
export function getPlaybackTime(): number {
  return playbackTime
}

/** usePlayer owns the audio element and is the only caller. */
export function publishPlaybackTime(time: number): void {
  if (time === playbackTime) return
  playbackTime = time
  listeners.forEach((listener) => listener())
}

/** Re-renders the calling component on every playback tick — subscribe sparingly. */
export function usePlaybackTime(): number {
  return useSyncExternalStore(subscribe, getPlaybackTime)
}
