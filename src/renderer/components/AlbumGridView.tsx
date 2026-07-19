import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Check, ListFilter, User } from 'lucide-react'
import type { Album } from '../../shared/types'
import { SearchInput } from './SearchInput'
import { PopoverMenu } from './PopoverMenu'
import { MenuItem } from './MenuItem'

interface AlbumGridViewProps {
  albums: Album[]
  onSelectAlbum: (albumId: number) => void
}

const FILTER_MENU_MAX_ROWS = 10

// The view unmounts whenever another tab (or the Lyrics page) takes over the content area;
// keeping the last scroll position at module level lets a remount restore it. Session-only.
let savedScrollTop = 0

/** Case-insensitive dedupe (first spelling wins), alphabetized; empties dropped. */
function uniqueSorted(values: string[]): string[] {
  const byKey = new Map<string, string>()
  for (const value of values) {
    const trimmed = value.trim()
    const key = trimmed.toLowerCase()
    if (key && !byKey.has(key)) byKey.set(key, trimmed)
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b))
}

interface FilterDropdownProps {
  icon: ReactNode
  options: string[]
  selected: string | null
  allLabel: string
  searchPlaceholder: string
  emptyText: string
  onChange: (value: string | null) => void
}

function FilterDropdown({
  icon,
  options,
  selected,
  allLabel,
  searchPlaceholder,
  emptyText,
  onChange
}: FilterDropdownProps) {
  return (
    <PopoverMenu
      width={224}
      trigger={({ onClick }) => (
        <button
          onClick={onClick}
          className={`flex flex-shrink-0 items-center gap-1.5 rounded-md py-1.5 pl-2.5 pr-3 text-sm transition-colors ${
            selected ? 'bg-white/5 text-accent' : 'bg-white/5 text-gray-100 hover:bg-white/10'
          }`}
        >
          {icon}
          <span className="max-w-40 truncate">{selected ?? allLabel}</span>
        </button>
      )}
    >
      {(close) => (
        <FilterMenu
          options={options}
          selected={selected}
          allLabel={allLabel}
          searchPlaceholder={searchPlaceholder}
          emptyText={emptyText}
          onPick={onChange}
          close={close}
        />
      )}
    </PopoverMenu>
  )
}

interface FilterMenuProps extends Omit<FilterDropdownProps, 'icon' | 'onChange'> {
  onPick: (value: string | null) => void
  close: () => void
}

function FilterMenu({
  options,
  selected,
  allLabel,
  searchPlaceholder,
  emptyText,
  onPick,
  close
}: FilterMenuProps) {
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const matches = q ? options.filter((o) => o.toLowerCase().includes(q)) : options
  const visible = matches.slice(0, FILTER_MENU_MAX_ROWS)
  const hiddenCount = matches.length - visible.length

  const pick = (value: string | null) => {
    onPick(value)
    close()
  }

  return (
    <div>
      <div className="p-1 pb-1.5">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={searchPlaceholder}
          className="w-full"
          autoFocus
        />
      </div>
      <MenuItem onClick={() => pick(null)}>
        <span className="flex items-center justify-between gap-2">
          {allLabel}
          {!selected && <Check size={14} className="flex-shrink-0 text-accent" />}
        </span>
      </MenuItem>
      {visible.map((option) => (
        <MenuItem key={option} onClick={() => pick(option)}>
          <span className="flex items-center justify-between gap-2">
            <span className="truncate">{option}</span>
            {selected?.toLowerCase() === option.toLowerCase() && (
              <Check size={14} className="flex-shrink-0 text-accent" />
            )}
          </span>
        </MenuItem>
      ))}
      {matches.length === 0 && <div className="px-2 py-1.5 text-sm text-gray-500">{emptyText}</div>}
      {hiddenCount > 0 && (
        <div className="px-2 py-1.5 text-xs text-gray-500">
          +{hiddenCount} more — keep typing to narrow down
        </div>
      )}
    </div>
  )
}

export function AlbumGridView({ albums, onSelectAlbum }: AlbumGridViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [genreFilter, setGenreFilter] = useState<string | null>(null)
  const [artistFilter, setArtistFilter] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const hasAlbums = albums.length > 0
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el && savedScrollTop > 0) el.scrollTop = savedScrollTop
  }, [hasAlbums])

  const allGenres = useMemo(() => uniqueSorted(albums.flatMap((a) => a.genres)), [albums])
  const allArtists = useMemo(() => uniqueSorted(albums.map((a) => a.albumArtist)), [albums])

  const query = searchQuery.trim().toLowerCase()
  const genreKey = genreFilter?.toLowerCase()
  const artistKey = artistFilter?.toLowerCase()
  const filteredAlbums = useMemo(
    () =>
      albums.filter((a) => {
        if (genreKey && !a.genres.some((g) => g.toLowerCase() === genreKey)) return false
        if (artistKey && a.albumArtist.trim().toLowerCase() !== artistKey) return false
        if (query && !a.title.toLowerCase().includes(query) && !a.albumArtist.toLowerCase().includes(query)) {
          return false
        }
        return true
      }),
    [albums, query, genreKey, artistKey]
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-4 px-6 py-6">
        <h1 className="flex-shrink-0 text-lg font-semibold">Albums</h1>
        {albums.length > 0 && (
          <div className="flex items-center gap-2">
            {allGenres.length > 0 && (
              <FilterDropdown
                icon={<ListFilter size={14} />}
                options={allGenres}
                selected={genreFilter}
                allLabel="All genres"
                searchPlaceholder="Search genres…"
                emptyText="No genres found."
                onChange={setGenreFilter}
              />
            )}
            {allArtists.length > 0 && (
              <FilterDropdown
                icon={<User size={14} />}
                options={allArtists}
                selected={artistFilter}
                allLabel="All artists"
                searchPlaceholder="Search artists…"
                emptyText="No artists found."
                onChange={setArtistFilter}
              />
            )}
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search albums…"
            />
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          savedScrollTop = e.currentTarget.scrollTop
        }}
        className="flex-1 overflow-y-auto px-6 pb-6"
      >
        {albums.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-500">
            <p>No albums yet.</p>
            <p className="text-sm">Scan a folder from the Library view to get started.</p>
          </div>
        ) : filteredAlbums.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-500">
            <p>
              {searchQuery
                ? `No albums match "${searchQuery}".`
                : genreFilter && artistFilter
                  ? 'No albums match the current filters.'
                  : genreFilter
                    ? `No albums in genre "${genreFilter}".`
                    : `No albums by "${artistFilter}".`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-5">
            {filteredAlbums.map((album) => (
              <button
                key={album.id}
                onClick={() => onSelectAlbum(album.id)}
                className="flex flex-col items-start gap-2 rounded-md p-2 text-left transition-colors hover:bg-white/5"
              >
                <div className="aspect-square w-full overflow-hidden rounded bg-white/5">
                  {album.artUrl && (
                    <img
                      src={album.artUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 w-full">
                  <div className="truncate text-sm font-medium text-gray-200">{album.title}</div>
                  <div className="truncate text-xs text-gray-500">
                    {album.albumArtist || 'Unknown artist'} · {album.trackCount} track
                    {album.trackCount === 1 ? '' : 's'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
