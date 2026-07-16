import type { LyricsLine } from '../../shared/types'

const TIMESTAMP_TAG = /\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\]/g

function timestampToSeconds(minutes: string, seconds: string, fraction?: string): number {
  const fractionSeconds = fraction
    ? Number(fraction) / (fraction.length === 3 ? 1000 : 100)
    : 0
  return Number(minutes) * 60 + Number(seconds) + fractionSeconds
}

/** Parses standard .lrc text into timestamped lines. Lines without a valid [mm:ss.xx] tag (metadata, blanks) are skipped. */
export function parseLrc(text: string): LyricsLine[] {
  const lines: LyricsLine[] = []

  for (const rawLine of text.split(/\r?\n/)) {
    const tags = [...rawLine.matchAll(TIMESTAMP_TAG)]
    if (tags.length === 0) continue

    const lineText = rawLine.replace(TIMESTAMP_TAG, '').trim()
    for (const tag of tags) {
      lines.push({
        time: timestampToSeconds(tag[1], tag[2], tag[3]),
        text: lineText
      })
    }
  }

  return lines.sort((a, b) => (a.time ?? 0) - (b.time ?? 0))
}
