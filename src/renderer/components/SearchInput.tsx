import { Search, X } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className = 'w-56 flex-shrink-0'
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md bg-white/5 py-1.5 pl-8 pr-7 text-sm text-gray-100 outline-none placeholder:text-gray-500"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-white"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
