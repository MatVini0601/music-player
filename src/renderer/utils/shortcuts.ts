/**
 * Turns a keydown event into a binding string like "Space", "M", or "Ctrl+ArrowRight".
 * Returns null for modifier-only presses (waiting for the real key). Both the rebind
 * capture in Settings and the global shortcut matcher use this, so a stored binding
 * always compares equal to the event that should trigger it.
 */
export function eventToBinding(e: KeyboardEvent): string | null {
  let key = e.key
  if (key === 'Control' || key === 'Shift' || key === 'Alt' || key === 'Meta') return null
  if (key === ' ') key = 'Space'
  if (key.length === 1) key = key.toUpperCase()

  const parts: string[] = []
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.metaKey) parts.push('Win')
  if (e.shiftKey) parts.push('Shift')
  parts.push(key)
  return parts.join('+')
}

const KEY_SYMBOLS: Record<string, string> = {
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓'
}

/** Human-readable form of a binding string ("Ctrl+ArrowRight" → "Ctrl + →"). */
export function formatBinding(binding: string): string {
  if (!binding) return ''
  const parts = binding.split('+')
  // Trailing empty parts mean the key itself was '+' (split ate it).
  if (parts[parts.length - 1] === '') {
    while (parts.length > 0 && parts[parts.length - 1] === '') parts.pop()
    parts.push('+')
  }
  return parts.map((part) => KEY_SYMBOLS[part] ?? part).join(' + ')
}
