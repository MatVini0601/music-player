export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS library_roots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL UNIQUE,
  added_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS albums (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  album_artist TEXT NOT NULL DEFAULT '',
  user_art_path TEXT,
  UNIQUE (title, album_artist)
);

CREATE TABLE IF NOT EXISTS tracks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT '',
  album TEXT NOT NULL DEFAULT '',
  album_artist TEXT NOT NULL DEFAULT '',
  genre TEXT,
  track_no INTEGER,
  duration_seconds REAL NOT NULL DEFAULT 0,
  format TEXT NOT NULL,
  album_id INTEGER REFERENCES albums(id),
  user_art_path TEXT,
  file_mtime_ms INTEGER NOT NULL,
  last_scanned_at TEXT NOT NULL DEFAULT (datetime('now')),
  added_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tracks_album_id ON tracks(album_id);

CREATE TABLE IF NOT EXISTS art_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  track_id INTEGER REFERENCES tracks(id) ON DELETE CASCADE,
  album_id INTEGER REFERENCES albums(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  user_art_path TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- The composite PK deliberately forbids the same track appearing twice in a playlist;
-- add/remove/reorder all identify entries by track_id and rely on this.
CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (playlist_id, track_id)
);

CREATE TABLE IF NOT EXISTS lyrics (
  track_id INTEGER PRIMARY KEY REFERENCES tracks(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('lrc', 'embedded', 'manual')),
  raw_text TEXT NOT NULL,
  is_synced INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS track_eq (
  track_id INTEGER PRIMARY KEY REFERENCES tracks(id) ON DELETE CASCADE,
  bands TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS play_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  played_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_play_history_track_id ON play_history(track_id);
CREATE INDEX IF NOT EXISTS idx_play_history_played_at ON play_history(played_at);
`
