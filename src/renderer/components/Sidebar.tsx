import { useEffect, useState } from 'react'
import {
  ChevronsLeft,
  ChevronsRight,
  Disc3,
  Home,
  Library,
  Music,
  Plus,
  Settings,
  X
} from 'lucide-react'
import type { Playlist } from '../../shared/types'

export type SelectedView =
  | { type: 'home' }
  | { type: 'library' }
  | { type: 'albums' }
  | { type: 'album'; id: number }
  | { type: 'playlist'; id: number }
  | { type: 'settings' }

interface SidebarProps {
  playlists: Playlist[]
  selectedView: SelectedView
  onSelectView: (view: SelectedView) => void
  onCreatePlaylist: (name: string) => void
  onRenamePlaylist: (id: number, name: string) => void
  onDeletePlaylist: (id: number) => void
}

export function Sidebar({
  playlists,
  selectedView,
  onSelectView,
  onCreatePlaylist,
  onRenamePlaylist,
  onDeletePlaylist
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')

  useEffect(() => {
    window.api.getSidebarCollapsed().then(setIsCollapsed)
  }, [])

  const toggleCollapsed = (): void => {
    setIsCollapsed((v) => {
      const next = !v
      window.api.setSidebarCollapsed(next)
      return next
    })
  }

  const submitCreate = (): void => {
    const trimmed = newName.trim()
    if (trimmed) onCreatePlaylist(trimmed)
    setNewName('')
    setIsCreating(false)
  }

  const submitRename = (id: number): void => {
    const trimmed = editingName.trim()
    if (trimmed) onRenamePlaylist(id, trimmed)
    setEditingId(null)
  }

  const startCreating = (): void => {
    setIsCollapsed(false)
    setIsCreating(true)
  }

  const startRenaming = (playlist: Playlist): void => {
    setIsCollapsed(false)
    setEditingId(playlist.id)
    setEditingName(playlist.name)
  }

  return (
    <div
      className={`flex flex-shrink-0 flex-col border-r border-white/5 bg-surface/90 py-4 backdrop-blur-sm transition-all duration-200 ${
        isCollapsed ? 'w-16 px-2' : 'w-56 px-2'
      }`}
    >
      <button
        onClick={() => onSelectView({ type: 'home' })}
        title="Home"
        className={`flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
          isCollapsed ? 'justify-center' : ''
        } ${
          selectedView.type === 'home' ? 'bg-white/5 text-accent' : 'text-gray-300 hover:bg-white/5'
        }`}
      >
        <Home size={18} className="flex-shrink-0" />
        {!isCollapsed && 'Home'}
      </button>

      <button
        onClick={() => onSelectView({ type: 'library' })}
        title="Library"
        className={`mt-1 flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
          isCollapsed ? 'justify-center' : ''
        } ${
          selectedView.type === 'library'
            ? 'bg-white/5 text-accent'
            : 'text-gray-300 hover:bg-white/5'
        }`}
      >
        <Library size={18} className="flex-shrink-0" />
        {!isCollapsed && 'Library'}
      </button>

      <button
        onClick={() => onSelectView({ type: 'albums' })}
        title="Albums"
        className={`mt-1 flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
          isCollapsed ? 'justify-center' : ''
        } ${
          selectedView.type === 'albums' || selectedView.type === 'album'
            ? 'bg-white/5 text-accent'
            : 'text-gray-300 hover:bg-white/5'
        }`}
      >
        <Disc3 size={18} className="flex-shrink-0" />
        {!isCollapsed && 'Albums'}
      </button>

      <div className={`mt-4 flex items-center px-3 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && (
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Playlists
          </span>
        )}
        <button
          onClick={startCreating}
          className="text-gray-400 transition-colors hover:text-white"
          aria-label="New playlist"
          title="New playlist"
        >
          <Plus size={16} />
        </button>
      </div>

      {isCreating && (
        <input
          autoFocus
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitCreate()
            if (e.key === 'Escape') {
              setNewName('')
              setIsCreating(false)
            }
          }}
          onBlur={submitCreate}
          placeholder="Playlist name"
          className="mx-2 mt-1 rounded-md bg-white/5 px-2 py-1 text-sm text-gray-100 outline-none"
        />
      )}

      <div className={`mt-1 flex flex-col gap-0.5 ${isCollapsed ? 'items-center' : ''}`}>
        {playlists.map((playlist) =>
          isCollapsed ? (
            <button
              key={playlist.id}
              onClick={() => onSelectView({ type: 'playlist', id: playlist.id })}
              onDoubleClick={() => startRenaming(playlist)}
              title={playlist.name}
              className={`h-10 w-10 flex-shrink-0 overflow-hidden rounded transition-shadow ${
                selectedView.type === 'playlist' && selectedView.id === playlist.id
                  ? 'ring-2 ring-accent'
                  : 'bg-white/5 hover:ring-1 hover:ring-white/20'
              }`}
            >
              {playlist.artDataUrl ? (
                <img src={playlist.artDataUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-500">
                  <Music size={16} />
                </div>
              )}
            </button>
          ) : (
            <div
              key={playlist.id}
              className={`group flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                selectedView.type === 'playlist' && selectedView.id === playlist.id
                  ? 'bg-white/5 text-accent'
                  : 'text-gray-300 hover:bg-white/5'
              }`}
            >
              {editingId === playlist.id ? (
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitRename(playlist.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  onBlur={() => submitRename(playlist.id)}
                  className="min-w-0 flex-1 rounded bg-surface px-1 text-gray-100 outline-none"
                />
              ) : (
                <button
                  onClick={() => onSelectView({ type: 'playlist', id: playlist.id })}
                  onDoubleClick={() => startRenaming(playlist)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="h-7 w-7 flex-shrink-0 overflow-hidden rounded bg-white/5">
                    {playlist.artDataUrl ? (
                      <img
                        src={playlist.artDataUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-gray-500">
                        <Music size={14} />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {playlist.name}
                    <span className="ml-1 text-xs text-gray-500">({playlist.trackCount})</span>
                  </span>
                </button>
              )}
              <button
                onClick={() => {
                  if (confirm(`Delete playlist "${playlist.name}"?`)) onDeletePlaylist(playlist.id)
                }}
                className="ml-2 hidden text-gray-500 transition-colors hover:text-red-400 group-hover:block"
                aria-label="Delete playlist"
              >
                <X size={14} />
              </button>
            </div>
          )
        )}
      </div>

      <div className="mt-auto flex flex-col gap-1">
        <button
          onClick={() => onSelectView({ type: 'settings' })}
          title="Settings"
          aria-label="Open settings"
          className={`flex justify-center rounded-md py-2 transition-colors hover:bg-white/5 hover:text-white ${
            selectedView.type === 'settings' ? 'text-accent' : 'text-gray-500'
          }`}
        >
          <Settings size={16} />
        </button>
        <button
          onClick={toggleCollapsed}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex justify-center rounded-md py-2 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
        >
          {isCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>
    </div>
  )
}
