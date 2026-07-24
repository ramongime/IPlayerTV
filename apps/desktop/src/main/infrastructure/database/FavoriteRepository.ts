import type { Favorite } from '@iplayertv/core';
import type { IFavoriteRepository } from '@iplayertv/core';
import { getDatabase } from './DatabaseConnection';

export class FavoriteRepository implements IFavoriteRepository {
  async list(accountId: string): Promise<Favorite[]> {
    const db = getDatabase();
    return db.prepare('SELECT * FROM favorites WHERE accountId = ? ORDER BY createdAt DESC').all(accountId) as Favorite[];
  }

  async toggle(payload: Pick<Favorite, 'accountId' | 'contentType' | 'streamId' | 'name' | 'icon'>): Promise<boolean> {
    const db = getDatabase();

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

  async syncFavorites(
    accountId: string,
    favorites: Array<Pick<Favorite, 'contentType' | 'streamId' | 'name' | 'icon'>>
  ): Promise<Favorite[]> {
    const db = getDatabase();
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
