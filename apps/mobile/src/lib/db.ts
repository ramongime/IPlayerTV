import type * as SQLiteTypes from 'expo-sqlite';

let SQLite: typeof SQLiteTypes | null = null;
try {
  SQLite = require('expo-sqlite');
} catch {}

// Connection-level PRAGMAs (must run outside a transaction).
const PRAGMAS = `
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
PRAGMA synchronous = NORMAL;
`;

// Ordered migrations. Index i upgrades the DB from user_version i to i+1.
// NEVER edit an existing entry once shipped — always append a new one.
// Keep this list in sync with apps/desktop/.../DatabaseConnection.ts.
const MIGRATIONS: string[] = [
  // v1 — baseline schema (same as the desktop app so both platforms stay
  // drop-in compatible with the shared repository contracts).
  `
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
  `,
  // v2 — Multi-Account active flag & index optimizations
  `
  ALTER TABLE accounts ADD COLUMN isActive INTEGER NOT NULL DEFAULT 0;
  CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts(isActive);
  CREATE INDEX IF NOT EXISTS idx_favorites_account ON favorites(accountId);
  `,
  // v3 — downloads table for offline VOD media downloads
  `
  CREATE TABLE IF NOT EXISTS downloads (
    id TEXT PRIMARY KEY,
    accountId TEXT NOT NULL,
    contentType TEXT NOT NULL,
    streamId INTEGER NOT NULL,
    title TEXT NOT NULL,
    localUri TEXT NOT NULL,
    remoteUrl TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('QUEUED', 'DOWNLOADING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED')),
    downloadedBytes INTEGER NOT NULL DEFAULT 0,
    totalBytes INTEGER NOT NULL DEFAULT 0,
    pauseStateJson TEXT,
    errorMessage TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_downloads_account ON downloads(accountId);
  CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status);
  `,
];

async function migrate(db: SQLiteTypes.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let version = current; version < MIGRATIONS.length; version++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version]);
    });
    // PRAGMA can't run inside the transaction and doesn't accept placeholders;
    // `version + 1` is a controlled integer.
    await db.execAsync(`PRAGMA user_version = ${version + 1}`);
  }
}

let dbPromise: Promise<SQLiteTypes.SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLiteTypes.SQLiteDatabase> {
  if (!dbPromise) {
    if (!SQLite) {
      throw new Error('expo-sqlite is unavailable in current runtime');
    }
    dbPromise = SQLite.openDatabaseAsync('iplayertv.db').then(async (db) => {
      await db.execAsync(PRAGMAS);
      await migrate(db);
      return db;
    });
  }
  return dbPromise;
}
