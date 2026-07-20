/**
 * Release notes shown in the "What's new" popup on the first launch after an update.
 * Add an entry for each release, keyed by the exact package.json version, newest first.
 * Versions without an entry simply show no popup.
 */
const CHANGELOG: Record<string, string[]> = {
  '0.2.8': [
    'Browse by artist: a new Artists tab lists everyone in your library — click one to see their albums.',
    'Sort an artist’s albums alphabetically or by release year.',
    'Click the song title in the player bar to jump to its album, or the artist name to jump to their artist page.',
    'Long song titles now scroll in the player bar so you can read the whole thing.',
    'Click an album name in any track list to jump straight to that album.'
  ],
  '0.2.7': [
    'Fermata now appears in the Windows media overlay with its name, the song title, artist, cover art, and a progress bar — and your keyboard’s media keys control playback.',
    'Keyboard shortcuts: Space plays/pauses, arrows seek and change the volume, Ctrl+arrows switch tracks, plus keys for mute, shuffle, repeat, fullscreen, lyrics, and the queue.',
    'Every shortcut can be rebound in Settings → Keyboard shortcuts.',
    'The installer now asks where to install Fermata. Existing installs keep their folder on update.',
    'Fermata uses far less CPU while music plays.',
    'Library scans are several times faster, and the app stays smooth while they run.',
    'The Albums view opens faster — covers now load as you scroll.',
    'Export and import your equalizer settings — the global EQ and every per-track EQ — from Settings → Equalizer. Handy for moving Fermata to another PC.',
    'Click a line in synced lyrics to jump to that moment of the song.',
    'A new app icon, shown everywhere — window, taskbar, Start Menu, and the volume mixer.'
  ],
  '0.2.6': [
    'The player has a name now: Fermata — with its own icon.',
    'More formats: M4A, M4B, AAC, WAV, OGG, Opus, and WebM files are scanned and played alongside MP3 and FLAC.',
    'Saving lyrics now also writes them into the music file itself, so they travel with your files.',
    'The Library and Albums views remember your scroll position when you switch tabs or open Lyrics.',
    'Clicking the track that is already playing starts it over.',
    'Big library scans are much faster.'
  ],
  '0.2.5': [
    'Filter the Albums view by genre and by artist — each filter has its own search and combines with the album search.',
    'Genres are now read from your files’ tags. Rescan the library once to fill them in.',
    'Choose which audio output device the player uses — from Settings or straight from the player bar.',
    'New "Ordering type" setting: Normal, or Ignore specials and "The" (Settings → Sorting).',
    'New Display setting to turn the album-art background tint on or off.'
  ]
}

export function changesForVersion(version: string): string[] | null {
  return CHANGELOG[version] ?? null
}
