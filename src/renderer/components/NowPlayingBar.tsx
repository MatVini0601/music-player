import {
  Captions,
  ListMusic,
  Maximize2,
  MonitorSpeaker,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX
} from 'lucide-react'
import type { Track } from '../../shared/types'
import type { RepeatMode } from '../hooks/usePlayer'
import { formatDuration } from '../utils/format'
import { PopoverMenu } from './PopoverMenu'
import { AudioOutputMenu } from './AudioOutputMenu'

interface NowPlayingBarProps {
  track: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isShuffle: boolean
  repeatMode: RepeatMode
  onTogglePlayPause: () => void
  onSeek: (time: number) => void
  onVolumeChange: (volume: number) => void
  onToggleMute: () => void
  onNext: () => void
  onPrevious: () => void
  onToggleShuffle: () => void
  onToggleRepeat: () => void
  onCoverClick: () => void
  onQueueClick: () => void
  isQueueOpen: boolean
  onLyricsClick: () => void
  isLyricsOpen: boolean
  onFullscreenClick: () => void
  audioOutputId: string
  onChangeAudioOutput: (deviceId: string) => void
}

export function NowPlayingBar({
  track,
  isPlaying,
  currentTime,
  duration,
  volume,
  isShuffle,
  repeatMode,
  onTogglePlayPause,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onNext,
  onPrevious,
  onToggleShuffle,
  onToggleRepeat,
  onCoverClick,
  onQueueClick,
  isQueueOpen,
  onLyricsClick,
  isLyricsOpen,
  onFullscreenClick,
  audioOutputId,
  onChangeAudioOutput
}: NowPlayingBarProps) {
  return (
    <div className="flex h-20 items-center gap-4 border-t border-white/5 bg-surface/90 px-4 backdrop-blur-sm">
      <div className="flex w-64 min-w-0 items-center gap-3">
        <button
          onClick={onCoverClick}
          disabled={!track}
          className="h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-white/5 transition-transform hover:scale-105 disabled:cursor-default disabled:hover:scale-100"
          aria-label="Show now playing details"
        >
          {track?.artUrl && (
            <img src={track.artUrl} alt="" className="h-full w-full object-cover" />
          )}
        </button>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{track?.title ?? 'Nothing playing'}</div>
          <div className="truncate text-xs text-gray-500">{track?.artist ?? ''}</div>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center gap-1">
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleShuffle}
            disabled={!track}
            title={isShuffle ? 'Disable shuffle' : 'Enable shuffle'}
            aria-label={isShuffle ? 'Disable shuffle' : 'Enable shuffle'}
            className={`transition-colors disabled:opacity-30 ${
              isShuffle ? 'text-accent' : 'text-gray-500 hover:text-white'
            }`}
          >
            <Shuffle size={16} />
          </button>
          <button
            onClick={onPrevious}
            disabled={!track}
            className="text-gray-300 transition-colors hover:text-white disabled:opacity-30"
            aria-label="Previous"
          >
            <SkipBack size={18} fill="currentColor" />
          </button>
          <button
            onClick={onTogglePlayPause}
            disabled={!track}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" className="ml-0.5" />
            )}
          </button>
          <button
            onClick={onNext}
            disabled={!track}
            className="text-gray-300 transition-colors hover:text-white disabled:opacity-30"
            aria-label="Next"
          >
            <SkipForward size={18} fill="currentColor" />
          </button>
          <button
            onClick={onToggleRepeat}
            disabled={!track}
            title={
              repeatMode === 'off'
                ? 'Repeat all'
                : repeatMode === 'all'
                  ? 'Repeat one'
                  : 'Disable repeat'
            }
            aria-label="Cycle repeat mode"
            className={`transition-colors disabled:opacity-30 ${
              repeatMode !== 'off' ? 'text-accent' : 'text-gray-500 hover:text-white'
            }`}
          >
            {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
          </button>
        </div>
        <div className="flex w-full max-w-xl items-center gap-2 text-xs text-gray-500">
          <span className="w-10 text-right">{formatDuration(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            onChange={(e) => onSeek(Number(e.target.value))}
            disabled={!track}
            className="h-1 flex-1 accent-accent"
          />
          <span className="w-10">{formatDuration(duration)}</span>
        </div>
      </div>

      <div className="flex w-64 min-w-0 items-center gap-3">
        <button
          onClick={onLyricsClick}
          disabled={!track}
          title="Lyrics"
          aria-label="Toggle lyrics"
          className={`flex-shrink-0 transition-colors disabled:opacity-30 ${
            isLyricsOpen ? 'text-accent' : 'text-gray-500 hover:text-white'
          }`}
        >
          <Captions size={18} />
        </button>
        <button
          onClick={onQueueClick}
          title="Queue"
          aria-label="Toggle queue"
          className={`flex-shrink-0 transition-colors ${
            isQueueOpen ? 'text-accent' : 'text-gray-500 hover:text-white'
          }`}
        >
          <ListMusic size={18} />
        </button>
        <PopoverMenu
          width={256}
          direction="up"
          trigger={({ onClick }) => (
            <button
              onClick={onClick}
              title="Audio output"
              aria-label="Choose audio output device"
              className={`flex-shrink-0 transition-colors ${
                audioOutputId ? 'text-accent' : 'text-gray-500 hover:text-white'
              }`}
            >
              <MonitorSpeaker size={18} />
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
        <button
          onClick={onToggleMute}
          title={volume === 0 ? 'Unmute' : 'Mute'}
          aria-label={volume === 0 ? 'Unmute' : 'Mute'}
          className="flex-shrink-0 text-gray-500 transition-colors hover:text-white"
        >
          {volume === 0 ? (
            <VolumeX size={18} />
          ) : volume < 0.5 ? (
            <Volume1 size={18} />
          ) : (
            <Volume2 size={18} />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="h-1 min-w-0 flex-1 accent-accent"
        />
        <button
          onClick={onFullscreenClick}
          disabled={!track}
          title="Fullscreen"
          aria-label="Open fullscreen player"
          className="flex-shrink-0 text-gray-500 transition-colors hover:text-white disabled:opacity-30"
        >
          <Maximize2 size={16} />
        </button>
      </div>
    </div>
  )
}
