"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FavoriteRepository = void 0;
const DatabaseConnection_1 = require("./DatabaseConnection");
class FavoriteRepository {
    async list(accountId) {
        const db = (0, DatabaseConnection_1.getDatabase)();
        return db.prepare('SELECT * FROM favorites WHERE accountId = ? ORDER BY createdAt DESC').all(accountId);
    }
    async toggle(payload) {
        const db = (0, DatabaseConnection_1.getDatabase)();
        const existing = db.prepare('SELECT 1 FROM favorites WHERE accountId = ? AND contentType = ? AND streamId = ?')
            .get(payload.accountId, payload.contentType, payload.streamId);
        if (existing) {
            db.prepare('DELETE FROM favorites WHERE accountId = ? AND contentType = ? AND streamId = ?')
                .run(payload.accountId, payload.contentType, payload.streamId);
            return false;
        }
        db.prepare(`
      INSERT INTO favorites (accountId, contentType, streamId, name, icon, createdAt)
      VALUES (@accountId, @contentType, @streamId, @name, @icon, @createdAt)
    `).run({
            ...payload,
            icon: payload.icon || null,
            createdAt: new Date().toISOString()
        });
        return true;
    }
    async syncFavorites(accountId, favorites) {
        const db = (0, DatabaseConnection_1.getDatabase)();
        const syncTx = db.transaction(() => {
            db.prepare('DELETE FROM favorites WHERE accountId = ?').run(accountId);
            const insertStmt = db.prepare(`
        INSERT INTO favorites (accountId, contentType, streamId, name, icon, createdAt)
        VALUES (@accountId, @contentType, @streamId, @name, @icon, @createdAt)
      `);
            const now = new Date().toISOString();
            for (const item of favorites) {
                insertStmt.run({
                    accountId,
                    contentType: item.contentType,
                    streamId: item.streamId,
                    name: item.name,
                    icon: item.icon || null,
                    createdAt: now
                });
            }
        });
        syncTx();
        return this.list(accountId);
    }
}
exports.FavoriteRepository = FavoriteRepository;
