import type { ContentType, Favorite } from '@shared/domain';

export interface IFavoriteRepository {
  list(accountId: string): Favorite[];
  toggle(payload: Pick<Favorite, 'accountId' | 'contentType' | 'streamId' | 'name' | 'icon'>): boolean;
}
