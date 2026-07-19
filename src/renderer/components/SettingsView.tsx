import { useEffect, useState } from 'react'
import {
  ChevronDown,
  Download,
  FolderPlus,
  Info,
  RefreshCw,
  RotateCcw,
  Trash2,
  Upload
} from 'lucide-react'
import type { EqBand, SortMode } from '../../shared/types'
import type { ShortcutAction, ShortcutMap } from '../../shared/shortcuts'
import type { UpdateStatus } from '../hooks/useAppUpdates'
import { eventToBinding, formatBinding } from '../utils/shortcuts'
import { useOutputDevices } from '../hooks/useOutputDevices'
import { EqBandsEditor } from './EqBandsEditor'
import { PopoverMenu } from './PopoverMenu'
import { AudioOutputMenu } from './AudioOutputMenu'
import { ConfirmModal } from './ConfirmModal'

const ACCENT_PRESETS = [
  '#1db954', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308' // yellow
]

interface SettingsViewProps {
  eqBands: EqBand[]
  onChangeEqBand: (bandIndex: number, patch: Partial<EqBand>) => void
  onResetEq: () => void
  libraryRoots: string[]
  isScanning: boolean
  onAddFolder: () => void
  onRemoveFolder: (path: string) => void
  accentColor: string
  onChangeAccentColor: (color: string) => void
  dominantColorBg: boolean
  onChangeDominantColorBg: (enabled: boolean) => void
  sortMode: SortMode
  onChangeSortMode: (mode: SortMode) => void
  onEqImported: () => void
  shortcuts: ShortcutMap
  onChangeShortcut: (action: ShortcutAction, binding: string) => void
  onResetShortcuts: () => void
  audioOutputId: string
  onChangeAudioOutput: (deviceId: string) => void
  appVersion: string
  updateStatus: UpdateStatus
  onCheckForUpdates: () => void
}

const SORT_MODE_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'ignoreSpecials', label: 'Ignore specials and "The"' }
]

const SHORTCUT_ROWS: { action: ShortcutAction; label: string }[] = [
  { action: 'playPause', label: 'Play / pause' },
  { action: 'previous', label: 'Previous track' },
  { action: 'next', label: 'Next track' },
  { action: 'seekBack', label: 'Seek back 5 seconds' },
  { action: 'seekForward', label: 'Seek forward 5 seconds' },
  { action: 'volumeDown', label: 'Volume down' },
  { action: 'volumeUp', label: 'Volume up' },
  { action: 'toggleMute', label: 'Mute / unmute' },
  { action: 'toggleShuffle', label: 'Toggle shuffle' },
  { action: 'toggleRepeat', label: 'Cycle repeat mode' },
  { action: 'toggleFullscreen', label: 'Fullscreen player' },
  { action: 'toggleLyrics', label: 'Lyrics view' },
  { action: 'toggleQueue', label: 'Queue panel' }
]

function updateStatusText(status: UpdateStatus): string {
  switch (status.phase) {
    case 'idle':
      return ''
    case 'checking':
      return 'Checking for updates…'
    case 'upToDate':
      return "You're on the latest version."
    case 'available':
      return `Version ${status.version} is available.`
    case 'downloading':
      return `Downloading update… ${Math.round(status.percent)}%`
    case 'downloaded':
      return `Version ${status.version} downloaded — restart the app to apply it.`
    case 'error':
      return `Update check failed: ${status.message}`
  }
}

