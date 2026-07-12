import * as SQLite from 'expo-sqlite';

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
];

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
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

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('iplayertv.db').then(async (db) => {
      await db.execAsync(PRAGMAS);
      await migrate(db);
      return db;
    });
  }
  return dbPromise;
}
