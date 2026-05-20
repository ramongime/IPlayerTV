import { ipcMain } from 'electron';
import { HistoryRepository } from '../../infrastructure/database/HistoryRepository';

export function registerHistoryIPC(historyRepo: HistoryRepository) {
  ipcMain.handle('history:list', (_, accountId) => historyRepo.list(accountId));
  ipcMain.handle('history:add', (_, payload) => historyRepo.add(payload));
  ipcMain.handle('history:upsertProgress', (_, accountId, streamId, progress, duration) => historyRepo.upsertProgress(accountId, streamId, progress, duration));
}
