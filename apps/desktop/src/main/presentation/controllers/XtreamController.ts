import { ipcMain } from 'electron';
import { AccountRepository } from '../../infrastructure/database/AccountRepository';
import { XtreamProvider } from '@iplayertv/core';
import type { ContentType } from '@iplayertv/core';

export function registerXtreamIPC(
  accountsRepo: AccountRepository,
  xtreamProvider: XtreamProvider
) {
  const resolveAccount = async (accountId: string) => {
    const accounts = await accountsRepo.list();
    const account = accounts.find(a => a.id === accountId);
    if (!account) throw new Error(`Account not found: ${accountId}`);
    return account;
  };

  ipcMain.handle('xtream:authenticate', (_, account) => xtreamProvider.authenticate(account));
  ipcMain.handle('xtream:categories', async (_, accountId: string, contentType: ContentType) => xtreamProvider.categories(await resolveAccount(accountId), contentType));
  ipcMain.handle('xtream:streams', async (_, accountId: string, contentType: ContentType, categoryId?: string) => xtreamProvider.streams(await resolveAccount(accountId), contentType, categoryId));
  ipcMain.handle('xtream:series-episodes', async (_, accountId: string, seriesId: number) => xtreamProvider.seriesEpisodes(await resolveAccount(accountId), seriesId));
  ipcMain.handle('xtream:epg', async (_, accountId: string, streamId: number, limit?: number) => xtreamProvider.shortEpg(await resolveAccount(accountId), streamId, limit));
  ipcMain.handle('xtream:epg-table', async (_, accountId: string, streamIds: string) => xtreamProvider.getEpgTable(await resolveAccount(accountId), streamIds));
  ipcMain.handle('xtream:now-playing', async (_, accountId: string, streamIds: number[]) => xtreamProvider.nowPlaying(await resolveAccount(accountId), streamIds));
}
