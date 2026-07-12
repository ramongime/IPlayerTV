import { TmdbClient, XtreamProvider } from '@iplayertv/core';
import type { Account } from '@iplayertv/core';
import { accountsRepo } from './repositories';

// Native fetch has no CORS on mobile, so no webSecurity tricks are needed here.
export const xtream = new XtreamProvider(() => 3500);
export const tmdb = new TmdbClient((url) => fetch(url));

// Public TMDB v3 read key used as a fallback when the user hasn't set their own.
// Overridable at build time via EXPO_PUBLIC_TMDB_API_KEY. Defined in one place so
// it isn't scattered as a magic string across components (see security-reactnative).
export const DEFAULT_TMDB_API_KEY =
  process.env.EXPO_PUBLIC_TMDB_API_KEY ?? 'a43d0032bda98c8c4cc815fb5a639dfc';

// Simple in-memory cache for resolved accounts to avoid repeated SQL queries
const accountCache = new Map<string, { account: Account; ts: number }>();
const CACHE_TTL = 30_000; // 30 seconds

export async function resolveAccount(accountId: string): Promise<Account> {
  const cached = accountCache.get(accountId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.account;
  }

  const accounts = await accountsRepo.list();
  const account = accounts.find((a) => a.id === accountId);
  if (!account) throw new Error(`Account not found: ${accountId}`);

  accountCache.set(accountId, { account, ts: Date.now() });
  return account;
}

export function invalidateAccountCache(accountId?: string) {
  if (accountId) {
    accountCache.delete(accountId);
  } else {
    accountCache.clear();
  }
}
