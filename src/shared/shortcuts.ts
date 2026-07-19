/** Player actions that can be bound to a keyboard shortcut. */
export const SHORTCUT_ACTIONS = [
  'playPause',
  'previous',
  'next',
  'seekBack',
  'seekForward',
  'volumeDown',
  'volumeUp',
  'toggleMute',
  'toggleShuffle',
  'toggleRepeat',
  'toggleFullscreen',
  'toggleLyrics',
  'toggleQueue'
] as const

export type ShortcutAction = (typeof SHORTCUT_ACTIONS)[number]

/** Binding strings look like "Space", "M", or "Ctrl+ArrowRight"; '' means unbound. */
export type ShortcutMap = Record<ShortcutAction, string>

export const DEFAULT_SHORTCUTS: ShortcutMap = {
  playPause: 'Space',
  previous: 'Ctrl+ArrowLeft',
  next: 'Ctrl+ArrowRight',
  seekBack: 'ArrowLeft',
  seekForward: 'ArrowRight',
  volumeDown: 'ArrowDown',
  volumeUp: 'ArrowUp',
  toggleMute: 'M',
  toggleShuffle: 'S',
  toggleRepeat: 'R',
  toggleFullscreen: 'F',
  toggleLyrics: 'L',
  toggleQueue: 'Q'
}
