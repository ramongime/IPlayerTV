import { randomUUID } from 'node:crypto';
import type { Account } from '@iplayertv/core';
import type { IAccountRepository } from '@iplayertv/core';
import { getDatabase } from './DatabaseConnection';

// better-sqlite3 is synchronous; methods are async only to satisfy the shared
// IAccountRepository contract (the mobile SQLite implementation is truly async).
export class AccountRepository implements IAccountRepository {
  async list(): Promise<Account[]> {
    const db = getDatabase();
    return db.prepare('SELECT * FROM accounts ORDER BY createdAt DESC').all() as Account[];
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
      id,
      createdAt: now,
      updatedAt: now
    };

    stmt.run(account);
    return account as Account;
  }

  async update(id: string, payload: Partial<Pick<Account, 'name' | 'server' | 'username' | 'password' | 'output' | 'player' | 'userAgent'>>): Promise<Account> {
    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as Account | undefined;
    if (!existing) throw new Error(`Account not found: ${id}`);

    const fields = Object.keys(payload).filter((key) => (payload as Record<string, unknown>)[key] !== undefined);
    if (fields.length === 0) return existing;

    const setClauses = fields.map((field) => `${field} = @${field}`).join(', ');
    const now = new Date().toISOString();
    const stmt = db.prepare(`UPDATE accounts SET ${setClauses}, updatedAt = @updatedAt WHERE id = @id`);
    stmt.run({ ...payload, updatedAt: now, id });

    return db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as Account;
  }

  async remove(id: string): Promise<void> {
    const db = getDatabase();
    db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
    db.prepare('DELETE FROM favorites WHERE accountId = ?').run(id);
  }
}
