import type {
  Account,
  ContentType,
  Favorite,
  IAccountRepository,
  IFavoriteRepository,
  IWatchedRepository,
} from '@iplayertv/core';
import { getDatabase } from './db';

const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export class AccountRepository implements IAccountRepository {
  async list(): Promise<Account[]> {
    const db = await getDatabase();
    return db.getAllAsync<Account>('SELECT * FROM accounts ORDER BY createdAt DESC');
  }

  async create(payload: Pick<Account, 'name' | 'server' | 'username' | 'password' | 'output' | 'player'>): Promise<Account> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const account = { ...payload, id: genId(), createdAt: now, updatedAt: now } as Account;

    await db.runAsync(
      'INSERT INTO accounts (id, name, server, username, password, output, player, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [account.id, account.name, account.server, account.username, account.password, account.output, account.player, account.createdAt, account.updatedAt]
    );
    return account;
  }

  async update(id: string, payload: Partial<Pick<Account, 'name' | 'server' | 'username' | 'password' | 'output' | 'player' | 'userAgent'>>): Promise<Account> {
    const db = await getDatabase();
    const existing = await db.getFirstAsync<Account>('SELECT * FROM accounts WHERE id = ?', [id]);
    if (!existing) throw new Error(`Account not found: ${id}`);

    const fields = Object.keys(payload).filter((key) => (payload as Record<string, unknown>)[key] !== undefined);
    if (fields.length === 0) return existing;

    const setClauses = fields.map((field) => `${field} = ?`).join(', ');
    const values = fields.map((field) => (payload as Record<string, unknown>)[field] as string);
    await db.runAsync(`UPDATE accounts SET ${setClauses}, updatedAt = ? WHERE id = ?`, [...values, new Date().toISOString(), id]);

    return (await db.getFirstAsync<Account>('SELECT * FROM accounts WHERE id = ?', [id]))!;
  }

  async remove(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM accounts WHERE id = ?', [id]);
    await db.runAsync('DELETE FROM favorites WHERE accountId = ?', [id]);
    await db.runAsync('DELETE FROM watched WHERE accountId = ?', [id]);
  }
}

export class FavoriteRepository implements IFavoriteRepository {
  async list(accountId: string): Promise<Favorite[]> {
    const db = await getDatabase();
    return db.getAllAsync<Favorite>('SELECT * FROM favorites WHERE accountId = ? ORDER BY createdAt DESC', [accountId]);
  }

  async toggle(payload: Pick<Favorite, 'accountId' | 'contentType' | 'streamId' | 'name' | 'icon'>): Promise<boolean> {
    const db = await getDatabase();
    const existing = await db.getFirstAsync(
      'SELECT 1 FROM favorites WHERE accountId = ? AND contentType = ? AND streamId = ?',
      [payload.accountId, payload.contentType, payload.streamId]
    );

    if (existing) {
      await db.runAsync(
        'DELETE FROM favorites WHERE accountId = ? AND contentType = ? AND streamId = ?',
        [payload.accountId, payload.contentType, payload.streamId]
      );
      return false;
    }

    await db.runAsync(
      'INSERT INTO favorites (accountId, contentType, streamId, name, icon, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [payload.accountId, payload.contentType, payload.streamId, payload.name, payload.icon ?? null, new Date().toISOString()]
    );
    return true;
  }
}

export class WatchedRepository implements IWatchedRepository {
  async list(accountId: string): Promise<{ contentType: ContentType, streamId: number }[]> {
    const db = await getDatabase();
    return db.getAllAsync<{ contentType: ContentType, streamId: number }>(
      'SELECT contentType, streamId FROM watched WHERE accountId = ?',
      [accountId]
    );
  }

  async toggle(accountId: string, contentType: ContentType, streamId: number): Promise<boolean> {
    const db = await getDatabase();
    const existing = await db.getFirstAsync(
      'SELECT 1 FROM watched WHERE accountId = ? AND contentType = ? AND streamId = ?',
      [accountId, contentType, streamId]
    );

    if (existing) {
      await db.runAsync(
        'DELETE FROM watched WHERE accountId = ? AND contentType = ? AND streamId = ?',
        [accountId, contentType, streamId]
      );
      return false;
    }

    await db.runAsync(
      'INSERT INTO watched (accountId, contentType, streamId, createdAt) VALUES (?, ?, ?, ?)',
      [accountId, contentType, streamId, new Date().toISOString()]
    );
    return true;
  }

  // Auto-mark on playback: adds without removing (unlike toggle).
  async markWatched(accountId: string, contentType: ContentType, streamId: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT OR IGNORE INTO watched (accountId, contentType, streamId, createdAt) VALUES (?, ?, ?, ?)',
      [accountId, contentType, streamId, new Date().toISOString()]
    );
  }

  async clear(accountId?: string): Promise<void> {
    const db = await getDatabase();
    if (accountId) {
      await db.runAsync('DELETE FROM watched WHERE accountId = ?', [accountId]);
    } else {
      await db.runAsync('DELETE FROM watched');
    }
  }
}

export const accountsRepo = new AccountRepository();
export const favoritesRepo = new FavoriteRepository();
export const watchedRepo = new WatchedRepository();
