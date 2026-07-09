import { ipcMain } from 'electron';
import { SettingsProvider } from '../../infrastructure/settings/SettingsProvider';

export function registerTmdbIPC(settingsProvider: SettingsProvider) {
  const TmdbProviderClass = require('../../infrastructure/providers/TmdbProvider').TmdbProvider;
  const tmdbProvider = new TmdbProviderClass();

  ipcMain.handle('tmdb:fetchInfo', async (_, name: string, type: 'movie' | 'series') => {
    const config: any = settingsProvider.get();
    if (!config.tmdbApiKey) return undefined;
    return tmdbProvider.fetchInfo(name, type, config.tmdbApiKey);
  });
}
