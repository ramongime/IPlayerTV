import type { Account, Category, ContentType, EpgProgramme, Episode, NowPlayingMap, StreamItem, XtreamAuthResponse } from '@shared/domain';

export interface IXtreamProvider {
  authenticate(account: Pick<Account, 'server' | 'username' | 'password' | 'userAgent'>): Promise<{ ok: boolean; data: XtreamAuthResponse }>;
  categories(account: Account, contentType: ContentType): Promise<Category[]>;
  streams(account: Account, contentType: ContentType, categoryId?: string): Promise<StreamItem[]>;
  seriesEpisodes(account: Account, seriesId: number): Promise<Episode[]>;
  shortEpg(account: Account, streamId: number, limit?: number): Promise<EpgProgramme[]>;
  getEpgTable(account: Account, streamIds: string): Promise<Record<string, EpgProgramme[]>>;
  nowPlaying(account: Account, streamIds: number[]): Promise<NowPlayingMap>;
  resolveBestStreamUrl(account: Account, contentType: ContentType, streamId: number, extension?: string): Promise<string>;
  resolveCatchupUrl(account: Account, streamId: number, startRaw: string, durationMinutes: number, extension?: string): string;
}
