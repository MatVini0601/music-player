import { contextBridge, ipcRenderer } from 'electron'
import type { EqBand, LibraryApi, LibrarySort, ScanProgress, SortMode, UpdateEvent } from '../shared/types'

const api: LibraryApi = {
  pickFolder: () => ipcRenderer.invoke('library:pickFolder'),
  getLibraryRoots: () => ipcRenderer.invoke('library:getLibraryRoots'),
  removeLibraryRoot: (path: string) => ipcRenderer.invoke('library:removeLibraryRoot', path),
  scanLibrary: () => ipcRenderer.invoke('library:scanLibrary'),
  getTracks: () => ipcRenderer.invoke('library:getTracks'),
  onScanProgress: (callback: (progress: ScanProgress) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: ScanProgress): void =>
      callback(progress)
    ipcRenderer.on('library:scanProgress', listener)
    return () => ipcRenderer.removeListener('library:scanProgress', listener)
  },
  listPlaylists: () => ipcRenderer.invoke('playlist:list'),
  createPlaylist: (name: string) => ipcRenderer.invoke('playlist:create', name),
  renamePlaylist: (id: number, name: string) => ipcRenderer.invoke('playlist:rename', id, name),
  setPlaylistDescription: (id: number, description: string) =>
    ipcRenderer.invoke('playlist:setDescription', id, description),
  deletePlaylist: (id: number) => ipcRenderer.invoke('playlist:delete', id),
  getPlaylistTracks: (id: number) => ipcRenderer.invoke('playlist:getTracks', id),
  addTrackToPlaylist: (playlistId: number, trackId: number) =>
    ipcRenderer.invoke('playlist:addTrack', playlistId, trackId),
  removeTrackFromPlaylist: (playlistId: number, trackId: number) =>
    ipcRenderer.invoke('playlist:removeTrack', playlistId, trackId),
  reorderPlaylistTracks: (playlistId: number, orderedTrackIds: number[]) =>
    ipcRenderer.invoke('playlist:reorderTracks', playlistId, orderedTrackIds),
  getVolume: () => ipcRenderer.invoke('settings:getVolume'),
  setVolume: (volume: number) => ipcRenderer.invoke('settings:setVolume', volume),
  getAlbums: () => ipcRenderer.invoke('library:getAlbums'),
  getAlbumTracks: (albumId: number) => ipcRenderer.invoke('library:getAlbumTracks', albumId),
  setAlbumArt: (albumId: number) => ipcRenderer.invoke('artwork:setAlbumArt', albumId),
  clearAlbumArt: (albumId: number) => ipcRenderer.invoke('artwork:clearAlbumArt', albumId),
  setTrackArt: (trackId: number) => ipcRenderer.invoke('artwork:setTrackArt', trackId),
  clearTrackArt: (trackId: number) => ipcRenderer.invoke('artwork:clearTrackArt', trackId),
  setPlaylistArt: (playlistId: number) => ipcRenderer.invoke('artwork:setPlaylistArt', playlistId),
  clearPlaylistArt: (playlistId: number) =>
    ipcRenderer.invoke('artwork:clearPlaylistArt', playlistId),
  getAccentColor: () => ipcRenderer.invoke('settings:getAccentColor'),
  setAccentColor: (color: string) => ipcRenderer.invoke('settings:setAccentColor', color),
  getSidebarCollapsed: () => ipcRenderer.invoke('settings:getSidebarCollapsed'),
  setSidebarCollapsed: (collapsed: boolean) =>
    ipcRenderer.invoke('settings:setSidebarCollapsed', collapsed),
  getDominantColorBg: () => ipcRenderer.invoke('settings:getDominantColorBg'),
  setDominantColorBg: (enabled: boolean) =>
    ipcRenderer.invoke('settings:setDominantColorBg', enabled),
  getLibrarySort: () => ipcRenderer.invoke('settings:getLibrarySort'),
  setLibrarySort: (sort: LibrarySort | null) => ipcRenderer.invoke('settings:setLibrarySort', sort),
  getSortMode: () => ipcRenderer.invoke('settings:getSortMode'),
  setSortMode: (mode: SortMode) => ipcRenderer.invoke('settings:setSortMode', mode),
  getAudioOutput: () => ipcRenderer.invoke('settings:getAudioOutput'),
  setAudioOutput: (deviceId: string) => ipcRenderer.invoke('settings:setAudioOutput', deviceId),
  getLyrics: (trackId: number) => ipcRenderer.invoke('lyrics:getForTrack', trackId),
  setLyrics: (trackId: number, text: string) =>
    ipcRenderer.invoke('lyrics:setForTrack', trackId, text),
  clearLyrics: (trackId: number) => ipcRenderer.invoke('lyrics:clearForTrack', trackId),
  getEqBands: () => ipcRenderer.invoke('settings:getEqBands'),
  setEqBands: (bands: EqBand[]) => ipcRenderer.invoke('settings:setEqBands', bands),
  getTrackEq: (trackId: number) => ipcRenderer.invoke('trackEq:get', trackId),
  setTrackEq: (trackId: number, bands: EqBand[]) =>
    ipcRenderer.invoke('trackEq:set', trackId, bands),
  clearTrackEq: (trackId: number) => ipcRenderer.invoke('trackEq:clear', trackId),
  getTrackMetadata: (trackId: number) => ipcRenderer.invoke('library:getTrackMetadata', trackId),
  recordPlay: (trackId: number) => ipcRenderer.invoke('history:recordPlay', trackId),
  getRecentAlbums: () => ipcRenderer.invoke('library:getRecentAlbums'),
  getRecentTracks: () => ipcRenderer.invoke('library:getRecentTracks'),
  getAppVersion: () => ipcRenderer.invoke('updates:getAppVersion'),
  checkForUpdates: () => ipcRenderer.invoke('updates:check'),
  downloadUpdate: () => ipcRenderer.invoke('updates:download'),
  installUpdate: () => ipcRenderer.invoke('updates:install'),
  onUpdateEvent: (callback: (event: UpdateEvent) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, update: UpdateEvent): void =>
      callback(update)
    ipcRenderer.on('updates:event', listener)
    return () => ipcRenderer.removeListener('updates:event', listener)
  }
}

contextBridge.exposeInMainWorld('api', api)
