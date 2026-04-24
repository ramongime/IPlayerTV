import type { Account } from '@shared/domain';

export interface IAccountRepository {
  list(): Account[];
  create(payload: Pick<Account, 'name' | 'server' | 'username' | 'password' | 'output' | 'player'>): Account;
  remove(id: string): void;
}
