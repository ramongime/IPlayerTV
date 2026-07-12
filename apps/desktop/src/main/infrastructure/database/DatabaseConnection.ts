import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database;

export function getDatabase() {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'iplayertv.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
    db.pragma('synchronous = NORMAL');
    migrate(db);
  }
  return db;
}

// Ordered migrations. Index i upgrades the DB from user_version i to i+1.
// NEVER edit an existing entry once shipped — always append a new one.
// Keep this list in sync with apps/mobile/src/lib/db.ts.
const MIGRATIONS: ((database: Database.Database) => void)[] = [
  // v1 — baseline schema
  (database) => {
    database.exec(`
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
    `);
  }
];

function migrate(database: Database.Database) {
  const current = database.pragma('user_version', { simple: true }) as number;
  for (let version = current; version < MIGRATIONS.length; version++) {
    const run = database.transaction(() => {
      MIGRATIONS[version](database);
      database.pragma(`user_version = ${version + 1}`);
    });
    run();
  }
}
