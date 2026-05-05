import type { Account } from '@shared/domain';

export interface IAccountRepository {
  list(): Account[];
  create(payload: Pick<Account, 'name' | 'server' | 'username' | 'password' | 'output' | 'player'>): Account;
  update(id: string, payload: Partial<Pick<Account, 'name' | 'server' | 'username' | 'password' | 'output' | 'player' | 'userAgent'>>): Account;
  remove(id: string): void;
}
