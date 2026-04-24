import { getDatabase } from '../db/database';
import type { ContentType, HistoryItem } from '../types';

export class HistoryService {
  list(accountId: string): HistoryItem[] {
    const db = getDatabase();
    return db.prepare(
      'SELECT accountId, contentType, streamId, name, streamUrl, playedAt FROM history WHERE accountId = ? ORDER BY playedAt DESC LIMIT 100'
    ).all(accountId) as HistoryItem[];
  }

  add(item: Omit<HistoryItem, 'playedAt'>) {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO history (accountId, contentType, streamId, name, streamUrl, playedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(item.accountId, item.contentType, item.streamId, item.name, item.streamUrl, new Date().toISOString());
  }
}
