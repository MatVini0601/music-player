export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function formatTotalDuration(totalSeconds: number): string {
  const totalMinutes = Math.round(totalSeconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} min`
  return `${hours} hr ${minutes} min`
}

export function formatDateAdded(sqliteDateTime: string): string {
  // SQLite's datetime('now') returns "YYYY-MM-DD HH:MM:SS" (UTC, no 'T'/'Z'), which Date can't
  // parse directly without help.
  const date = new Date(`${sqliteDateTime.replace(' ', 'T')}Z`)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatLrcTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const centis = Math.floor((seconds - Math.floor(seconds)) * 100)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centis
    .toString()
    .padStart(2, '0')}`
}
