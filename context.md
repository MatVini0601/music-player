WHAT KIND OF PROJECT THIS IS?
- This project consist in a Music Player as the name suggests. The player will be installed in a windows machine and will be able to reproduce song from files on the computer, create playlist, add images to albuns and song, show lyrics and sincronize then while the music is playing
- The player will only be able do play from local files
- MP3 or FLAC

POINTS FOR UPGRADES
- last.fm integration
- genre filter on album

WHAT COULD BE BETTER (review 2026-07-15)

Project safety net (highest impact)
1. No git repository. A .gitignore exists but the folder was never initialized — no version control, no backup. `git init` + first commit is the most valuable next step.
2. No tests. No test framework at all. Cheap, high-value targets: LRC parsing (src/main/library/lyricsParser.ts), scanner upsert/cleanup logic (better-sqlite3 supports `:memory:` DBs), and the format/eq utils in src/renderer/utils. Vitest fits the existing Vite setup.
3. No README. context.md doesn't say how to run, build, or package the app.

Robustness bugs
4. [DONE 2026-07-15] One bad file aborts the entire scan. Fixed: walk() skips unreadable directories, per-file processing skips corrupt files, failures are returned in ScanResult.failedPaths and shown as a warning in the Library view. Tracks under unreadable directories are also protected from the missing-file cleanup (an unplugged drive no longer wipes its tracks from the library).
5. Scan writes aren't batched. Each track upsert runs in its own implicit transaction; wrapping chunks in db.transaction() would make large first scans much faster. The double upsertTrack.run() structure (scanner.ts:99-129) could collapse into one call.
6. Replaying the current track doesn't restart it. The playback effect in usePlayer.ts (~line 159) is keyed on currentTrack?.mediaUrl, so starting a new queue that begins with the already-playing track silently does nothing.
7. The media protocol serves any file on disk. The handler in src/main/mediaProtocol.ts streams whatever path the URL contains, with CORS wide open. Low practical risk, but validating paths against library roots (or track paths in the DB) is cheap defense in depth. Also, sandbox: false in src/main/index.ts is probably unnecessary — the preload only uses contextBridge/ipcRenderer, which work sandboxed.

Missing player features
8. [DONE 2026-07-15] No shuffle or repeat. Added: shuffle (Fisher-Yates permutation of queue indices, current track stays first; queue add/remove keeps the order consistent) and repeat off/all/one (repeat-one replays on ended; manual next still advances). Buttons in NowPlayingBar next to prev/next.
9. No OS media integration. No navigator.mediaSession usage, so the Windows media overlay won't show title/artist/artwork and hardware media keys aren't wired up. Small code change in usePlayer, big native-feel win.
10. Genre isn't stored — but the roadmap needs it. "Genre filter on album" is planned, yet the tracks table has no genre column and the scanner never persists it (only the on-demand tag viewer in src/main/library/metadata.ts reads it live from the file). Needs a schema migration + scanner change first; the migration pattern in src/main/db/db.ts already handles this kind of addition.
11. Almost no keyboard shortcuts. Only Escape-to-close-fullscreen exists. Space for play/pause and arrows for seek/volume would be a quick quality-of-life win.

Smaller cleanups
- The settings handlers in src/main/index.ts (~lines 105-204) are five copies of the same get/set boilerplate — a generic settings:get(key)/settings:set(key, value) pair with a key allowlist would halve the file.
- play_history.played_at is an INTEGER timestamp while every other table stores TEXT datetime('now') — worth unifying before more code depends on it.
- playlist_tracks uses PRIMARY KEY (playlist_id, track_id), which silently forbids adding the same song to a playlist twice. Fine if intentional, but it's a product decision worth making deliberately.


- [DONE 2026-07-16] Ignore the word "The" on the ordering by title/album, and ignore . ' ’ - (sortableText in useTrackSort.ts)
- [DONE 2026-07-16] Large-library performance (7k+ tracks lagged, delayed song start). Root cause: getTracks embedded every track's album art as a base64 data URL (hundreds of MB over IPC). Fixed: art is now served lazily as mediafile:// URLs (protocol handler gained image MIME types; artDataUrl renamed to artUrl everywhere), the Library list is virtualized (only visible rows render, ROW_HEIGHT slots in LibraryView), Up next in the queue panel is capped at 200 rows, dominantColor sets crossOrigin for the protocol-served images.


- Config to use exclusive audio(Only the player will control the PC audio)