export function SettingsView({
  eqBands,
  onChangeEqBand,
  onResetEq,
  libraryRoots,
  isScanning,
  onAddFolder,
  onRemoveFolder,
  accentColor,
  onChangeAccentColor,
  dominantColorBg,
  onChangeDominantColorBg,
  sortMode,
  onChangeSortMode,
  onEqImported,
  shortcuts,
  onChangeShortcut,
  onResetShortcuts,
  audioOutputId,
  onChangeAudioOutput,
  appVersion,
  updateStatus,
  onCheckForUpdates
}: SettingsViewProps) {
  const updateStatusLine = updateStatusText(updateStatus)
  const isUpdateBusy = updateStatus.phase === 'checking' || updateStatus.phase === 'downloading'
  const outputDevices = useOutputDevices()
  const currentOutputLabel = audioOutputId
    ? (outputDevices.find((d) => d.deviceId === audioOutputId)?.label ?? 'Unavailable device')
    : 'System default'
  const [removingFolder, setRemovingFolder] = useState<string | null>(null)
  const [rebindingAction, setRebindingAction] = useState<ShortcutAction | null>(null)
  const [eqTransferStatus, setEqTransferStatus] = useState<{
    text: string
    isError: boolean
  } | null>(null)
  const [showEqTransferHelp, setShowEqTransferHelp] = useState(false)

  const handleExportEq = async (): Promise<void> => {
    const result = await window.api.exportEq()
    if (result.status === 'canceled') return
    setEqTransferStatus({
      text:
        result.trackCount === 0
          ? 'Exported the global EQ. No tracks had their own EQ set.'
          : `Exported the global EQ and ${result.trackCount} per-track EQ${result.trackCount === 1 ? '' : 's'}.`,
      isError: false
    })
  }

  const handleImportEq = async (): Promise<void> => {
    const result = await window.api.importEq()
    if (result.status === 'canceled') return
    if (result.status === 'error') {
      setEqTransferStatus({ text: result.message, isError: true })
      return
    }
    onEqImported()
    const unmatched = result.totalEntries - result.matchedEntries
    const parts: string[] = []
    if (result.globalApplied) parts.push('global EQ applied')
    if (result.appliedTracks > 0) {
      parts.push(`EQ set on ${result.appliedTracks} track${result.appliedTracks === 1 ? '' : 's'}`)
    }
    if (unmatched > 0) parts.push(`${unmatched} entr${unmatched === 1 ? 'y' : 'ies'} matched no track in this library`)
    setEqTransferStatus({
      text: parts.length > 0 ? `Imported — ${parts.join(', ')}.` : 'The file contained no EQ settings to import.',
      isError: false
    })
  }

  // While rebinding, the next keypress becomes the new binding. Capture phase +
  // preventDefault keeps the press away from the global shortcut handler (it skips
  // defaultPrevented events) and from activating the focused button.
  useEffect(() => {
    if (!rebindingAction) return
    const onKeyDown = (e: KeyboardEvent): void => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') {
        setRebindingAction(null)
        return
      }
      const binding = eventToBinding(e)
      if (!binding) return // a lone modifier — keep waiting for the real key
      onChangeShortcut(rebindingAction, binding)
      setRebindingAction(null)
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [rebindingAction, onChangeShortcut])

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <div className="mt-4 flex flex-col divide-y divide-white/5">
        <section className="py-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Equalizer
            </h2>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowEqTransferHelp((v) => !v)}
                title="How export and import work"
                aria-label="How export and import work"
                aria-expanded={showEqTransferHelp}
                className={`flex items-center gap-1.5 text-sm transition-colors ${
                  showEqTransferHelp ? 'text-accent' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Info size={14} />
              </button>
              <button
                onClick={handleExportEq}
                title="Export the global and per-track EQ settings to a file"
                aria-label="Export equalizer settings"
                className="flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
              >
                <Download size={14} />
                Export
              </button>
              <button
                onClick={handleImportEq}
                title="Import EQ settings from an exported file"
                aria-label="Import equalizer settings"
                className="flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
              >
                <Upload size={14} />
                Import
              </button>
              <button
                onClick={onResetEq}
                title="Reset"
                aria-label="Reset equalizer"
                className="flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
              >
                <RotateCcw size={14} />
                Reset
              </button>
            </div>
          </div>
          {showEqTransferHelp && (
            <div className="mb-6 rounded-md bg-white/5 p-4 text-sm text-gray-400">
              <p>
                <span className="text-gray-300">Export</span> saves your global EQ and every
                per-track EQ into a single file you can copy to another PC.
              </p>
              <p className="mt-2">
                <span className="text-gray-300">Import</span> reads that file and applies the
                global EQ right away. Each per-track EQ is then matched to the library on this
                PC: first by the exact file location, and if the files live somewhere else here,
                by their tags — same title, artist, and album, with a similar duration.
              </p>
              <p className="mt-2">
                Songs from the file that aren&apos;t in this library yet are skipped and counted,
                not lost — add them to the library and import the same file again. Importing
                never changes the file or your music.
              </p>
            </div>
          )}
          <EqBandsEditor
            bands={eqBands}
            onChangeBand={onChangeEqBand}
            className="w-full auto-cols-fr"
          />
          {eqTransferStatus && (
            <p
              className={`mt-4 text-sm ${eqTransferStatus.isError ? 'text-amber-500' : 'text-gray-500'}`}
            >
              {eqTransferStatus.text}
            </p>
          )}
        </section>

        <section className="py-8">
          <h2 className="mb-6 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Audio output
          </h2>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-gray-300">Output device</p>
              <p className="mt-1 text-sm text-gray-500">
                Where the player sends its audio. Changes apply immediately.
              </p>
            </div>
            <PopoverMenu
              width={288}
              trigger={({ onClick }) => (
                <button
                  onClick={onClick}
                  className="flex max-w-72 flex-shrink-0 items-center gap-2 rounded-md bg-white/5 py-1.5 pl-3 pr-2.5 text-sm text-gray-100 transition-colors hover:bg-white/10"
                >
                  <span className="truncate">{currentOutputLabel}</span>
                  <ChevronDown size={14} className="flex-shrink-0 text-gray-500" />
                </button>
              )}
            >
              {(close) => (
                <AudioOutputMenu
                  audioOutputId={audioOutputId}
                  onChange={onChangeAudioOutput}
                  close={close}
                />
              )}
            </PopoverMenu>
          </div>
        </section>

        <section className="py-8">
          <h2 className="mb-6 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Accent color
          </h2>
          <div className="flex items-center gap-3">
            {ACCENT_PRESETS.map((color) => (
              <button
                key={color}
                onClick={() => onChangeAccentColor(color)}
                title={color}
                aria-label={`Set accent color ${color}`}
                className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${
                  accentColor.toLowerCase() === color
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-surface'
                    : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
            <label
              title="Custom color"
              className={`relative h-7 w-7 cursor-pointer overflow-hidden rounded-full transition-transform hover:scale-110 ${
                ACCENT_PRESETS.includes(accentColor.toLowerCase())
                  ? ''
                  : 'ring-2 ring-white ring-offset-2 ring-offset-surface'
              }`}
              style={{
                background: ACCENT_PRESETS.includes(accentColor.toLowerCase())
                  ? 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)'
                  : accentColor
              }}
            >
              <input
                type="color"
                value={accentColor}
                onChange={(e) => onChangeAccentColor(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Pick a custom accent color"
              />
            </label>
          </div>
        </section>

        <section className="py-8">
          <h2 className="mb-6 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Display
          </h2>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-gray-300">Background from album art</p>
              <p className="mt-1 text-sm text-gray-500">
                Tint the fullscreen player and lyrics view with the cover&apos;s dominant color.
              </p>
            </div>
            <button
              role="switch"
              aria-checked={dominantColorBg}
              aria-label="Toggle background from album art"
              onClick={() => onChangeDominantColorBg(!dominantColorBg)}
              className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${
                dominantColorBg ? 'bg-accent' : 'bg-white/10'
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                  dominantColorBg ? 'translate-x-4' : ''
                }`}
              />
            </button>
          </div>
        </section>

        <section className="py-8">
          <h2 className="mb-6 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Sorting
          </h2>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-gray-300">Ordering type</p>
              <p className="mt-1 text-sm text-gray-500">
                &quot;Ignore specials and &apos;The&apos;&quot; alphabetizes titles and albums
                ignoring punctuation and a leading &quot;The&quot;, so &quot;(Don&apos;t Fear) The
                Reaper&quot; sorts under D.
              </p>
            </div>
            <div className="flex flex-shrink-0 gap-0.5 rounded-md bg-white/5 p-0.5">
              {SORT_MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onChangeSortMode(option.value)}
                  className={`rounded px-3 py-1.5 text-sm transition-colors ${
                    sortMode === option.value
                      ? 'bg-white/10 text-accent'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="py-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Keyboard shortcuts
            </h2>
            <button
              onClick={onResetShortcuts}
              className="flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
            >
              <RotateCcw size={14} />
              Reset to defaults
            </button>
          </div>
          <p className="mb-4 text-sm text-gray-500">
            Click a shortcut, then press the new key combination — Esc cancels. Assigning a key
            that is already in use unbinds it from the other action.
          </p>
          <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            {SHORTCUT_ROWS.map(({ action, label }) => {
              const isRebinding = rebindingAction === action
              const binding = shortcuts[action]
              return (
                <div
                  key={action}
                  className="-mx-3 flex items-center justify-between gap-4 rounded-md px-3 py-2 transition-colors hover:bg-white/5"
                >
                  <span className="text-sm text-gray-300">{label}</span>
                  <button
                    onClick={() => setRebindingAction(isRebinding ? null : action)}
                    aria-label={`Change shortcut for ${label}`}
                    className={`flex-shrink-0 rounded-md px-2.5 py-1 font-mono text-xs transition-colors ${
                      isRebinding
                        ? 'bg-white/10 text-accent ring-1 ring-accent'
                        : binding
                          ? 'bg-white/5 text-gray-100 hover:bg-white/10'
                          : 'bg-white/5 italic text-gray-500 hover:bg-white/10'
                    }`}
                  >
                    {isRebinding ? 'Press a key…' : binding ? formatBinding(binding) : 'Not set'}
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        <section className="py-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Library folders
            </h2>
            <button
              onClick={onAddFolder}
              disabled={isScanning}
              className="flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white disabled:opacity-40"
            >
              <FolderPlus size={14} />
              Add folder
            </button>
          </div>

          {libraryRoots.length === 0 ? (
            <p className="text-sm text-gray-500">
              No folders yet. Add a folder with MP3, FLAC, M4A, AAC, WAV, OGG, Opus, or WebM
              files to build your library.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {libraryRoots.map((path) => (
                <div
                  key={path}
                  className="group -mx-3 flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-white/5"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-gray-300" title={path}>
                    {path}
                  </span>
                  <button
                    onClick={() => setRemovingFolder(path)}
                    disabled={isScanning}
                    title="Remove folder"
                    aria-label={`Remove folder ${path}`}
                    className="hidden flex-shrink-0 text-gray-500 transition-colors hover:text-red-400 disabled:opacity-40 group-hover:block"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="py-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">About</h2>
            <button
              onClick={onCheckForUpdates}
              disabled={isUpdateBusy}
              className="flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white disabled:opacity-40"
            >
              <RefreshCw size={14} className={isUpdateBusy ? 'animate-spin' : ''} />
              Check for updates
            </button>
          </div>
          <p className="text-sm text-gray-300">Fermata {appVersion ? `v${appVersion}` : ''}</p>
          {updateStatusLine && (
            <p
              className={`mt-1 text-sm ${
                updateStatus.phase === 'error' ? 'text-amber-500' : 'text-gray-500'
              }`}
            >
              {updateStatusLine}
            </p>
          )}
        </section>
      </div>

      {removingFolder && (
        <ConfirmModal
          title="Remove folder"
          confirmLabel="Remove"
          message={
            <>
              Remove <span className="break-all text-white">&quot;{removingFolder}&quot;</span> from
              the library? Its tracks will be removed from the library (the files stay on disk).
            </>
          }
          onConfirm={() => {
            onRemoveFolder(removingFolder)
            setRemovingFolder(null)
          }}
          onCancel={() => setRemovingFolder(null)}
        />
      )}
    </div>
  )
}
