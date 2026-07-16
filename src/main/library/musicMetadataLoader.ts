// music-metadata v10 is ESM-only; its CJS entry has no real exports, so it must be loaded dynamically.
let musicMetadataModule: typeof import('music-metadata') | null = null

export async function getMusicMetadata(): Promise<typeof import('music-metadata')> {
  if (!musicMetadataModule) {
    musicMetadataModule = await import('music-metadata')
  }
  return musicMetadataModule
}
