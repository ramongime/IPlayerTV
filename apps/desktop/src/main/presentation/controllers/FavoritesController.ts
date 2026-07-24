import { ipcMain } from 'electron';
import { FavoriteRepository } from '../../infrastructure/database/FavoriteRepository';
import { z } from 'zod';

export function registerFavoritesIPC(favoritesRepo: FavoriteRepository) {
  const toggleSchema = z.object({
    accountId: z.string(),
    contentType: z.enum(['live', 'movie', 'series']),
    streamId: z.number(),
    name: z.string(),
    icon: z.string().optional()
  });

  const syncSchema = z.array(z.object({
    accountId: z.string(),
    contentType: z.enum(['live', 'movie', 'series']),
    streamId: z.number(),
    name: z.string(),
    icon: z.string().nullish().transform(v => v ?? undefined),
    createdAt: z.string()
  }));

  ipcMain.handle('favorites:list', (_, accountId) => favoritesRepo.list(z.string().parse(accountId)));
  ipcMain.handle('favorites:toggle', (_, payload) => favoritesRepo.toggle(toggleSchema.parse(payload)));
  ipcMain.handle('favorites:sync', (_, accountId, items) => favoritesRepo.syncFavorites(z.string().parse(accountId), syncSchema.parse(items) as any));
  ipcMain.handle('favorites:syncFavorites', (_, accountId, items) => favoritesRepo.syncFavorites(z.string().parse(accountId), syncSchema.parse(items) as any));
}
