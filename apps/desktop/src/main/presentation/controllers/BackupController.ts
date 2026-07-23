import { ipcMain, dialog, safeStorage } from 'electron';
import { promises as fs } from 'fs';
import type { IAccountRepository } from '@iplayertv/core';
import { SettingsProvider } from '../../infrastructure/settings/SettingsProvider';

// Exports/imports accounts + settings as a plain JSON file the user picks via a
// native dialog. Import skips accounts that already exist (same username+server).
export function registerBackupIPC(accountsRepo: IAccountRepository, settingsProvider: SettingsProvider) {
  ipcMain.handle('backup:export', async () => {
    const result = await dialog.showSaveDialog({
      title: 'Exportar Configurações',
      defaultPath: 'iplayertv-backup.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePath) return { ok: false };

    const data = {
      accounts: await accountsRepo.list(),
      settings: settingsProvider.get()
    };
    
    const jsonString = JSON.stringify(data, null, 2);
    let outBuffer: string | Buffer = jsonString;
    
    if (safeStorage.isEncryptionAvailable()) {
      outBuffer = safeStorage.encryptString(jsonString);
    }

    await fs.writeFile(result.filePath, outBuffer);
    return { ok: true, path: result.filePath };
  });

  ipcMain.handle('backup:import', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Importar Configurações',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    });
    if (result.canceled || result.filePaths.length === 0) return { ok: false };

    const rawBuffer = await fs.readFile(result.filePaths[0]);
    let raw = rawBuffer.toString('utf-8');
    
    // Try to decrypt if it doesn't look like plain JSON
    if (!raw.trim().startsWith('{') && safeStorage.isEncryptionAvailable()) {
      try {
        raw = safeStorage.decryptString(rawBuffer);
      } catch (e) {
        console.error('Failed to decrypt backup', e);
        // Fallback to plain string if decryption fails (might be a corrupted plain JSON)
      }
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse backup JSON', e);
      return { ok: false };
    }

    if (data.settings) {
      settingsProvider.update(data.settings);
    }

    if (Array.isArray(data.accounts)) {
      const existing = await accountsRepo.list();
      for (const acc of data.accounts) {
        const isDuplicate = existing.some((e) => e.username === acc.username && e.server === acc.server);
        if (!isDuplicate) {
          await accountsRepo.create({
            name: acc.name,
            server: acc.server,
            username: acc.username,
            password: acc.password,
            output: acc.output || 'm3u8',
            player: acc.player || 'internal'
          });
        }
      }
    }

    return { ok: true };
  });
}
