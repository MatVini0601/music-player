import type { ShortcutMap } from './shortcuts'

export interface Track {
  id: number
  filePath: string
  title: string
  artist: string
  album: string
  albumArtist: string
  /** Comma-joined when the file has multiple genre tags; '' when the file has none. */
  genre: string
  trackNo: number | null
  durationSeconds: number
  format: string
  artUrl: string | null
  mediaUrl: string
  addedAt: string
}

export interface ScanProgress {
  scanned: number
  total: number
  currentFile: string
}

export interface ScanResult {
  addedOrUpdated: number
  removed: number
  totalTracks: number
  /** Directories that couldn't be read and files that couldn't be parsed — skipped, not fatal. */
  failedPaths: string[]
}

export interface Playlist {
  id: number
  name: string
  description: string | null
  artUrl: string | null
  trackCount: number
}

export interface Album {
  id: number
  title: string
  albumArtist: string
  artUrl: string | null
  trackCount: number
  /** Distinct genres across the album's tracks, alphabetized; multi-genre tags are split. */
  genres: string[]
}

export interface LyricsLine {
  time: number | null
  text: string
}

export interface LyricsResult {
  isSynced: boolean
  lines: LyricsLine[]
}

export interface SaveLyricsResult extends LyricsResult {
  /** Non-null when writing the lyrics into the audio file's tags failed (e.g. unsupported
   *  format like WAV/WebM). The lyrics are still saved in the app's database regardless. */
  embedError: string | null
}

export interface EqBand {
  frequency: number
  q: number
  gain: number
}

export type EqExportResult =
  | { status: 'saved'; filePath: string; trackCount: number }
  | { status: 'canceled' }

export type EqImportResult =
  | {
      status: 'imported'
      /** Entries in the file, valid or not. */
      totalEntries: number
      /** Entries that matched at least one track in this library. */
      matchedEntries: number
      /** Distinct tracks that received an EQ (one entry can match duplicates). */
      appliedTracks: number
      globalApplied: boolean
    }
  | { status: 'canceled' }
  | { status: 'error'; message: string }

export interface TrackMetadata {
  title: string | null
  artist: string | null
  album: string | null
  albumArtist: string | null
  trackNo: number | null
  trackOf: number | null
  discNo: number | null
  discOf: number | null
  year: number | null
  genre: string | null
  composer: string | null
  durationSeconds: number | null
  container: string | null
  codec: string | null
  bitrateKbps: number | null
  sampleRateHz: number | null
  bitsPerSample: number | null
  lossless: boolean | null
  filePath: string
}

export interface LibrarySort {
  key: 'title' | 'album' | 'added' | 'duration'
  direction: 'asc' | 'desc'
}

/** How text columns alphabetize: as-is, or ignoring punctuation and a leading "The". */
export type SortMode = 'normal' | 'ignoreSpecials'

export type UpdateEvent =
  | { type: 'available'; version: string }
  | { type: 'upToDate' }
  | { type: 'downloading'; percent: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string }

export interface LibraryApi {
  pickFolder(): Promise<string | null>
  getLibraryRoots(): Promise<string[]>
  removeLibraryRoot(path: string): Promise<void>
  scanLibrary(): Promise<ScanResult>
  getTracks(): Promise<Track[]>
  onScanProgress(callback: (progress: ScanProgress) => void): () => void
  listPlaylists(): Promise<Playlist[]>
  createPlaylist(name: string): Promise<Playlist>
  renamePlaylist(id: number, name: string): Promise<void>
  setPlaylistDescription(id: number, description: string): Promise<void>
  deletePlaylist(id: number): Promise<void>
  getPlaylistTracks(id: number): Promise<Track[]>
  addTrackToPlaylist(playlistId: number, trackId: number): Promise<void>
  removeTrackFromPlaylist(playlistId: number, trackId: number): Promise<void>
  reorderPlaylistTracks(playlistId: number, orderedTrackIds: number[]): Promise<void>
  getVolume(): Promise<number>
  setVolume(volume: number): Promise<void>
  getAlbums(): Promise<Album[]>
  getAlbumTracks(albumId: number): Promise<Track[]>
  setAlbumArt(albumId: number): Promise<string | null>
  clearAlbumArt(albumId: number): Promise<void>
  setTrackArt(trackId: number): Promise<string | null>
  clearTrackArt(trackId: number): Promise<void>
  setPlaylistArt(playlistId: number): Promise<string | null>
  clearPlaylistArt(playlistId: number): Promise<void>
  getAccentColor(): Promise<string>
  setAccentColor(color: string): Promise<void>
  getSidebarCollapsed(): Promise<boolean>
  setSidebarCollapsed(collapsed: boolean): Promise<void>
  getDominantColorBg(): Promise<boolean>
  setDominantColorBg(enabled: boolean): Promise<void>
  getLibrarySort(): Promise<LibrarySort | null>
  setLibrarySort(sort: LibrarySort | null): Promise<void>
  getSortMode(): Promise<SortMode>
  setSortMode(mode: SortMode): Promise<void>
  /** Audio output device id; '' means the system default. */
  getAudioOutput(): Promise<string>
  setAudioOutput(deviceId: string): Promise<void>
  /** Keyboard shortcut bindings; always a full map (unknown/missing actions get defaults). */
  getShortcuts(): Promise<ShortcutMap>
  setShortcuts(map: ShortcutMap): Promise<void>
  /** Last app version this user ran; '' on first launch. Drives the "What's new" popup. */
  getLastSeenVersion(): Promise<string>
  setLastSeenVersion(version: string): Promise<void>
  getLyrics(trackId: number): Promise<LyricsResult | null>
  setLyrics(trackId: number, text: string): Promise<SaveLyricsResult>
  clearLyrics(trackId: number): Promise<void>
  getEqBands(): Promise<EqBand[]>
  setEqBands(bands: EqBand[]): Promise<void>
  getTrackEq(trackId: number): Promise<EqBand[] | null>
  setTrackEq(trackId: number, bands: EqBand[]): Promise<void>
  clearTrackEq(trackId: number): Promise<void>
  /** Save/open dialogs run in the main process; both resolve after the user picks a file. */
  exportEq(): Promise<EqExportResult>
  importEq(): Promise<EqImportResult>
  getTrackMetadata(trackId: number): Promise<TrackMetadata | null>
  recordPlay(trackId: number): Promise<void>
  getRecentAlbums(): Promise<Album[]>
  getRecentTracks(): Promise<Track[]>
  getAppVersion(): Promise<string>
  checkForUpdates(): Promise<void>
  downloadUpdate(): Promise<void>
  installUpdate(): Promise<void>
  onUpdateEvent(callback: (event: UpdateEvent) => void): () => void
}
