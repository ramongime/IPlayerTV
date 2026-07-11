import type { ContentType } from '../domain';

export interface IWatchedRepository {
  list(accountId: string): Promise<Array<{ contentType: ContentType, streamId: number }>>;
  toggle(accountId: string, contentType: ContentType, streamId: number): Promise<boolean>;
  /** Marks a stream as watched without removing (unlike toggle). Used for auto-mark on playback. */
  markWatched(accountId: string, contentType: ContentType, streamId: number): Promise<void>;
  clear(accountId?: string): Promise<void>;
}

