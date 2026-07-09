import { TmdbClient, XtreamProvider } from '@iplayertv/core';
import type { Account } from '@iplayertv/core';
import { accountsRepo } from './repositories';

// Native fetch has no CORS on mobile, so no webSecurity tricks are needed here.
export const xtream = new XtreamProvider(() => 3500);
export const tmdb = new TmdbClient((url) => fetch(url));

export async function resolveAccount(accountId: string): Promise<Account> {
  const accounts = await accountsRepo.list();
  const account = accounts.find((a) => a.id === accountId);
  if (!account) throw new Error(`Account not found: ${accountId}`);
  return account;
}
