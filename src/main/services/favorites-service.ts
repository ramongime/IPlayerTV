import { getDatabase } from '../db/database';
import type { ContentType, Favorite } from '../types';

export class FavoritesService {
  list(accountId: string): Favorite[] {
    const db = getDatabase();
    return db.prepare('SELECT * FROM favorites WHERE accountId = ? ORDER BY createdAt DESC').all(accountId) as Favorite[];
  }

  toggle(accountId: string, contentType: ContentType, streamId: number, name: string, icon?: string) {
    const db = getDatabase();
    const existing = db.prepare(
      'SELECT * FROM favorites WHERE accountId = ? AND contentType = ? AND streamId = ?'
    ).get(accountId, contentType, streamId) as Favorite | undefined;

    if (existing) {
      db.prepare('DELETE FROM favorites WHERE accountId = ? AND contentType = ? AND streamId = ?').run(accountId, contentType, streamId);
      return { favorite: false };
    }

    db.prepare(`
      INSERT INTO favorites (accountId, contentType, streamId, name, icon, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(accountId, contentType, streamId, name, icon ?? null, new Date().toISOString());

    return { favorite: true };
  }
}
