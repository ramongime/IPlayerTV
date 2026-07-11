import { TmdbClient, XtreamProvider } from '@iplayertv/core';
import type { Account } from '@iplayertv/core';
import { accountsRepo } from './repositories';

// Native fetch has no CORS on mobile, so no webSecurity tricks are needed here.
export const xtream = new XtreamProvider(() => 3500);
export const tmdb = new TmdbClient((url) => fetch(url));

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
