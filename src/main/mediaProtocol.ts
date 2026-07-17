import { app, protocol } from 'electron'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { Readable } from 'node:stream'
import { getDb } from './db/db'

export const MEDIA_PROTOCOL = 'mediafile'

export function toMediaUrl(filePath: string): string {
  return `${MEDIA_PROTOCOL}://local/${encodeURIComponent(filePath)}`
}

export function registerMediaProtocolPrivileges(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: MEDIA_PROTOCOL,
      privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true, corsEnabled: true }
    }
  ])
}

const MIME_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.m4b': 'audio/mp4',
  '.aac': 'audio/aac',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/opus',
  '.webm': 'audio/webm',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
}

function mimeTypeFor(filePath: string): string {
  const dot = filePath.lastIndexOf('.')
  const ext = dot >= 0 ? filePath.slice(dot).toLowerCase() : ''
  return MIME_TYPES[ext] ?? 'application/octet-stream'
}

// The renderer can put any path in a mediafile:// URL, so gate what actually gets served:
// track files known to the library (exact DB match) and images in the art cache — where
// every piece of art, embedded or user-picked, is copied. Anything else, including
// path-traversal attempts (resolve() collapses ".."), is refused.
function isAllowedPath(filePath: string): boolean {
  const artDirPrefix = (join(app.getPath('userData'), 'art-cache') + sep).toLowerCase()
  if (filePath.toLowerCase().startsWith(artDirPrefix)) return true

  return getDb().prepare('SELECT 1 FROM tracks WHERE file_path = ?').get(filePath) !== undefined
}

export function registerMediaProtocolHandler(): void {
  protocol.handle(MEDIA_PROTOCOL, async (request) => {
    const url = new URL(request.url)
    const filePath = resolve(decodeURIComponent(url.pathname.slice(1)))
    if (!isAllowedPath(filePath)) {
      return new Response('Forbidden', { status: 403 })
    }
    const mimeType = mimeTypeFor(filePath)

    let fileStat
    try {
      fileStat = await stat(filePath)
    } catch {
      return new Response('Not found', { status: 404 })
    }

    const range = request.headers.get('range')

    if (!range) {
      const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream
      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Length': String(fileStat.size),
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    const match = /bytes=(\d+)-(\d+)?/.exec(range)
    const start = match ? Number(match[1]) : 0
    const end = match?.[2] ? Number(match[2]) : fileStat.size - 1
    const chunkSize = end - start + 1
    const stream = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream

    return new Response(stream, {
      status: 206,
      headers: {
        'Content-Type': mimeType,
        'Content-Range': `bytes ${start}-${end}/${fileStat.size}`,
        'Content-Length': String(chunkSize),
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*'
      }
    })
  })
}
