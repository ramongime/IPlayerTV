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

  // --- Accounts ---
  ipcMain.handle('accounts:list', () => accountsRepo.list());
  ipcMain.handle('accounts:create', (_, payload) => accountsRepo.create(payload));
  ipcMain.handle('accounts:remove', (_, id) => accountsRepo.remove(id));

  // --- Favorites ---
  ipcMain.handle('favorites:list', (_, accountId) => favoritesRepo.list(accountId));
  ipcMain.handle('favorites:toggle', (_, payload) => favoritesRepo.toggle(payload));

  // --- History ---
  ipcMain.handle('history:list', (_, accountId) => historyRepo.list(accountId));
  ipcMain.handle('history:add', (_, payload) => historyRepo.add(payload));

  // --- Xtream ---
  ipcMain.handle('xtream:authenticate', (_, account) => xtreamProvider.authenticate(account));
  ipcMain.handle('xtream:categories', (_, account, contentType: ContentType) => xtreamProvider.categories(account, contentType));
  ipcMain.handle('xtream:streams', (_, account, contentType: ContentType, categoryId?: string) => xtreamProvider.streams(account, contentType, categoryId));
  ipcMain.handle('xtream:seriesEpisodes', (_, account, seriesId: number) => xtreamProvider.seriesEpisodes(account, seriesId));
  ipcMain.handle('xtream:epg', (_, account, streamId: number, limit?: number) => xtreamProvider.shortEpg(account, streamId, limit));

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

    return playerProvider.play(streamUrl, account.player, payload.title);
  });

  // --- Settings ---
  ipcMain.handle('settings:get', () => settingsProvider.get());
  ipcMain.handle('settings:update', (_, payload) => settingsProvider.update(payload));
}
