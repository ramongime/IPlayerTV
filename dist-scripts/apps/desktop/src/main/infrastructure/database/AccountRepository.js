"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountRepository = void 0;
const node_crypto_1 = require("node:crypto");
const DatabaseConnection_1 = require("./DatabaseConnection");
const electron_1 = require("electron");
function encryptPassword(text) {
    if (text && electron_1.safeStorage && electron_1.safeStorage.isEncryptionAvailable()) {
        if (text.startsWith('ENCRYPTED:'))
            return text;
        return 'ENCRYPTED:' + electron_1.safeStorage.encryptString(text).toString('base64');
    }
    return text;
}
function decryptPassword(text) {
    if (text && text.startsWith('ENCRYPTED:') && electron_1.safeStorage && electron_1.safeStorage.isEncryptionAvailable()) {
        try {
            return electron_1.safeStorage.decryptString(Buffer.from(text.replace('ENCRYPTED:', ''), 'base64'));
        }
        catch {
            return text;
        }
    }
    return text;
}
function mapAccount(account) {
    if (!account)
        return account;
    return {
        ...account,
        password: decryptPassword(account.password),
        isActive: Boolean(account.isActive)
    };
}
// better-sqlite3 is synchronous; methods are async only to satisfy the shared
// IAccountRepository contract (the mobile SQLite implementation is truly async).
class AccountRepository {
    async list() {
        const db = (0, DatabaseConnection_1.getDatabase)();
        const accounts = db.prepare('SELECT * FROM accounts ORDER BY createdAt DESC').all();
        return accounts.map(mapAccount);
    }
    async getActive() {
        const db = (0, DatabaseConnection_1.getDatabase)();
        const active = db.prepare('SELECT * FROM accounts WHERE isActive = 1 LIMIT 1').get();
        if (active)
            return mapAccount(active);
        const fallback = db.prepare('SELECT * FROM accounts ORDER BY createdAt DESC LIMIT 1').get();
        if (fallback)
            return mapAccount(fallback);
        return null;
    }
    async setActive(id) {
        const db = (0, DatabaseConnection_1.getDatabase)();
        const updateTx = db.transaction(() => {
            const existing = db.prepare('SELECT 1 FROM accounts WHERE id = ?').get(id);
            if (!existing)
                throw new Error(`Account not found: ${id}`);
            db.prepare('UPDATE accounts SET isActive = 0').run();
            db.prepare('UPDATE accounts SET isActive = 1, updatedAt = ? WHERE id = ?').run(new Date().toISOString(), id);
        });
        updateTx();
        const updated = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
        return mapAccount(updated);
    }
    async create(payload) {
        const db = (0, DatabaseConnection_1.getDatabase)();
        const id = (0, node_crypto_1.randomUUID)();
        const now = new Date().toISOString();
        const stmt = db.prepare(`
      INSERT INTO accounts (id, name, server, username, password, output, player, createdAt, updatedAt)
      VALUES (@id, @name, @server, @username, @password, @output, @player, @createdAt, @updatedAt)
    `);
        const account = {
            ...payload,
            password: encryptPassword(payload.password),
            id,
            createdAt: now,
            updatedAt: now
        };
        stmt.run(account);
        return mapAccount(account);
    }
    async update(id, payload) {
        const db = (0, DatabaseConnection_1.getDatabase)();
        const existing = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
        if (!existing)
            throw new Error(`Account not found: ${id}`);
        const ALLOWED_FIELDS = ['name', 'server', 'username', 'password', 'output', 'player', 'userAgent'];
        const fields = Object.keys(payload).filter((key) => ALLOWED_FIELDS.includes(key) && payload[key] !== undefined);
        if (fields.length === 0)
            return existing;
        const setClauses = fields.map((field) => `${field} = @${field}`).join(', ');
        const now = new Date().toISOString();
        const accountPayload = { ...payload };
        if (accountPayload.password) {
            accountPayload.password = encryptPassword(accountPayload.password);
        }
        const stmt = db.prepare(`UPDATE accounts SET ${setClauses}, updatedAt = @updatedAt WHERE id = @id`);
        stmt.run({ ...accountPayload, updatedAt: now, id });
        return mapAccount(db.prepare('SELECT * FROM accounts WHERE id = ?').get(id));
    }
    async remove(id) {
        const db = (0, DatabaseConnection_1.getDatabase)();
        db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
        db.prepare('DELETE FROM favorites WHERE accountId = ?').run(id);
    }
}
exports.AccountRepository = AccountRepository;
