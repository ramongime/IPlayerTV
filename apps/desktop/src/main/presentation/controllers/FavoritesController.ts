import { ipcMain } from 'electron';
import { FavoriteRepository } from '../../infrastructure/database/FavoriteRepository';

export function registerFavoritesIPC(favoritesRepo: FavoriteRepository) {
  ipcMain.handle('favorites:list', (_, accountId) => favoritesRepo.list(accountId));
  ipcMain.handle('favorites:toggle', (_, payload) => favoritesRepo.toggle(payload));
  ipcMain.handle('favorites:sync', (_, accountId, items) => favoritesRepo.syncFavorites(accountId, items));
  ipcMain.handle('favorites:syncFavorites', (_, accountId, items) => favoritesRepo.syncFavorites(accountId, items));
}
