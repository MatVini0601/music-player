import type { Album, Artist } from '../../shared/types'

export function artistKey(name: string): string {
  return name.trim().toLowerCase()
}

/** Groups albums by album artist (case-insensitive, first-seen casing wins); tracks with
 *  no album-artist tag are dropped rather than bucketed under a fake "Unknown artist". */
export function deriveArtists(albums: Album[]): Artist[] {
  const byKey = new Map<string, { name: string; albums: Album[] }>()

  for (const album of albums) {
    const key = artistKey(album.albumArtist)
    if (!key) continue
    const entry = byKey.get(key)
    if (entry) entry.albums.push(album)
    else byKey.set(key, { name: album.albumArtist.trim(), albums: [album] })
  }

  return [...byKey.entries()].map(([key, { name, albums: artistAlbums }]) => ({
    key,
    name,
    albumCount: artistAlbums.length,
    trackCount: artistAlbums.reduce((sum, a) => sum + a.trackCount, 0),
    artUrl: artistAlbums.find((a) => a.artUrl)?.artUrl ?? null
  }))
}
