import { randomUUID } from 'node:crypto';
import type { Account } from '@shared/domain';
import type { IAccountRepository } from '../../core/repositories/IAccountRepository';
import { getDatabase } from './DatabaseConnection';

export class AccountRepository implements IAccountRepository {
  list(): Account[] {
    const db = getDatabase();
    return db.prepare('SELECT * FROM accounts ORDER BY createdAt DESC').all() as Account[];
  }

  create(payload: Pick<Account, 'name' | 'server' | 'username' | 'password' | 'output' | 'player'>): Account {
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

  remove(id: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
    db.prepare('DELETE FROM favorites WHERE accountId = ?').run(id);
    db.prepare('DELETE FROM history WHERE accountId = ?').run(id);
  }
}
