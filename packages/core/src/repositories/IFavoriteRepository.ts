import type { Favorite } from '../domain';

export interface IFavoriteRepository {
  list(accountId: string): Promise<Favorite[]>;
  toggle(payload: Pick<Favorite, 'accountId' | 'contentType' | 'streamId' | 'name' | 'icon'>): Promise<boolean>;
  syncFavorites(accountId: string, favorites: Array<Pick<Favorite, 'contentType' | 'streamId' | 'name' | 'icon'>>): Promise<Favorite[]>;
}
