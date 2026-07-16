import { protocol } from 'electron'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'

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

export function registerMediaProtocolHandler(): void {
  protocol.handle(MEDIA_PROTOCOL, async (request) => {
    const url = new URL(request.url)
    const filePath = decodeURIComponent(url.pathname.slice(1))
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
