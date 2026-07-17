# Music Player

A desktop music player for Windows that plays local files (MP3, FLAC, M4A/M4B, AAC, WAV, OGG, Opus, WebM). Built with Electron, React, TypeScript, and SQLite.

## Features

- **Local library** — point the app at one or more folders; it scans them, reads tags (via music-metadata), and keeps the library in a local SQLite database. Rescans only touch files that changed.
- **Playlists** — create, rename, reorder, and describe playlists.
- **Artwork** — album art is extracted from file tags automatically; custom images can be set per album, track, or playlist.
- **Lyrics** — supports `.lrc` files, embedded tags, and manually pasted lyrics. Synced lyrics highlight the current line while the song plays.
- **Equalizer** — 10-band EQ with a global setting plus per-track overrides.
- **Home view** — recently played albums and tracks, backed by play history.
- **Player** — queue with history, now-playing panel, fullscreen mode, custom accent color.

## Tech stack

| Layer | Tech |
| --- | --- |
| Shell | Electron 33 (electron-vite, electron-builder) |
| UI | React 18 + TypeScript + Tailwind CSS |
| Storage | better-sqlite3 (WAL mode), DB at `%APPDATA%/music-player/library.db` |
| Audio | HTML5 Audio + Web Audio API (EQ filter graph), custom `mediafile://` protocol for streaming local files |
| Metadata | music-metadata |

## Getting started

Prerequisites: Node.js 20+ and npm. `better-sqlite3` is a native module — on a fresh clone, `npm install` compiles it for your Electron version automatically.

```bash
npm install
npm run dev        # start the app in development mode (hot reload)
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Run in development with hot reload |
| `npm run build` | Compile main/preload/renderer into `out/` |
| `npm run build:win` | Build and package a Windows installer into `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | ESLint over `.ts`/`.tsx` |
| `npm run typecheck` | TypeScript checks for both node and renderer configs |

## Project structure

```
src/
  main/          Electron main process
    db/          SQLite connection, schema, migrations
    library/     scanner, playlists, artwork, lyrics, metadata, play history
    mediaProtocol.ts  mediafile:// protocol for streaming audio to the renderer
  preload/       typed IPC bridge (window.api)
  renderer/      React app
    components/  views and UI pieces
    hooks/       player, library, playlists, albums, colors
    utils/       formatting, EQ defaults, dominant color extraction
  shared/        types shared across processes
```

## Roadmap and known gaps

See [context.md](context.md) for the project brief, planned upgrades (last.fm integration, genre filter), and the current improvement backlog.
