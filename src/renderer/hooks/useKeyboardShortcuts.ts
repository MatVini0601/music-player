import { useEffect, useRef } from 'react'
import type { ShortcutAction, ShortcutMap } from '../../shared/shortcuts'
import { eventToBinding } from '../utils/shortcuts'

/**
 * Global player shortcuts. Skips key events aimed at text inputs and events already
 * claimed elsewhere (the Settings rebind capture runs first and calls preventDefault).
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutMap,
  handlers: Record<ShortcutAction, () => void>
): void {
  // Handlers close over fresh player state every render; the ref keeps the listener
  // itself stable so it isn't torn down and re-added on each timeupdate tick.
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const actionByBinding = new Map<string, ShortcutAction>()
    for (const [action, binding] of Object.entries(shortcuts) as [ShortcutAction, string][]) {
      if (binding) actionByBinding.set(binding, action)
    }

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.defaultPrevented) return
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      const binding = eventToBinding(e)
      if (!binding) return
      const action = actionByBinding.get(binding)
      if (!action) return
      e.preventDefault()
      handlersRef.current[action]()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [shortcuts])
}
