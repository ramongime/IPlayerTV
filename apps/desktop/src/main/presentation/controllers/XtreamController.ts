import { ipcMain } from 'electron';
import { AccountRepository } from '../../infrastructure/database/AccountRepository';
import { XtreamProvider } from '@iplayertv/core';
import type { ContentType } from '@iplayertv/core';
import { z } from 'zod';

export function registerXtreamIPC(
  accountsRepo: AccountRepository,
  xtreamProvider: XtreamProvider
) {
  const accountCache = new Map<string, { account: any; timestamp: number }>();
  const CACHE_TTL = 30 * 1000;

  const resolveAccount = async (accountId: string) => {
    const now = Date.now();
    const cached = accountCache.get(accountId);
    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      return cached.account;
    }

    const accounts = await accountsRepo.list();
    const account = accounts.find(a => a.id === accountId);
    if (!account) throw new Error(`Account not found: ${accountId}`);
    
    accountCache.set(accountId, { account, timestamp: now });
    return account;
  };

  const accountSchema = z.object({
    id: z.string().optional(),
    server: z.string().url(),
    username: z.string().min(1),
    password: z.string().min(1),
    name: z.string().optional(),
    output: z.string().optional(),
    player: z.string().optional(),
    userAgent: z.string().optional(),
  });

  const accountIdSchema = z.string().min(1);
  const contentTypeSchema = z.enum(['live', 'movie', 'series']);
  const categoryIdSchema = z.string().optional();

  ipcMain.handle('xtream:authenticate', (_, account) => {
    return xtreamProvider.authenticate(accountSchema.parse(account));
  });

  ipcMain.handle('xtream:categories', async (_, accountId: string, contentType: ContentType) => {
    return xtreamProvider.categories(
      await resolveAccount(accountIdSchema.parse(accountId)),
      contentTypeSchema.parse(contentType)
    );
  });

  ipcMain.handle('xtream:streams', async (_, accountId: string, contentType: ContentType, categoryId?: string) => {
    return xtreamProvider.streams(
      await resolveAccount(accountIdSchema.parse(accountId)),
      contentTypeSchema.parse(contentType),
      categoryIdSchema.parse(categoryId)
    );
  });

  ipcMain.handle('xtream:series-episodes', async (_, accountId: string, seriesId: number) => {
    return xtreamProvider.seriesEpisodes(
      await resolveAccount(accountIdSchema.parse(accountId)),
      z.number().parse(seriesId)
    );
  });

  ipcMain.handle('xtream:epg', async (_, accountId: string, streamId: number, limit?: number) => {
    return xtreamProvider.shortEpg(
      await resolveAccount(accountIdSchema.parse(accountId)),
      z.number().parse(streamId),
      z.number().optional().parse(limit)
    );
  });

  ipcMain.handle('xtream:epg-table', async (_, accountId: string, streamIds: string) => {
    return xtreamProvider.getEpgTable(
      await resolveAccount(accountIdSchema.parse(accountId)),
      z.string().parse(streamIds)
    );
  });

  ipcMain.handle('xtream:now-playing', async (_, accountId: string, streamIds: number[]) => {
    return xtreamProvider.nowPlaying(
      await resolveAccount(accountIdSchema.parse(accountId)),
      z.array(z.number()).parse(streamIds)
    );
  });
}
