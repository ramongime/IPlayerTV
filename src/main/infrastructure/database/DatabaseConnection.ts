import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database;

export function getDatabase() {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'iplayertv.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    migrate(db);
  }
  return db;
}

function migrate(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      server TEXT NOT NULL,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      output TEXT NOT NULL DEFAULT 'm3u8',
      player TEXT NOT NULL DEFAULT 'vlc',
      userAgent TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS favorites (
      accountId TEXT NOT NULL,
      contentType TEXT NOT NULL,
      streamId INTEGER NOT NULL,
      name TEXT NOT NULL,
      icon TEXT,
      createdAt TEXT NOT NULL,
      PRIMARY KEY (accountId, contentType, streamId)
    );

    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      accountId TEXT NOT NULL,
      contentType TEXT NOT NULL,
      streamId INTEGER NOT NULL,
      name TEXT NOT NULL,
      streamUrl TEXT NOT NULL,
      playedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS history_account_playedAt_ix ON history(accountId, playedAt DESC);
  `);

  // Migrations for existing DBs
  try {
    database.exec('ALTER TABLE history ADD COLUMN progress INTEGER;');
    database.exec('ALTER TABLE history ADD COLUMN duration INTEGER;');
  } catch (e) {
    // Columns already exist
  }
}
