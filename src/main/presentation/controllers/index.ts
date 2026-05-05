import { ipcMain } from 'electron';
import { AccountRepository } from '../../infrastructure/database/AccountRepository';
import { FavoriteRepository } from '../../infrastructure/database/FavoriteRepository';
import { HistoryRepository } from '../../infrastructure/database/HistoryRepository';
import { XtreamProvider } from '../../infrastructure/providers/XtreamProvider';
import { DesktopPlayerProvider } from '../../infrastructure/providers/DesktopPlayerProvider';
import { SettingsProvider } from '../../infrastructure/settings/SettingsProvider';
import type { ContentType } from '@shared/domain';

export function registerControllers() {
  const settingsProvider = new SettingsProvider();
  const accountsRepo = new AccountRepository();
  const favoritesRepo = new FavoriteRepository();
  const historyRepo = new HistoryRepository();

  const xtreamProvider = new XtreamProvider(() => settingsProvider.get().stream.probeTimeoutMs);
  const playerProvider = new DesktopPlayerProvider(() => settingsProvider.get());

  const resolveAccount = (accountId: string) => {
    const account = accountsRepo.list().find(a => a.id === accountId);
    if (!account) throw new Error(`Account not found: ${accountId}`);
    return account;
  };

  // --- Accounts ---
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

  // --- Favorites ---
  ipcMain.handle('favorites:list', (_, accountId) => favoritesRepo.list(accountId));
  ipcMain.handle('favorites:toggle', (_, payload) => favoritesRepo.toggle(payload));

  // --- History ---
  ipcMain.handle('history:list', (_, accountId) => historyRepo.list(accountId));
  ipcMain.handle('history:add', (_, payload) => historyRepo.add(payload));
  ipcMain.handle('history:upsertProgress', (_, accountId, streamId, progress, duration) => historyRepo.upsertProgress(accountId, streamId, progress, duration));

  // --- TMDB ---
  const tmdbProvider = new (require('../infrastructure/providers/TmdbProvider').TmdbProvider)();
  ipcMain.handle('tmdb:fetchInfo', async (_, name: string, type: 'movie' | 'series') => {
    const config: any = settingsProvider.get();
    if (!config.tmdbApiKey) return undefined;
    return tmdbProvider.fetchInfo(name, type, config.tmdbApiKey);
  });


  // --- Xtream ---

  ipcMain.handle('xtream:authenticate', (_, account) => xtreamProvider.authenticate(account));
  ipcMain.handle('xtream:categories', (_, accountId: string, contentType: ContentType) => xtreamProvider.categories(resolveAccount(accountId), contentType));
  ipcMain.handle('xtream:streams', (_, accountId: string, contentType: ContentType, categoryId?: string) => xtreamProvider.streams(resolveAccount(accountId), contentType, categoryId));
  ipcMain.handle('xtream:series-episodes', (_, accountId: string, seriesId: number) => xtreamProvider.seriesEpisodes(resolveAccount(accountId), seriesId));
  ipcMain.handle('xtream:epg', (_, accountId: string, streamId: number, limit?: number) => xtreamProvider.shortEpg(resolveAccount(accountId), streamId, limit));
  ipcMain.handle('xtream:epg-table', (_, accountId: string, streamIds: string) => xtreamProvider.getEpgTable(resolveAccount(accountId), streamIds));
  ipcMain.handle('xtream:now-playing', (_, accountId: string, streamIds: number[]) => xtreamProvider.nowPlaying(resolveAccount(accountId), streamIds));

  // --- Player ---
  ipcMain.handle('player:open', async (_, payload) => {
    const account = accountsRepo.list().find(a => a.id === payload.accountId);
    if (!account) throw new Error('Account not found');

    const streamUrl = await xtreamProvider.resolveBestStreamUrl(
      account,
      payload.contentType,
      payload.streamId,
      payload.extension
    );

    return playerProvider.play(streamUrl, account.player as 'vlc' | 'mpv' | 'browser', payload.title);
  });

  ipcMain.handle('player:resolveUrl', async (_, payload) => {
    const account = accountsRepo.list().find(a => a.id === payload.accountId);
    if (!account) throw new Error('Account not found');

    const streamUrl = await xtreamProvider.resolveBestStreamUrl(
      account,
      payload.contentType,
      payload.streamId,
      payload.extension
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

  // --- Shell ---
  ipcMain.handle('shell:openExternal', async (_, url: string) => {
    const { shell } = await import('electron');
    await shell.openExternal(url);
  });

  // --- Settings ---
  ipcMain.handle('settings:get', () => settingsProvider.get());
  ipcMain.handle('settings:update', (_, payload) => settingsProvider.update(payload));
}
