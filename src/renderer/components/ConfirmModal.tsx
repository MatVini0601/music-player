import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { Trash2 } from 'lucide-react'

interface ConfirmModalProps {
  title: string
  message: ReactNode
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Themed replacement for window.confirm on destructive actions. Rendered on
 * document.body via a portal so ancestors with backdrop-blur (e.g. the sidebar)
 * can't trap the fixed overlay in their stacking context.
 */
export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onCancel}
    >
      <div
        className="w-96 rounded-lg border border-white/10 bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400">
            <Trash2 size={18} />
          </div>
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-white">{title}</h2>
        </div>

        <p className="mt-4 text-sm text-gray-300">{message}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-md px-4 py-1.5 text-sm text-gray-400 transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-red-500 px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
