import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'node:path'
import { SCHEMA_SQL } from './schema'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  const dbPath = join(app.getPath('userData'), 'library.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA_SQL)
  runMigrations(db)

  return db
}

function runMigrations(db: Database.Database): void {
  try {
    db.exec('ALTER TABLE tracks ADD COLUMN user_art_path TEXT')
  } catch {
    // column already exists
  }

  try {
    db.exec('ALTER TABLE playlists ADD COLUMN description TEXT')
  } catch {
    // column already exists
  }

  try {
    db.exec('ALTER TABLE playlists ADD COLUMN user_art_path TEXT')
  } catch {
    // column already exists
  }

  // Deliberately nullable: NULL means "never extracted", which lets the scanner re-read
  // tags for tracks scanned before this column existed (a tagless file gets '' instead).
  try {
    db.exec('ALTER TABLE tracks ADD COLUMN genre TEXT')
  } catch {
    // column already exists
  }

  // Same NULL-vs-empty convention as genre above, adapted for a numeric column: 0 means
  // "confirmed no year tag" so those files aren't re-parsed on every future scan, while
  // NULL means "not read since this column existed".
  try {
    db.exec('ALTER TABLE tracks ADD COLUMN year INTEGER')
  } catch {
    // column already exists
  }

  // SQLite's ALTER TABLE ADD COLUMN rejects any non-constant default (including CURRENT_TIMESTAMP),
  // so the column is added nullable and backfilled in a separate, idempotent step.
  try {
    db.exec('ALTER TABLE tracks ADD COLUMN added_at TEXT')
  } catch {
    // column already exists
  }
  db.exec("UPDATE tracks SET added_at = datetime('now') WHERE added_at IS NULL")

  try {
    db.exec('ALTER TABLE playlist_tracks ADD COLUMN added_at TEXT')
  } catch {
    // column already exists
  }
  db.exec("UPDATE playlist_tracks SET added_at = datetime('now') WHERE added_at IS NULL")

  // SQLite can't ALTER a CHECK constraint, so widening lyrics.source to allow 'manual'
  // requires rebuilding the table. Guarded by inspecting the existing constraint.
  const lyricsTable = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'lyrics'")
    .get() as { sql: string } | undefined

  if (lyricsTable && !lyricsTable.sql.includes("'manual'")) {
    db.exec(`
      CREATE TABLE lyrics_new (
        track_id INTEGER PRIMARY KEY REFERENCES tracks(id) ON DELETE CASCADE,
        source TEXT NOT NULL CHECK (source IN ('lrc', 'embedded', 'manual')),
        raw_text TEXT NOT NULL,
        is_synced INTEGER NOT NULL DEFAULT 0
      );
      INSERT INTO lyrics_new SELECT * FROM lyrics;
      DROP TABLE lyrics;
      ALTER TABLE lyrics_new RENAME TO lyrics;
    `)
  }

  // play_history.played_at started as INTEGER epoch-millis while every other table
  // stores TEXT datetime('now'). SQLite can't change a column type, so the table is
  // rebuilt, converting existing values (millis -> 'YYYY-MM-DD HH:MM:SS' UTC).
  const historyTable = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'play_history'")
    .get() as { sql: string } | undefined

  if (historyTable && /played_at\s+INTEGER/i.test(historyTable.sql)) {
    db.exec(`
      CREATE TABLE play_history_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
        played_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO play_history_new (id, track_id, played_at)
        SELECT id, track_id, datetime(played_at / 1000, 'unixepoch') FROM play_history;
      DROP TABLE play_history;
      ALTER TABLE play_history_new RENAME TO play_history;
      CREATE INDEX IF NOT EXISTS idx_play_history_track_id ON play_history(track_id);
      CREATE INDEX IF NOT EXISTS idx_play_history_played_at ON play_history(played_at);
    `)
  }
}
