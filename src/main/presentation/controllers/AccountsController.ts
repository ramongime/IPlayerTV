import { ipcMain } from 'electron';
import { AccountRepository } from '../../infrastructure/database/AccountRepository';
import { XtreamProvider } from '../../infrastructure/providers/XtreamProvider';

export function registerAccountsIPC(
  accountsRepo: AccountRepository,
  xtreamProvider: XtreamProvider
) {
  const resolveAccount = (accountId: string) => {
    const account = accountsRepo.list().find(a => a.id === accountId);
    if (!account) throw new Error(`Account not found: ${accountId}`);
    return account;
  };

  ipcMain.handle('accounts:list', () => accountsRepo.list());
  ipcMain.handle('accounts:create', (_, payload) => accountsRepo.create(payload));
  ipcMain.handle('accounts:update', (_, id: string, payload: any) => accountsRepo.update(id, payload));
  ipcMain.handle('accounts:remove', (_, id) => accountsRepo.remove(id));
  ipcMain.handle('accounts:info', async (_, accountId: string) => {
    const account = resolveAccount(accountId);
    const result = await xtreamProvider.authenticate(account);
    const info = result.data.user_info;
    const server = result.data.server_info;
    return {
      status: info?.status ?? 'unknown',
      expDate: info?.exp_date ? new Date(Number(info.exp_date) * 1000).toLocaleDateString('pt-BR') : 'Sem data',
      activeConnections: info?.active_cons ?? 0,
      maxConnections: info?.max_connections ?? '?',
      allowedFormats: info?.allowed_output_formats ?? [],
      serverUrl: server?.url ?? account.server,
      serverTimezone: server?.timezone ?? ''
    };
  });
}
