import * as SQLite from 'expo-sqlite';

// Same schema as the desktop app (apps/desktop .../DatabaseConnection.ts) so both
// platforms stay drop-in compatible with the shared repository contracts.
const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
PRAGMA synchronous = NORMAL;

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  server TEXT NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  output TEXT NOT NULL DEFAULT 'm3u8',
  player TEXT NOT NULL DEFAULT 'internal',
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

CREATE TABLE IF NOT EXISTS watched (
  accountId TEXT NOT NULL,
  contentType TEXT NOT NULL,
  streamId INTEGER NOT NULL,
  createdAt TEXT NOT NULL,
  PRIMARY KEY (accountId, contentType, streamId)
);
`;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('iplayertv.db').then(async (db) => {
      await db.execAsync(SCHEMA);
      return db;
    });
  }
  return dbPromise;
}
