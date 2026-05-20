import { ipcMain } from 'electron';
import { WatchedRepository } from '../../infrastructure/database/WatchedRepository';

export function registerWatchedIPC(watchedRepo: WatchedRepository) {
  ipcMain.handle('watched:list', (_, accountId) => watchedRepo.list(accountId));
  ipcMain.handle('watched:toggle', (_, accountId, contentType, streamId) => watchedRepo.toggle(accountId, contentType, streamId));
}
