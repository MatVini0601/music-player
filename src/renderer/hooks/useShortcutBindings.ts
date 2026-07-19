import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_SHORTCUTS,
  SHORTCUT_ACTIONS,
  type ShortcutAction,
  type ShortcutMap
} from '../../shared/shortcuts'

/** The persisted shortcut bindings and the Settings-facing ways to change them. */
export function useShortcutBindings() {
  const [shortcuts, setShortcutsState] = useState<ShortcutMap>(DEFAULT_SHORTCUTS)

  useEffect(() => {
    window.api.getShortcuts().then(setShortcutsState)
  }, [])

  const setShortcut = useCallback((action: ShortcutAction, binding: string) => {
    setShortcutsState((prev) => {
      const next = { ...prev, [action]: binding }
      // A key can only trigger one action: rebinding steals it and the old action goes unbound.
      if (binding) {
        for (const other of SHORTCUT_ACTIONS) {
          if (other !== action && next[other] === binding) next[other] = ''
        }
      }
      window.api.setShortcuts(next)
      return next
    })
  }, [])

  const resetShortcuts = useCallback(() => {
    const next = { ...DEFAULT_SHORTCUTS }
    setShortcutsState(next)
    window.api.setShortcuts(next)
  }, [])

  return { shortcuts, setShortcut, resetShortcuts }
}
