import { ipcMain } from 'electron';
import { AccountRepository } from '../../infrastructure/database/AccountRepository';
import { XtreamProvider } from '../../infrastructure/providers/XtreamProvider';
import type { ContentType } from '@shared/domain';

export function registerXtreamIPC(
  accountsRepo: AccountRepository,
  xtreamProvider: XtreamProvider
) {
  const resolveAccount = (accountId: string) => {
    const account = accountsRepo.list().find(a => a.id === accountId);
    if (!account) throw new Error(`Account not found: ${accountId}`);
    return account;
  };

  ipcMain.handle('xtream:authenticate', (_, account) => xtreamProvider.authenticate(account));
  ipcMain.handle('xtream:categories', (_, accountId: string, contentType: ContentType) => xtreamProvider.categories(resolveAccount(accountId), contentType));
  ipcMain.handle('xtream:streams', (_, accountId: string, contentType: ContentType, categoryId?: string) => xtreamProvider.streams(resolveAccount(accountId), contentType, categoryId));
  ipcMain.handle('xtream:series-episodes', (_, accountId: string, seriesId: number) => xtreamProvider.seriesEpisodes(resolveAccount(accountId), seriesId));
  ipcMain.handle('xtream:epg', (_, accountId: string, streamId: number, limit?: number) => xtreamProvider.shortEpg(resolveAccount(accountId), streamId, limit));
  ipcMain.handle('xtream:epg-table', (_, accountId: string, streamIds: string) => xtreamProvider.getEpgTable(resolveAccount(accountId), streamIds));
  ipcMain.handle('xtream:now-playing', (_, accountId: string, streamIds: number[]) => xtreamProvider.nowPlaying(resolveAccount(accountId), streamIds));
}
