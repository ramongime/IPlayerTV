import type { ContentType } from '@shared/domain';
import type { IWatchedRepository } from '../../core/repositories/IWatchedRepository';
import { getDatabase } from './DatabaseConnection';

export class WatchedRepository implements IWatchedRepository {
  list(accountId: string): Array<{ contentType: ContentType, streamId: number }> {
    const db = getDatabase();
    return db.prepare('SELECT contentType, streamId FROM watched WHERE accountId = ?').all(accountId) as Array<{ contentType: ContentType, streamId: number }>;
  }

  toggle(accountId: string, contentType: ContentType, streamId: number): boolean {
    const db = getDatabase();

    const existing = db.prepare('SELECT 1 FROM watched WHERE accountId = ? AND contentType = ? AND streamId = ?')
      .get(accountId, contentType, streamId);

    if (existing) {
      db.prepare('DELETE FROM watched WHERE accountId = ? AND contentType = ? AND streamId = ?')
        .run(accountId, contentType, streamId);
      return false;
    }

    db.prepare(`
      INSERT INTO watched (accountId, contentType, streamId, createdAt)
      VALUES (@accountId, @contentType, @streamId, @createdAt)
    `).run({
      accountId,
      contentType,
      streamId,
      createdAt: new Date().toISOString()
    });

    return true;
  }

  clear(accountId?: string): void {
    const db = getDatabase();
    if (accountId) {
      db.prepare('DELETE FROM watched WHERE accountId = ?').run(accountId);
      db.prepare('DELETE FROM history WHERE accountId = ?').run(accountId);
    } else {
      db.prepare('DELETE FROM watched').run();
      db.prepare('DELETE FROM history').run();
    }
  }
}
