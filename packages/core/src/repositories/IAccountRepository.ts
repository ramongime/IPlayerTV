import type { Account } from '../domain';

export interface IAccountRepository {
  list(): Promise<Account[]>;
  create(payload: Pick<Account, 'name' | 'server' | 'username' | 'password' | 'output' | 'player'>): Promise<Account>;
  update(id: string, payload: Partial<Pick<Account, 'name' | 'server' | 'username' | 'password' | 'output' | 'player' | 'userAgent'>>): Promise<Account>;
  remove(id: string): Promise<void>;
}
