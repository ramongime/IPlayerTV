import { ipcMain } from 'electron';
import { AccountRepository } from '../../infrastructure/database/AccountRepository';
import { XtreamProvider } from '../../infrastructure/providers/XtreamProvider';
import { DesktopPlayerProvider } from '../../infrastructure/providers/DesktopPlayerProvider';

export function registerPlayerIPC(
  accountsRepo: AccountRepository,
  xtreamProvider: XtreamProvider,
  playerProvider: DesktopPlayerProvider
) {
  ipcMain.handle('player:open', async (_, payload) => {
    const account = accountsRepo.list().find(a => a.id === payload.accountId);
    if (!account) throw new Error('Account not found');

    let preferredExtension = payload.extension;
    let forceExtension = false;
    if (payload.contentType === 'live' && (account.player === 'internal' || account.player === 'browser')) {
      preferredExtension = 'm3u8';
      forceExtension = true;
    }

    const streamUrl = await xtreamProvider.resolveBestStreamUrl(
      account,
      payload.contentType,
      payload.streamId,
      preferredExtension,
      forceExtension
    );

    return playerProvider.play(streamUrl, account.player as 'vlc' | 'mpv' | 'browser', payload.title);
  });

  ipcMain.handle('player:resolveUrl', async (_, payload) => {
    const account = accountsRepo.list().find(a => a.id === payload.accountId);
    if (!account) throw new Error('Account not found');

    let preferredExtension = payload.extension;
    let forceExtension = false;
    if (payload.contentType === 'live' && (account.player === 'internal' || account.player === 'browser')) {
      preferredExtension = 'm3u8';
      forceExtension = true;
    }

    const streamUrl = await xtreamProvider.resolveBestStreamUrl(
      account,
      payload.contentType,
      payload.streamId,
      preferredExtension,
      forceExtension
    );
    return { url: streamUrl };
  });

  ipcMain.handle('player:resolveCatchupUrl', async (_, payload: { accountId: string; streamId: number; startRaw: string; durationMinutes: number; extension?: string }) => {
    const account = accountsRepo.list().find(a => a.id === payload.accountId);
    if (!account) throw new Error('Account not found');

    const streamUrl = xtreamProvider.resolveCatchupUrl(
      account,
      payload.streamId,
      payload.startRaw,
      payload.durationMinutes,
      payload.extension
    );
    return { url: streamUrl };
  });

  ipcMain.handle('player:openCatchup', async (_, payload: { accountId: string; streamId: number; name: string; startRaw: string; durationMinutes: number; extension?: string }) => {
    const account = accountsRepo.list().find(a => a.id === payload.accountId);
    if (!account) throw new Error('Account not found');

    const streamUrl = xtreamProvider.resolveCatchupUrl(
      account,
      payload.streamId,
      payload.startRaw,
      payload.durationMinutes,
      payload.extension
    );

    return playerProvider.play(streamUrl, account.player as 'vlc' | 'mpv' | 'browser', payload.name);
  });
}
