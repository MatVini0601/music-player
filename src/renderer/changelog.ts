/**
 * Release notes shown in the "What's new" popup on the first launch after an update.
 * Add an entry for each release, keyed by the exact package.json version, newest first.
 * Versions without an entry simply show no popup.
 */
const CHANGELOG: Record<string, string[]> = {
  '0.2.5': [
    'Filter the Albums view by genre and by artist — each filter has its own search and combines with the album search.',
    'Genres are now read from your files’ tags. Rescan the library once to fill them in.',
    'Choose which audio output device the player uses (Settings → Audio output).',
    'New "Ordering type" setting: Normal, or Ignore specials and "The" (Settings → Sorting).',
    'New Display setting to turn the album-art background tint on or off.'
  ]
}

export function changesForVersion(version: string): string[] | null {
  return CHANGELOG[version] ?? null
}
