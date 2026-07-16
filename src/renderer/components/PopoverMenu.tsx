import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { MouseEvent, ReactNode } from 'react'

interface PopoverMenuProps {
  trigger: (props: { onClick: (e: MouseEvent) => void }) => ReactNode
  children: (close: () => void) => ReactNode
  /** Menu width in pixels, used both to render it and to decide which side it opens on. */
  width?: number
}

type Position = { top: number; left: number; align: 'left' | 'right' }

/**
 * Trigger + dropdown that renders its content on document.body via a portal, positioned
 * from the trigger's real screen coordinates. Avoids getting visually buried by an ancestor
 * (e.g. the sidebar's backdrop-blur) that forms its own stacking context ahead of a plain z-index.
 * Opens to the right of the trigger by default, falling back to the left if there isn't room.
 */
export function PopoverMenu({ trigger, children, width = 192 }: PopoverMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<Position | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!isOpen) return
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return

    const fitsRight = rect.left + width + 8 <= window.innerWidth
    setPosition(
      fitsRight
        ? { top: rect.bottom + 4, left: rect.left, align: 'left' }
        : { top: rect.bottom + 4, left: rect.right - width, align: 'right' }
    )
  }, [isOpen, width])

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: globalThis.MouseEvent): void => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setIsOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div ref={triggerRef} className="inline-flex">
      {trigger({
        onClick: (e) => {
          e.stopPropagation()
          setIsOpen((v) => !v)
        }
      })}
      {isOpen &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'fixed', top: position.top, left: position.left, width }}
            className={`z-50 animate-pop-in rounded-md border border-white/10 bg-surface-raised/95 p-1 shadow-2xl backdrop-blur-md ${
              position.align === 'left' ? 'origin-top-left' : 'origin-top-right'
            }`}
          >
            {children(() => setIsOpen(false))}
          </div>,
          document.body
        )}
    </div>
  )
}
