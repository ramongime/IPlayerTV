import type { HistoryItem } from '@shared/domain';

export interface IHistoryRepository {
  list(accountId: string): HistoryItem[];
  add(payload: Pick<HistoryItem, 'accountId' | 'contentType' | 'streamId' | 'name' | 'streamUrl' | 'progress' | 'duration'>): void;
  upsertProgress(accountId: string, streamId: number, progress: number, duration: number): void;
}
