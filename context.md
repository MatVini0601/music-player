WHAT KIND OF PROJECT THIS IS?
- This project consist in a Music Player as the name suggests. The player will be installed in a windows machine and will be able to reproduce song from files on the computer, create playlist, add images to albuns and song, show lyrics and sincronize then while the music is playing
- The player will only be able do play from local files
- MP3 or FLAC

POINTS FOR UPGRADES

1. Last.fm integration
2. [DONE 2026-07-17] Genre filter on album — Albums view has a genre dropdown (PopoverMenu) next to search, with its own genre-only search bar inside and the list capped at 10 rows (+N more hint); Album.genres is aggregated per album in rowsToAlbums (multi-genre tags split, case-insensitive dedupe). Hidden until the library has genres (needs one rescan after the genre-column update).
3. The ordenation is loaded every time the library is clicked. Theres a way to save the library ordenation instead of reordering every time?
4. Save position in library scroll when opening Lyrics, full screen or any tab
5. [DONE 2026-07-17] Artist filter on album — second dropdown next to the genre one (User icon), same searchable 10-row design; filters by albumArtist, no DB changes needed. Genre + artist + text search all combine.
6. [DONE 2026-07-17] "What's new" popup after updates — bundled changelog (src/renderer/changelog.ts, keyed by exact package.json version; ADD AN ENTRY EACH RELEASE), shown once when the stored LastSeenVersion differs from the running version. Fresh installs stay silent; users updating from pre-0.2.5 (no stored version) are detected by a non-empty library.

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
10. [DONE 2026-07-17] Genre isn't stored — but the roadmap needs it. Fixed: tracks.genre column (nullable TEXT, migration in db.ts), scanner persists it (multi-genre tags joined with ', ', tagless files stored as ''), and Track.genre is exposed through trackMapper/shared types. NULL marks pre-migration rows, so one plain rescan backfills existing libraries without touching file mtimes. The genre filter UI itself (roadmap item 2) is still open.
11. Almost no keyboard shortcuts. Only Escape-to-close-fullscreen exists. Space for play/pause and arrows for seek/volume would be a quick quality-of-life win.

Smaller cleanups
- [DONE 2026-07-16] Settings handler boilerplate. Replaced the five bespoke get/set pairs with a registerSetting helper in src/main/index.ts (same IPC channel names, per-key validation and fallbacks kept; adding a new setting is now ~10 lines).
- [DONE 2026-07-16] play_history.played_at unified to TEXT datetime('now'). Schema changed for fresh installs; existing DBs get a rebuild migration in db.ts that converts epoch-millis values (verified idempotent).
- [DECIDED 2026-07-16] playlist_tracks: keeping no-duplicates (PK on playlist_id+track_id). Re-adding an existing track stays a silent no-op; documented as intentional in schema.ts and playlists.ts.
- [DONE 2026-07-17] Native confirm() popups replaced with a themed ConfirmModal (delete playlist in Sidebar, remove folder in Settings). Portaled to document.body so the sidebar's backdrop-blur can't trap the overlay; Esc/backdrop click cancels. No native alert/prompt/confirm remain in the renderer.


- [DONE 2026-07-16] Ignore the word "The" on the ordering by title/album, and ignore . ' ’ - (sortableText in useTrackSort.ts)
- [DONE 2026-07-16] Large-library performance (7k+ tracks lagged, delayed song start). Root cause: getTracks embedded every track's album art as a base64 data URL (hundreds of MB over IPC). Fixed: art is now served lazily as mediafile:// URLs (protocol handler gained image MIME types; artDataUrl renamed to artUrl everywhere), the Library list is virtualized (only visible rows render, ROW_HEIGHT slots in LibraryView), Up next in the queue panel is capped at 200 rows, dominantColor sets crossOrigin for the protocol-served images.




SETTING TO ADD(All types should have a subsection at the setting screen)
1. [DONE 2026-07-17] Ordenation type(Normal, Ignore specials and "The") — "Sorting" section in Settings with a two-option segmented control; persisted via registerSetting('SortMode'), defaults to Ignore specials (the previous behavior). useTrackSort reads it per mount, so all track lists (library, album, playlist) follow it.
2. [DONE 2026-07-16] Display settings(Use or not background color by cover dominant color) — "Display" section in Settings with a toggle; persisted via registerSetting('DominantColorBg'), defaults on; gates the dominant-color background in FullscreenPlayer and LyricsView.
3. [DONE 2026-07-17] Audio output setting — "Audio output" section in Settings with a device dropdown (System default + enumerated outputs, live-updates on devicechange); persisted via registerSetting('AudioOutput') as deviceId ('' = default). Applied with AudioContext.setSinkId in usePlayer (audio routes through the EQ graph, so the sink must be set on the context, not the <audio> element); a missing device falls back to default.
4. Use exclusive audio(Only the player will control the PC audio)