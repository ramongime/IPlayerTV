import { AccountRepository } from '../../infrastructure/database/AccountRepository';
import { FavoriteRepository } from '../../infrastructure/database/FavoriteRepository';
import { HistoryRepository } from '../../infrastructure/database/HistoryRepository';
import { XtreamProvider } from '../../infrastructure/providers/XtreamProvider';
import { DesktopPlayerProvider } from '../../infrastructure/providers/DesktopPlayerProvider';
import { SettingsProvider } from '../../infrastructure/settings/SettingsProvider';

import { registerAccountsIPC } from './AccountsController';
import { registerFavoritesIPC } from './FavoritesController';
import { registerHistoryIPC } from './HistoryController';
import { registerTmdbIPC } from './TmdbController';
import { registerXtreamIPC } from './XtreamController';
import { registerPlayerIPC } from './PlayerController';
import { registerSettingsIPC } from './SettingsController';
import { registerWindowIPC } from './WindowController';

export function registerControllers() {
  const settingsProvider = new SettingsProvider();
  const accountsRepo = new AccountRepository();
  const favoritesRepo = new FavoriteRepository();
  const historyRepo = new HistoryRepository();

  const xtreamProvider = new XtreamProvider(() => settingsProvider.get().stream.probeTimeoutMs);
  const playerProvider = new DesktopPlayerProvider(() => settingsProvider.get());

  registerAccountsIPC(accountsRepo, xtreamProvider);
  registerFavoritesIPC(favoritesRepo);
  registerHistoryIPC(historyRepo);
  registerTmdbIPC(settingsProvider);
  registerXtreamIPC(accountsRepo, xtreamProvider);
  registerPlayerIPC(accountsRepo, xtreamProvider, playerProvider);
  registerSettingsIPC(settingsProvider);
  registerWindowIPC();
}
