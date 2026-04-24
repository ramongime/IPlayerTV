import { randomUUID } from 'node:crypto';
import { getDatabase } from '../db/database';
import type { Account } from '../types';

export class AccountService {
  list(): Account[] {
    const db = getDatabase();
    return db.prepare('SELECT * FROM accounts ORDER BY updatedAt DESC').all() as Account[];
  }

  getById(id: string): Account | undefined {
    const db = getDatabase();
    return db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as Account | undefined;
  }

  create(input: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Account {
    const db = getDatabase();
    const now = new Date().toISOString();
    const account: Account = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...input
    };

    db.prepare(`
      INSERT INTO accounts (id, name, server, username, password, output, player, userAgent, createdAt, updatedAt)
      VALUES (@id, @name, @server, @username, @password, @output, @player, @userAgent, @createdAt, @updatedAt)
    `).run(account);

    return account;
  }

  remove(id: string) {
    const db = getDatabase();
    db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
    db.prepare('DELETE FROM favorites WHERE accountId = ?').run(id);
    db.prepare('DELETE FROM history WHERE accountId = ?').run(id);
    return { ok: true };
  }
}
