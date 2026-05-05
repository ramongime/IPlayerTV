import type { ContentType, HistoryItem } from '@shared/domain';
import type { IHistoryRepository } from '../../core/repositories/IHistoryRepository';
import { getDatabase } from './DatabaseConnection';

export class HistoryRepository implements IHistoryRepository {
  list(accountId: string): HistoryItem[] {
    const db = getDatabase();
    return db.prepare('SELECT * FROM history WHERE accountId = ? ORDER BY playedAt DESC LIMIT 100').all(accountId) as HistoryItem[];
  }

  add(payload: Pick<HistoryItem, 'accountId' | 'contentType' | 'streamId' | 'name' | 'streamUrl' | 'progress' | 'duration'>): void {
    const db = getDatabase();
    
    // Remove if exists to move to top
    db.prepare('DELETE FROM history WHERE accountId = ? AND contentType = ? AND streamId = ?')
      .run(payload.accountId, payload.contentType, payload.streamId);

    db.prepare(`
      INSERT INTO history (accountId, contentType, streamId, name, streamUrl, playedAt, progress, duration)
      VALUES (@accountId, @contentType, @streamId, @name, @streamUrl, @playedAt, @progress, @duration)
    `).run({
      ...payload,
      progress: payload.progress ?? null,
      duration: payload.duration ?? null,
      playedAt: new Date().toISOString()
    });
  }

  upsertProgress(accountId: string, streamId: number, progress: number, duration: number): void {
    const db = getDatabase();
    db.prepare(`
      UPDATE history 
      SET progress = ?, duration = ?, playedAt = ?
      WHERE accountId = ? AND streamId = ?
    `).run(progress, duration, new Date().toISOString(), accountId, streamId);
  }
}
