import { MoreHorizontal } from 'lucide-react'
import { PopoverMenu } from './PopoverMenu'

interface CoverMenuProps {
  hasCover: boolean
  onChangeCover: () => void
  onRemoveCover: () => void
}

export function CoverMenu({ hasCover, onChangeCover, onRemoveCover }: CoverMenuProps) {
  return (
    <PopoverMenu
      width={160}
      trigger={({ onClick }) => (
        <button
          onClick={onClick}
          className="text-gray-500 transition-colors hover:text-white"
          aria-label="Cover options"
        >
          <MoreHorizontal size={18} />
        </button>
      )}
    >
      {(close) => (
        <>
          <button
            onClick={() => {
              onChangeCover()
              close()
            }}
            className="block w-full rounded px-2 py-1.5 text-left text-sm text-gray-200 transition-colors hover:bg-white/5"
          >
            Change cover
          </button>
          <button
            onClick={() => {
              onRemoveCover()
              close()
            }}
            disabled={!hasCover}
            className="block w-full rounded px-2 py-1.5 text-left text-sm text-gray-200 transition-colors hover:bg-white/5 disabled:opacity-40"
          >
            Remove cover
          </button>
        </>
      )}
    </PopoverMenu>
  )
}
