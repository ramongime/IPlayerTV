import { ipcMain, net } from 'electron';
import { TmdbClient } from '@iplayertv/core';
import { SettingsProvider } from '../../infrastructure/settings/SettingsProvider';

export function registerTmdbIPC(settingsProvider: SettingsProvider) {
  // net.fetch bypasses CORS restrictions for third-party image/API hosts.
  const tmdbClient = new TmdbClient((url) => net.fetch(url));

  const handleMetadata = async (name: string, type: 'movie' | 'series') => {
    const config: any = settingsProvider.get();
    const apiKey = config?.tmdbApiKey || process.env.TMDB_API_KEY || '';
    if (!apiKey) {
      if (process.env.TMDB_MOCK === 'true') {
        return tmdbClient.getMockInfo(name);
      }
      return undefined;
    }
    return tmdbClient.fetchInfo(name, type, apiKey);
  };

  ipcMain.handle('tmdb:fetchInfo', async (_, name: string, type: 'movie' | 'series') => handleMetadata(name, type));
  ipcMain.handle('tmdb:getMetadata', async (_, arg1: string, arg2: string) => {
    if (arg1 === 'movie' || arg1 === 'series') {
      return handleMetadata(arg2, arg1);
    }
    return handleMetadata(arg1, (arg2 as 'movie' | 'series') || 'movie');
  });
}
