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
}
