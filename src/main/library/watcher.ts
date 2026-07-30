import { watch, type FSWatcher } from 'node:fs'
import { extname, resolve } from 'node:path'
import type { Database } from 'better-sqlite3'
import { SUPPORTED_EXTENSIONS, scanPaths } from './scanner'

// Coalesces bursts from bulk copies / editors that write a file in multiple steps into a
// single batch, instead of rescanning on every individual filesystem event.
const DEBOUNCE_MS = 800

export interface LibraryWatcher {
  addRoot(rootPath: string): void
  removeRoot(rootPath: string): void
  stopAll(): void
}

/** Watches library root folders and rescans only the paths that actually changed, so a
 *  live edit costs proportional to the change, not to the size of the library. */
export function createLibraryWatcher(db: Database, onChange: () => void): LibraryWatcher {
  const watchers = new Map<string, FSWatcher>()
  const pending = new Set<string>()
  let flushTimer: NodeJS.Timeout | null = null

  async function flush(): Promise<void> {
    flushTimer = null
    if (pending.size === 0) return
    const paths = [...pending]
    pending.clear()

    try {
      const result = await scanPaths(db, paths)
      if (result.upserted > 0 || result.removed > 0) onChange()
    } catch (error) {
      console.warn('Watcher: failed to process changed files:', error)
    }
  }

  function scheduleFlush(): void {
    if (flushTimer) clearTimeout(flushTimer)
    flushTimer = setTimeout(flush, DEBOUNCE_MS)
  }

  // fs.watch's rename event covers creates, deletes, and renames alike without saying
  // which — scanPaths resolves that ambiguity itself by stat-ing the path.
  function handleEvent(rootPath: string, filename: string | null): void {
    if (!filename) return
    if (!SUPPORTED_EXTENSIONS.has(extname(filename).toLowerCase())) return
    pending.add(resolve(rootPath, filename))
    scheduleFlush()
  }

  function addRoot(rootPath: string): void {
    if (watchers.has(rootPath)) return
    try {
      const watcher = watch(rootPath, { recursive: true }, (_event, filename) =>
        handleEvent(rootPath, filename)
      )
      watcher.on('error', (error) => {
        console.warn(`Watcher: error watching ${rootPath}:`, error)
      })
      watchers.set(rootPath, watcher)
    } catch (error) {
      console.warn(`Watcher: failed to watch ${rootPath}:`, error)
    }
  }

  function removeRoot(rootPath: string): void {
    watchers.get(rootPath)?.close()
    watchers.delete(rootPath)
  }

  function stopAll(): void {
    if (flushTimer) clearTimeout(flushTimer)
    for (const watcher of watchers.values()) watcher.close()
    watchers.clear()
  }

  return { addRoot, removeRoot, stopAll }
}
