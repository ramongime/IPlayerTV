import type { ContentType } from '@shared/domain';

export interface IWatchedRepository {
  list(accountId: string): Array<{ contentType: ContentType, streamId: number }>;
  toggle(accountId: string, contentType: ContentType, streamId: number): boolean;
  clear(accountId?: string): void;
}
