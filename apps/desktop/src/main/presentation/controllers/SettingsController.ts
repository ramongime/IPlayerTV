import { ipcMain } from 'electron';
import { SettingsProvider } from '../../infrastructure/settings/SettingsProvider';
import { z } from 'zod';

export function registerSettingsIPC(settingsProvider: SettingsProvider) {
  ipcMain.handle('settings:get', () => settingsProvider.get());
  ipcMain.handle('settings:update', (_, payload) => {
    const schema = z.object({
      locale: z.string().optional(),
      theme: z.string().optional(),
      parentalPin: z.string().optional(),
      externalPlayers: z.object({
        vlcPath: z.string().optional(),
        mpvPath: z.string().optional()
      }).optional()
    });
    return settingsProvider.update(schema.parse(payload) as any);
  });
}
