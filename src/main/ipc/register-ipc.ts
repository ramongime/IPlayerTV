import { ipcMain, shell } from 'electron';
import { AccountService } from '../services/account-service';
import { FavoritesService } from '../services/favorites-service';
import { HistoryService } from '../services/history-service';
import { PlayerService } from '../services/player-service';
import { SettingsService } from '../services/settings-service';
import { XtreamService } from '../services/xtream-service';
import type { Account, ContentType } from '../types';

const accounts = new AccountService();
const favorites = new FavoritesService();
const history = new HistoryService();
const settings = new SettingsService();
const xtream = new XtreamService();
const playerService = new PlayerService();

export function registerIpc() {
  ipcMain.handle('accounts:list', () => accounts.list());
  ipcMain.handle('accounts:create', async (_event, payload: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => {
    const auth = await xtream.authenticate(payload);
    if (!auth.ok) {
      throw new Error('Conta inválida ou servidor não respondeu corretamente.');
    }
    return accounts.create(payload);
  });
  ipcMain.handle('accounts:remove', (_event, id: string) => accounts.remove(id));

  ipcMain.handle('xtream:categories', (_event, accountId: string, contentType: ContentType) => {
    const account = mustAccount(accountId);
    return xtream.categories(account, contentType);
  });

  ipcMain.handle('xtream:streams', (_event, accountId: string, contentType: ContentType, categoryId?: string) => {
    const account = mustAccount(accountId);
    return xtream.streams(account, contentType, categoryId);
  });

  ipcMain.handle('xtream:series-episodes', (_event, accountId: string, seriesId: number) => {
    const account = mustAccount(accountId);
    return xtream.seriesEpisodes(account, seriesId);
  });

  ipcMain.handle('xtream:epg', (_event, accountId: string, streamId: number, limit?: number) => {
    const account = mustAccount(accountId);
    return xtream.shortEpg(account, streamId, limit);
  });

  ipcMain.handle('favorites:list', (_event, accountId: string) => favorites.list(accountId));
  ipcMain.handle('favorites:toggle', (_event, payload) => favorites.toggle(
    payload.accountId,
    payload.contentType,
    payload.streamId,
    payload.name,
    payload.icon
  ));

  ipcMain.handle('history:list', (_event, accountId: string) => history.list(accountId));

  ipcMain.handle('player:open', async (_event, payload: { accountId: string; contentType: ContentType; streamId: number; name: string; extension?: string }) => {
    const account = mustAccount(payload.accountId);
    const streamUrl = await xtream.resolveBestStreamUrl(account, payload.contentType, payload.streamId, payload.extension);
    const result = await playerService.open(streamUrl, account.player, payload.name);

    history.add({
      accountId: payload.accountId,
      contentType: payload.contentType,
      streamId: payload.streamId,
      name: payload.name,
      streamUrl
    });

    if (result.method === 'browser') {
      await shell.openExternal(streamUrl);
    }

    return result;
  });

  ipcMain.handle('player:probe', async (_event, payload: { accountId: string; contentType: ContentType; streamId: number; extension?: string }) => {
    const account = mustAccount(payload.accountId);
    const url = await xtream.resolveBestStreamUrl(account, payload.contentType, payload.streamId, payload.extension);
    return { url };
  });

  ipcMain.handle('settings:get', () => settings.get());
  ipcMain.handle('settings:update', (_event, payload) => settings.update(payload));
}

function mustAccount(accountId: string) {
  const account = accounts.getById(accountId);
  if (!account) {
    throw new Error('Conta não encontrada.');
  }
  return account;
}
