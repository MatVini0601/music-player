import { MoreHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'
import { PopoverMenu } from './PopoverMenu'

interface TrackRowMenuProps {
  children: (close: () => void) => ReactNode
}

export function TrackRowMenu({ children }: TrackRowMenuProps) {
  return (
    <PopoverMenu
      trigger={({ onClick }) => (
        <button
          onClick={onClick}
          className="text-gray-500 opacity-0 transition hover:text-white group-hover:opacity-100"
          aria-label="More options"
        >
          <MoreHorizontal size={16} />
        </button>
      )}
    >
      {children}
    </PopoverMenu>
  )
}
