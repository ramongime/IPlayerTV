import { ipcMain } from 'electron';
import { ZodError } from 'zod';
import { accountInputSchema, accountUpdateSchema } from '@iplayertv/core';
import { AccountRepository } from '../../infrastructure/database/AccountRepository';
import { XtreamProvider } from '@iplayertv/core';

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => issue.message).join(', ');
}

export function registerAccountsIPC(
  accountsRepo: AccountRepository,
  xtreamProvider: XtreamProvider
) {
  const resolveAccount = async (accountId: string) => {
    const accounts = await accountsRepo.list();
    const account = accounts.find(a => a.id === accountId);
    if (!account) throw new Error(`Account not found: ${accountId}`);
    return account;
  };

  const assertValidCredentials = async (credentials: { server: string; username: string; password: string; userAgent?: string }) => {
    const result = await xtreamProvider.authenticate(credentials);
    if (!result.ok) {
      throw new Error('Não foi possível validar a conta: credenciais inválidas ou servidor Xtream inacessível.');
    }
  };

  ipcMain.handle('accounts:list', () => accountsRepo.list());

  ipcMain.handle('accounts:create', async (_, payload) => {
    let input;
    try {
      input = accountInputSchema.parse(payload);
    } catch (error) {
      throw new Error(error instanceof ZodError ? formatZodError(error) : String(error));
    }

    await assertValidCredentials(input);
    return accountsRepo.create(input);
  });

  ipcMain.handle('accounts:update', async (_, id: string, payload: any) => {
    let input;
    try {
      input = accountUpdateSchema.parse(payload);
    } catch (error) {
      throw new Error(error instanceof ZodError ? formatZodError(error) : String(error));
    }

    if (input.server || input.username || input.password) {
      const existing = await resolveAccount(id);
      await assertValidCredentials({ ...existing, ...input });
    }

    return accountsRepo.update(id, input);
  });

  ipcMain.handle('accounts:remove', (_, id) => accountsRepo.remove(id));
  ipcMain.handle('accounts:info', async (_, accountId: string) => {
    const account = await resolveAccount(accountId);
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
