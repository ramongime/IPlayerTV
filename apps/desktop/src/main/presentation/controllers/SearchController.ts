import { ipcMain } from 'electron';
import type { AccountRepository } from '../../infrastructure/database/AccountRepository';
import type { XtreamProvider, StreamItem, GlobalSearchResult } from '@iplayertv/core';
import { z } from 'zod';

export function registerSearchIPC(
  accountsRepo: AccountRepository,
  xtreamProvider: XtreamProvider
) {
  const cache = new Map<string, { live: StreamItem[]; movie: StreamItem[]; series: StreamItem[]; timestamp: number }>();
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in-memory cache

  const resolveStreams = async (accountId: string) => {
    const now = Date.now();
    const cached = cache.get(accountId);
    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      return cached;
    }

    const accounts = await accountsRepo.list();
    const account = accounts.find(a => a.id === accountId);
    if (!account) throw new Error(`Account not found: ${accountId}`);

    const [live, movie, series] = await Promise.all([
      xtreamProvider.streams(account, 'live').catch(() => []),
      xtreamProvider.streams(account, 'movie').catch(() => []),
      xtreamProvider.streams(account, 'series').catch(() => [])
    ]);

    const entry = { live, movie, series, timestamp: now };
    cache.set(accountId, entry);
    return entry;
  };

  const searchPayloadSchema = z.object({
    accountId: z.string().min(1),
    query: z.string().min(1)
  });

  ipcMain.handle('search:global', async (_, accountId: string, query: string): Promise<GlobalSearchResult> => {
    const parsed = searchPayloadSchema.parse({ accountId, query });
    const cleanQuery = parsed.query.trim().toLowerCase();

    if (cleanQuery.length < 2) {
      return { live: [], movie: [], series: [], total: 0 };
    }

    const data = await resolveStreams(parsed.accountId);

    const liveMatches = data.live.filter(s => s.name?.toLowerCase().includes(cleanQuery)).slice(0, 50);
    const movieMatches = data.movie.filter(s => s.name?.toLowerCase().includes(cleanQuery)).slice(0, 50);
    const seriesMatches = data.series.filter(s => s.name?.toLowerCase().includes(cleanQuery)).slice(0, 50);

    const total = liveMatches.length + movieMatches.length + seriesMatches.length;

    return {
      live: liveMatches,
      movie: movieMatches,
      series: seriesMatches,
      total
    };
  });
}
