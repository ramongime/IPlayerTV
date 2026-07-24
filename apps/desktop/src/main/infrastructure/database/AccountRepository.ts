import { randomUUID } from 'node:crypto';
import type { Account } from '@iplayertv/core';
import type { IAccountRepository } from '@iplayertv/core';
import { getDatabase } from './DatabaseConnection';
import { safeStorage } from 'electron';

function encryptPassword(text: string): string {
  if (text && safeStorage && safeStorage.isEncryptionAvailable()) {
    if (text.startsWith('ENCRYPTED:')) return text;
    return 'ENCRYPTED:' + safeStorage.encryptString(text).toString('base64');
  }
  return text;
}

function decryptPassword(text: string): string {
  if (text && text.startsWith('ENCRYPTED:') && safeStorage && safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(text.replace('ENCRYPTED:', ''), 'base64'));
    } catch {
      return text;
    }
  }
  return text;
}

function mapAccount(account: any): Account {
  if (!account) return account;
  return {
    ...account,
    password: decryptPassword(account.password),
    isActive: Boolean(account.isActive)
  };
}

// better-sqlite3 is synchronous; methods are async only to satisfy the shared
// IAccountRepository contract (the mobile SQLite implementation is truly async).
export class AccountRepository implements IAccountRepository {
  async list(): Promise<Account[]> {
    const db = getDatabase();
    const accounts = db.prepare('SELECT * FROM accounts ORDER BY createdAt DESC').all() as Account[];
    return accounts.map(mapAccount);
  }

  async getActive(): Promise<Account | null> {
    const db = getDatabase();
    const active = db.prepare('SELECT * FROM accounts WHERE isActive = 1 LIMIT 1').get() as Account | undefined;
    if (active) return mapAccount(active);
    const fallback = db.prepare('SELECT * FROM accounts ORDER BY createdAt DESC LIMIT 1').get() as Account | undefined;
    if (fallback) return mapAccount(fallback);
    return null;
  }

  async setActive(id: string): Promise<Account> {
    const db = getDatabase();
    const updateTx = db.transaction(() => {
      const existing = db.prepare('SELECT 1 FROM accounts WHERE id = ?').get(id);
      if (!existing) throw new Error(`Account not found: ${id}`);
      db.prepare('UPDATE accounts SET isActive = 0').run();
      db.prepare('UPDATE accounts SET isActive = 1, updatedAt = ? WHERE id = ?').run(new Date().toISOString(), id);
    });
    updateTx();
    const updated = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as Account;
    return mapAccount(updated);
  }

  async create(payload: Pick<Account, 'name' | 'server' | 'username' | 'password' | 'output' | 'player'>): Promise<Account> {
    const db = getDatabase();
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO accounts (id, name, server, username, password, output, player, createdAt, updatedAt)
      VALUES (@id, @name, @server, @username, @password, @output, @player, @createdAt, @updatedAt)
    `);

    const account = {
      ...payload,
      password: encryptPassword(payload.password),
      id,
      createdAt: now,
      updatedAt: now
    };

    stmt.run(account);
    return mapAccount(account as Account);
  }

  async update(id: string, payload: Partial<Pick<Account, 'name' | 'server' | 'username' | 'password' | 'output' | 'player' | 'userAgent'>>): Promise<Account> {
    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as Account | undefined;
    if (!existing) throw new Error(`Account not found: ${id}`);

    const ALLOWED_FIELDS = ['name', 'server', 'username', 'password', 'output', 'player', 'userAgent'];
    const fields = Object.keys(payload).filter((key) => 
      ALLOWED_FIELDS.includes(key) && (payload as Record<string, unknown>)[key] !== undefined
    );
    if (fields.length === 0) return existing;

    const setClauses = fields.map((field) => `${field} = @${field}`).join(', ');
    const now = new Date().toISOString();
    const accountPayload = { ...payload };
    if (accountPayload.password) {
      accountPayload.password = encryptPassword(accountPayload.password);
    }

    const stmt = db.prepare(`UPDATE accounts SET ${setClauses}, updatedAt = @updatedAt WHERE id = @id`);
    stmt.run({ ...accountPayload, updatedAt: now, id });

    return mapAccount(db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as Account);
  }

  async remove(id: string): Promise<void> {
    const db = getDatabase();
    db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
    db.prepare('DELETE FROM favorites WHERE accountId = ?').run(id);
  }
}
