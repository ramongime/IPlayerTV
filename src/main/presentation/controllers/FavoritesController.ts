import { ipcMain } from 'electron';
import { FavoriteRepository } from '../../infrastructure/database/FavoriteRepository';

export function registerFavoritesIPC(favoritesRepo: FavoriteRepository) {
  ipcMain.handle('favorites:list', (_, accountId) => favoritesRepo.list(accountId));
  ipcMain.handle('favorites:toggle', (_, payload) => favoritesRepo.toggle(payload));
}
