import { app } from 'electron'
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { join, extname } from 'node:path'
import { createHash } from 'node:crypto'
import type { IPicture } from 'music-metadata'

let artDir: string | null = null

function getArtDir(): string {
  if (artDir) return artDir
  artDir = join(app.getPath('userData'), 'art-cache')
  mkdirSync(artDir, { recursive: true })
  return artDir
}

/** Writes embedded picture data to a stable, content-hashed file so repeat scans don't rewrite it. */
export function cachePicture(picture: IPicture): string {
  const hash = createHash('sha1').update(picture.data).digest('hex')
  const ext = picture.format.includes('png') ? 'png' : 'jpg'
  const fileName = `${hash}.${ext}`
  const filePath = join(getArtDir(), fileName)

  if (!existsSync(filePath)) {
    writeFileSync(filePath, picture.data)
  }

  return filePath
}

/** Copies a user-picked image file into the art cache, deduped by content hash. */
export function cacheImageFile(sourceFilePath: string): string {
  const data = readFileSync(sourceFilePath)
  const hash = createHash('sha1').update(data).digest('hex')
  const ext = extname(sourceFilePath).toLowerCase().replace('.', '') || 'jpg'
  const fileName = `${hash}.${ext}`
  const filePath = join(getArtDir(), fileName)

  if (!existsSync(filePath)) {
    writeFileSync(filePath, data)
  }

  return filePath
}
