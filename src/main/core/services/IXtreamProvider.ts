import type { Account, Category, ContentType, EpgProgramme, Episode, StreamItem, XtreamAuthResponse } from '@shared/domain';

export interface IXtreamProvider {
  authenticate(account: Pick<Account, 'server' | 'username' | 'password' | 'userAgent'>): Promise<{ ok: boolean; data: XtreamAuthResponse }>;
  categories(account: Account, contentType: ContentType): Promise<Category[]>;
  streams(account: Account, contentType: ContentType, categoryId?: string): Promise<StreamItem[]>;
  seriesEpisodes(account: Account, seriesId: number): Promise<Episode[]>;
  shortEpg(account: Account, streamId: number, limit?: number): Promise<EpgProgramme[]>;
  resolveBestStreamUrl(account: Account, contentType: ContentType, streamId: number, extension?: string): Promise<string>;
}
