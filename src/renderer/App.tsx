import { useEffect, useState } from 'react'
import { useLibrary } from './hooks/useLibrary'
import { usePlayer } from './hooks/usePlayer'
import { usePlaylists } from './hooks/usePlaylists'
import { useAlbums } from './hooks/useAlbums'
import { useHomeData } from './hooks/useHomeData'
import { useAccentColor } from './hooks/useAccentColor'
import { HomeView } from './components/HomeView'
import { LibraryView } from './components/LibraryView'
import { PlaylistView } from './components/PlaylistView'
import { AlbumGridView } from './components/AlbumGridView'
import { AlbumView } from './components/AlbumView'
import { NowPlayingBar } from './components/NowPlayingBar'
import { NowPlayingPanel } from './components/NowPlayingPanel'
import { QueuePanel } from './components/QueuePanel'
import { LyricsView } from './components/LyricsView'
import { FullscreenPlayer } from './components/FullscreenPlayer'
import { SettingsView } from './components/SettingsView'
import { TrackEqModal } from './components/TrackEqModal'
import { Sidebar, type SelectedView } from './components/Sidebar'
import type { Track } from '../shared/types'

export default function App() {
  const {
    tracks,
    isScanning,
    scanProgress,
    libraryRoots,
    hasLibraryRoots,
    pickFolderAndScan,
    removeFolder,
    rescan
  } = useLibrary()
  const player = usePlayer()
  const { playlists, refresh, createPlaylist, renamePlaylist, deletePlaylist, setPlaylistDescription } =
    usePlaylists()
  const { albums, refresh: refreshAlbums } = useAlbums()
  const { recentAlbums, recentTracks, refresh: refreshHomeData } = useHomeData()
  const { accentColor, setAccentColor } = useAccentColor()
  const [selectedView, setSelectedView] = useState<SelectedView>({ type: 'home' })
  const [rightPanel, setRightPanel] = useState<'nowPlaying' | 'queue' | null>(null)
  const [isLyricsViewOpen, setIsLyricsViewOpen] = useState(false)
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false)
  const [eqTrack, setEqTrack] = useState<Track | null>(null)

  useEffect(() => {
    if (!isFullscreenOpen) return
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setIsFullscreenOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreenOpen])

  useEffect(() => {
    if (player.currentTrack) refreshHomeData()
  }, [player.currentTrack?.id, refreshHomeData])

  const toggleRightPanel = (panel: 'nowPlaying' | 'queue'): void => {
    setRightPanel((current) => (current === panel ? null : panel))
  }

  const handleSelectView = (view: SelectedView): void => {
    setIsLyricsViewOpen(false)
    setSelectedView(view)
  }

  const scanLabel = scanProgress
    ? `Scanning ${scanProgress.scanned}/${scanProgress.total}…`
    : null

  const handleDeletePlaylist = async (id: number): Promise<void> => {
    await deletePlaylist(id)
    if (selectedView.type === 'playlist' && selectedView.id === id) {
      setSelectedView({ type: 'library' })
    }
  }

  const handleRemoveFolder = async (path: string): Promise<void> => {
    await removeFolder(path)
    // Dropping a folder's tracks cascades into albums, playlists, and play history.
    await Promise.all([refreshAlbums(), refresh(), refreshHomeData()])
  }

  const handlePickFolderAndScan = async (): Promise<void> => {
    await pickFolderAndScan()
    await Promise.all([refreshAlbums(), refreshHomeData()])
  }

  const handleRescan = async (): Promise<void> => {
    await rescan()
    await Promise.all([refreshAlbums(), refreshHomeData()])
  }

  const handleAddToExistingPlaylist = async (playlistId: number, trackId: number): Promise<void> => {
    await window.api.addTrackToPlaylist(playlistId, trackId)
    await refresh()
  }

  const handleCreatePlaylistAndAddTrack = async (name: string, trackId: number): Promise<void> => {
    const playlist = await createPlaylist(name)
    await window.api.addTrackToPlaylist(playlist.id, trackId)
    await refresh()
  }

  const selectedPlaylist =
    selectedView.type === 'playlist' ? playlists.find((p) => p.id === selectedView.id) : null

  const selectedAlbum =
    selectedView.type === 'album' ? albums.find((a) => a.id === selectedView.id) : null

  const renderContent = (): JSX.Element => {
    if (selectedView.type === 'home') {
      return (
        <HomeView
          recentAlbums={recentAlbums}
          recentTracks={recentTracks}
          currentTrack={player.currentTrack}
          isPlaying={player.isPlaying}
          onSelectAlbum={(id) => setSelectedView({ type: 'album', id })}
          onPlayQueue={player.playQueue}
          onTogglePlayPause={player.togglePlayPause}
          onAddToQueue={player.addToQueue}
          onOpenTrackEq={setEqTrack}
        />
      )
    }

    if (selectedView.type === 'settings') {
      return (
        <SettingsView
          eqBands={player.eqBands}
          onChangeEqBand={player.setEqBand}
          onResetEq={player.resetEq}
          libraryRoots={libraryRoots}
          isScanning={isScanning}
          onAddFolder={handlePickFolderAndScan}
          onRemoveFolder={handleRemoveFolder}
          accentColor={accentColor}
          onChangeAccentColor={setAccentColor}
        />
      )
    }

    if (selectedView.type === 'playlist' && selectedPlaylist) {
      return (
        <PlaylistView
          playlist={selectedPlaylist}
          currentTrack={player.currentTrack}
          isPlaying={player.isPlaying}
          onPlayQueue={player.playQueue}
          onTogglePlayPause={player.togglePlayPause}
          onAddToQueue={player.addToQueue}
          onOpenTrackEq={setEqTrack}
          onSetDescription={setPlaylistDescription}
          onArtChanged={refresh}
        />
      )
    }

    if (selectedView.type === 'albums') {
      return (
        <AlbumGridView
          albums={albums}
          onSelectAlbum={(id) => setSelectedView({ type: 'album', id })}
        />
      )
    }

    if (selectedView.type === 'album' && selectedAlbum) {
      return (
        <AlbumView
          album={selectedAlbum}
          currentTrack={player.currentTrack}
          isPlaying={player.isPlaying}
          onPlayQueue={player.playQueue}
          onTogglePlayPause={player.togglePlayPause}
          onAddToQueue={player.addToQueue}
          onOpenTrackEq={setEqTrack}
          onAlbumArtChanged={refreshAlbums}
        />
      )
    }

    return (
      <LibraryView
        tracks={tracks}
        currentTrack={player.currentTrack}
        isPlaying={player.isPlaying}
        isScanning={isScanning}
        scanLabel={scanLabel}
        hasLibraryRoots={hasLibraryRoots}
        playlists={playlists}
        onPickFolder={handlePickFolderAndScan}
        onRescan={handleRescan}
        onPlayQueue={player.playQueue}
        onTogglePlayPause={player.togglePlayPause}
        onAddToQueue={player.addToQueue}
        onOpenTrackEq={setEqTrack}
        onAddTrackToExistingPlaylist={handleAddToExistingPlaylist}
        onCreatePlaylistAndAddTrack={handleCreatePlaylistAndAddTrack}
      />
    )
  }

  return (
    <div className="flex h-screen flex-col bg-surface text-gray-100">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          playlists={playlists}
          selectedView={selectedView}
          onSelectView={handleSelectView}
          onCreatePlaylist={createPlaylist}
          onRenamePlaylist={renamePlaylist}
          onDeletePlaylist={handleDeletePlaylist}
        />
        <div
          key={
            isLyricsViewOpen
              ? 'lyrics'
              : selectedView.type === 'home' ||
                  selectedView.type === 'library' ||
                  selectedView.type === 'albums' ||
                  selectedView.type === 'settings'
                ? selectedView.type
                : `${selectedView.type}-${selectedView.id}`
          }
          className="flex-1 animate-fade-in overflow-hidden"
        >
          {isLyricsViewOpen ? (
            <LyricsView track={player.currentTrack} currentTime={player.currentTime} />
          ) : (
            renderContent()
          )}
        </div>
        <NowPlayingPanel
          track={player.currentTrack}
          isOpen={rightPanel === 'nowPlaying'}
          onClose={() => setRightPanel(null)}
        />
        <QueuePanel
          queue={player.queue}
          currentIndex={player.currentIndex}
          history={player.history}
          isOpen={rightPanel === 'queue'}
          onJumpTo={player.jumpTo}
          onRemove={player.removeFromQueue}
          onClose={() => setRightPanel(null)}
        />
      </div>
      <NowPlayingBar
        track={player.currentTrack}
        isPlaying={player.isPlaying}
        currentTime={player.currentTime}
        duration={player.duration}
        volume={player.volume}
        onTogglePlayPause={player.togglePlayPause}
        onSeek={player.seek}
        onVolumeChange={player.setVolume}
        onToggleMute={player.toggleMute}
        onNext={player.next}
        onPrevious={player.previous}
        onCoverClick={() => toggleRightPanel('nowPlaying')}
        onQueueClick={() => toggleRightPanel('queue')}
        isQueueOpen={rightPanel === 'queue'}
        onLyricsClick={() => setIsLyricsViewOpen((v) => !v)}
        isLyricsOpen={isLyricsViewOpen}
        onFullscreenClick={() => setIsFullscreenOpen(true)}
      />
      {isFullscreenOpen && (
        <FullscreenPlayer
          track={player.currentTrack}
          isPlaying={player.isPlaying}
          currentTime={player.currentTime}
          duration={player.duration}
          onTogglePlayPause={player.togglePlayPause}
          onSeek={player.seek}
          onNext={player.next}
          onPrevious={player.previous}
          onClose={() => setIsFullscreenOpen(false)}
        />
      )}
      {eqTrack && (
        <TrackEqModal
          track={eqTrack}
          globalBands={player.eqBands}
          onSetTrackEq={player.setTrackEq}
          onClearTrackEq={player.clearTrackEq}
          onClose={() => setEqTrack(null)}
        />
      )}
    </div>
  )
}
