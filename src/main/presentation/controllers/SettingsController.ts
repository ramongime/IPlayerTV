import { ipcMain } from 'electron';
import { SettingsProvider } from '../../infrastructure/settings/SettingsProvider';

export function registerSettingsIPC(settingsProvider: SettingsProvider) {
  ipcMain.handle('settings:get', () => settingsProvider.get());
  ipcMain.handle('settings:update', (_, payload) => settingsProvider.update(payload));
}
