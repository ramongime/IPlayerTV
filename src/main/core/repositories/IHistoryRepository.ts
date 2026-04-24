import type { ContentType, HistoryItem } from '@shared/domain';

export interface IHistoryRepository {
  list(accountId: string): HistoryItem[];
  add(payload: Pick<HistoryItem, 'accountId' | 'contentType' | 'streamId' | 'name' | 'streamUrl'>): void;
}
