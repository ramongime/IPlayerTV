import type { ContentType } from '../domain';

export interface IWatchedRepository {
  list(accountId: string): Promise<Array<{ contentType: ContentType, streamId: number }>>;
  toggle(accountId: string, contentType: ContentType, streamId: number): Promise<boolean>;
  clear(accountId?: string): Promise<void>;
}
