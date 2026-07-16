import type { ReactNode } from 'react'

interface MenuItemProps {
  onClick: () => void
  danger?: boolean
  disabled?: boolean
  children: ReactNode
}

export function MenuItem({ onClick, danger, disabled, children }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`block w-full truncate rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-white/5 disabled:opacity-40 ${
        danger ? 'text-red-400' : 'text-gray-200'
      }`}
    >
      {children}
    </button>
  )
}
