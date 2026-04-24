import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('xtremeApi', {
  accounts: {
    list: () => ipcRenderer.invoke('accounts:list'),
    create: (payload: unknown) => ipcRenderer.invoke('accounts:create', payload),
    remove: (id: string) => ipcRenderer.invoke('accounts:remove', id)
  },
  xtream: {
    categories: (accountId: string, contentType: string) => ipcRenderer.invoke('xtream:categories', accountId, contentType),
    streams: (accountId: string, contentType: string, categoryId?: string) => ipcRenderer.invoke('xtream:streams', accountId, contentType, categoryId),
    seriesEpisodes: (accountId: string, seriesId: number) => ipcRenderer.invoke('xtream:series-episodes', accountId, seriesId),
    epg: (accountId: string, streamId: number, limit?: number) => ipcRenderer.invoke('xtream:epg', accountId, streamId, limit)
  },
  favorites: {
    list: (accountId: string) => ipcRenderer.invoke('favorites:list', accountId),
    toggle: (payload: unknown) => ipcRenderer.invoke('favorites:toggle', payload)
  },
  history: {
    list: (accountId: string) => ipcRenderer.invoke('history:list', accountId)
  },
  player: {
    open: (payload: unknown) => ipcRenderer.invoke('player:open', payload),
    probe: (payload: unknown) => ipcRenderer.invoke('player:probe', payload)
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (payload: unknown) => ipcRenderer.invoke('settings:update', payload)
  }
});
