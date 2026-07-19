import { useEffect, useState } from 'react'
import { useLibrary } from './hooks/useLibrary'
import { usePlayer } from './hooks/usePlayer'
import { usePlaylists } from './hooks/usePlaylists'
import { useAlbums } from './hooks/useAlbums'
import { useHomeData } from './hooks/useHomeData'
import { useAccentColor } from './hooks/useAccentColor'
import { useDominantColorBg } from './hooks/useDominantColorBg'
import { useSortMode } from './hooks/useSortMode'
import { useShortcutBindings } from './hooks/useShortcutBindings'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { getPlaybackTime } from './hooks/usePlaybackTime'
import { useAppUpdates } from './hooks/useAppUpdates'
import { UpdateModal } from './components/UpdateModal'
import { WhatsNewModal } from './components/WhatsNewModal'
import { changesForVersion } from './changelog'
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

const SEEK_STEP_SECONDS = 5
const VOLUME_STEP = 0.05

export default function App() {
  const {
    tracks,
    isScanning,
    scanProgress,
    scanFailedPaths,
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
  const { dominantColorBg, setDominantColorBg } = useDominantColorBg()
  const { sortMode, setSortMode } = useSortMode()
  const { shortcuts, setShortcut, resetShortcuts } = useShortcutBindings()
  const updates = useAppUpdates()
  const [selectedView, setSelectedView] = useState<SelectedView>({ type: 'home' })
  const [rightPanel, setRightPanel] = useState<'nowPlaying' | 'queue' | null>(null)
  const [isLyricsViewOpen, setIsLyricsViewOpen] = useState(false)
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false)
  const [eqTrack, setEqTrack] = useState<Track | null>(null)
  const [whatsNew, setWhatsNew] = useState<{ version: string; changes: string[] } | null>(null)

  // First launch on a new version shows that release's notes; a fresh install just
  // records the version silently. No stored version normally means fresh install, but
  // users updating from before this feature existed also have none — a non-empty
  // library tells them apart.
  useEffect(() => {
    Promise.all([
      window.api.getAppVersion(),
      window.api.getLastSeenVersion(),
      window.api.getLibraryRoots()
    ]).then(([version, lastSeen, roots]) => {
      if (!version || lastSeen === version) return
      if (lastSeen || roots.length > 0) {
        const changes = changesForVersion(version)
        if (changes) setWhatsNew({ version, changes })
      }
      window.api.setLastSeenVersion(version)
    })
  }, [])

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

  useKeyboardShortcuts(shortcuts, {
    playPause: player.togglePlayPause,
    previous: player.previous,
    next: player.next,
    seekBack: () => player.seek(Math.max(0, getPlaybackTime() - SEEK_STEP_SECONDS)),
    seekForward: () =>
      player.seek(Math.min(player.duration || 0, getPlaybackTime() + SEEK_STEP_SECONDS)),
    // Rounding keeps repeated ±0.05 steps from drifting into long floats.
    volumeDown: () => player.setVolume(Math.max(0, Math.round((player.volume - VOLUME_STEP) * 100) / 100)),
    volumeUp: () => player.setVolume(Math.min(1, Math.round((player.volume + VOLUME_STEP) * 100) / 100)),
    toggleMute: player.toggleMute,
    toggleShuffle: player.toggleShuffle,
    toggleRepeat: player.toggleRepeat,
    toggleFullscreen: () => setIsFullscreenOpen((v) => !v),
    toggleLyrics: () => setIsLyricsViewOpen((v) => !v),
    toggleQueue: () => toggleRightPanel('queue')
  })

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
          onEqImported={player.reloadEq}
          libraryRoots={libraryRoots}
          isScanning={isScanning}
          onAddFolder={handlePickFolderAndScan}
          onRemoveFolder={handleRemoveFolder}
          accentColor={accentColor}
          onChangeAccentColor={setAccentColor}
          dominantColorBg={dominantColorBg}
          onChangeDominantColorBg={setDominantColorBg}
          sortMode={sortMode}
          onChangeSortMode={setSortMode}
          shortcuts={shortcuts}
          onChangeShortcut={setShortcut}
          onResetShortcuts={resetShortcuts}
          audioOutputId={player.audioOutputId}
          onChangeAudioOutput={player.setAudioOutput}
          appVersion={updates.appVersion}
          updateStatus={updates.status}
          onCheckForUpdates={updates.checkForUpdates}
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
        scanFailedPaths={scanFailedPaths}
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
            <LyricsView
              track={player.currentTrack}
              dominantColorBg={dominantColorBg}
              onSeek={player.seek}
            />
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
          playOrder={player.playOrder}
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
        duration={player.duration}
        volume={player.volume}
        isShuffle={player.isShuffle}
        repeatMode={player.repeatMode}
        onTogglePlayPause={player.togglePlayPause}
        onSeek={player.seek}
        onVolumeChange={player.setVolume}
        onToggleMute={player.toggleMute}
        onNext={player.next}
        onPrevious={player.previous}
        onToggleShuffle={player.toggleShuffle}
        onToggleRepeat={player.toggleRepeat}
        onCoverClick={() => toggleRightPanel('nowPlaying')}
        onQueueClick={() => toggleRightPanel('queue')}
        isQueueOpen={rightPanel === 'queue'}
        onLyricsClick={() => setIsLyricsViewOpen((v) => !v)}
        isLyricsOpen={isLyricsViewOpen}
        onFullscreenClick={() => setIsFullscreenOpen(true)}
        audioOutputId={player.audioOutputId}
        onChangeAudioOutput={player.setAudioOutput}
      />
      {isFullscreenOpen && (
        <FullscreenPlayer
          track={player.currentTrack}
          isPlaying={player.isPlaying}
          duration={player.duration}
          onTogglePlayPause={player.togglePlayPause}
          onSeek={player.seek}
          onNext={player.next}
          onPrevious={player.previous}
          onClose={() => setIsFullscreenOpen(false)}
          dominantColorBg={dominantColorBg}
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
      {updates.showPopup && (
        <UpdateModal
          status={updates.status}
          onDownload={updates.downloadUpdate}
          onInstall={updates.installUpdate}
          onClose={updates.dismissPopup}
        />
      )}
      {whatsNew && (
        <WhatsNewModal
          version={whatsNew.version}
          changes={whatsNew.changes}
          onClose={() => setWhatsNew(null)}
        />
      )}
    </div>
  )
}
