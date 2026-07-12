import { AccountRepository } from '../../infrastructure/database/AccountRepository';
import { FavoriteRepository } from '../../infrastructure/database/FavoriteRepository';
import { WatchedRepository } from '../../infrastructure/database/WatchedRepository';
import { XtreamProvider } from '@iplayertv/core';
import { DesktopPlayerProvider } from '../../infrastructure/providers/DesktopPlayerProvider';
import { SettingsProvider } from '../../infrastructure/settings/SettingsProvider';

import { registerAccountsIPC } from './AccountsController';
import { registerFavoritesIPC } from './FavoritesController';
import { registerWatchedIPC } from './WatchedController';
import { registerTmdbIPC } from './TmdbController';
import { registerXtreamIPC } from './XtreamController';
import { registerPlayerIPC } from './PlayerController';
import { registerSettingsIPC } from './SettingsController';
import { registerBackupIPC } from './BackupController';
import { registerWindowIPC } from './WindowController';

export function registerControllers() {
  const settingsProvider = new SettingsProvider();
  const accountsRepo = new AccountRepository();
  const favoritesRepo = new FavoriteRepository();
  const watchedRepo = new WatchedRepository();

  const xtreamProvider = new XtreamProvider(() => settingsProvider.get().stream.probeTimeoutMs);
  const playerProvider = new DesktopPlayerProvider(() => settingsProvider.get());

  registerAccountsIPC(accountsRepo, xtreamProvider);
  registerFavoritesIPC(favoritesRepo);
  registerWatchedIPC(watchedRepo);
  registerTmdbIPC(settingsProvider);
  registerXtreamIPC(accountsRepo, xtreamProvider);
  registerPlayerIPC(accountsRepo, xtreamProvider, playerProvider);
  registerSettingsIPC(settingsProvider);
  registerBackupIPC(accountsRepo, settingsProvider);
  registerWindowIPC();
}
