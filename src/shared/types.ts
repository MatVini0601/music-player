export interface Track {
  id: number
  filePath: string
  title: string
  artist: string
  album: string
  albumArtist: string
  trackNo: number | null
  durationSeconds: number
  format: 'mp3' | 'flac'
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
}

export interface LyricsLine {
  time: number | null
  text: string
}

export interface LyricsResult {
  isSynced: boolean
  lines: LyricsLine[]
}

export interface EqBand {
  frequency: number
  q: number
  gain: number
}

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
  getLyrics(trackId: number): Promise<LyricsResult | null>
  setLyrics(trackId: number, text: string): Promise<LyricsResult>
  clearLyrics(trackId: number): Promise<void>
  getEqBands(): Promise<EqBand[]>
  setEqBands(bands: EqBand[]): Promise<void>
  getTrackEq(trackId: number): Promise<EqBand[] | null>
  setTrackEq(trackId: number, bands: EqBand[]): Promise<void>
  clearTrackEq(trackId: number): Promise<void>
  getTrackMetadata(trackId: number): Promise<TrackMetadata | null>
  recordPlay(trackId: number): Promise<void>
  getRecentAlbums(): Promise<Album[]>
  getRecentTracks(): Promise<Track[]>
}
