import { ipcMain, net } from 'electron';
import { TmdbClient } from '@iplayertv/core';
import { SettingsProvider } from '../../infrastructure/settings/SettingsProvider';

export function registerTmdbIPC(settingsProvider: SettingsProvider) {
  // net.fetch bypasses CORS restrictions for third-party image/API hosts.
  const tmdbClient = new TmdbClient((url) => net.fetch(url));

  ipcMain.handle('tmdb:fetchInfo', async (_, name: string, type: 'movie' | 'series') => {
    const config: any = settingsProvider.get();
    if (!config.tmdbApiKey) return undefined;
    return tmdbClient.fetchInfo(name, type, config.tmdbApiKey);
  });
}
