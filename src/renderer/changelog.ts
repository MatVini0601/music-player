/**
 * Release notes shown in the "What's new" popup on the first launch after an update.
 * Add an entry for each release, keyed by the exact package.json version, newest first.
 * Versions without an entry simply show no popup.
 */
const CHANGELOG: Record<string, string[]> = {
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
