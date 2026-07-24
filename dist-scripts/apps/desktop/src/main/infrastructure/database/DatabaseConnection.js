"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabase = getDatabase;
exports.setDatabase = setDatabase;
exports.migrate = migrate;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
let db;
function getDatabase() {
    if (!db) {
        const dbPath = path_1.default.join(electron_1.app.getPath('userData'), 'iplayertv.db');
        db = new better_sqlite3_1.default(dbPath);
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
const MIGRATIONS = [
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
    },
    // v2 — Multi-Account active flag & index optimizations
    (database) => {
        database.exec(`
      ALTER TABLE accounts ADD COLUMN isActive INTEGER NOT NULL DEFAULT 0;
      CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts(isActive);
      CREATE INDEX IF NOT EXISTS idx_favorites_account ON favorites(accountId);
    `);
    }
];
function setDatabase(customDb) {
    db = customDb;
    migrate(db);
}
function migrate(database) {
    const current = database.pragma('user_version', { simple: true });
    for (let version = current; version < MIGRATIONS.length; version++) {
        const run = database.transaction(() => {
            MIGRATIONS[version](database);
            database.pragma(`user_version = ${version + 1}`);
        });
        run();
    }
}
