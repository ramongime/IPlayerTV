import type { Favorite } from '@shared/domain';
import type { IFavoriteRepository } from '../../core/repositories/IFavoriteRepository';
import { getDatabase } from './DatabaseConnection';

export class FavoriteRepository implements IFavoriteRepository {
  list(accountId: string): Favorite[] {
    const db = getDatabase();
    return db.prepare('SELECT * FROM favorites WHERE accountId = ? ORDER BY createdAt DESC').all(accountId) as Favorite[];
  }

  toggle(payload: Pick<Favorite, 'accountId' | 'contentType' | 'streamId' | 'name' | 'icon'>): boolean {
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
