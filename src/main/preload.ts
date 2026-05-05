import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('xtremeApi', {
  accounts: {
    list: () => ipcRenderer.invoke('accounts:list'),
    create: (payload: unknown) => ipcRenderer.invoke('accounts:create', payload),
    update: (id: string, payload: unknown) => ipcRenderer.invoke('accounts:update', id, payload),
    remove: (id: string) => ipcRenderer.invoke('accounts:remove', id),
    info: (accountId: string) => ipcRenderer.invoke('accounts:info', accountId)
  },
  xtream: {
    categories: (accountId: string, contentType: string) => ipcRenderer.invoke('xtream:categories', accountId, contentType),
    streams: (accountId: string, contentType: string, categoryId?: string) => ipcRenderer.invoke('xtream:streams', accountId, contentType, categoryId),
    seriesEpisodes: (accountId: string, seriesId: number) => ipcRenderer.invoke('xtream:series-episodes', accountId, seriesId),
    epg: (accountId: string, streamId: number, limit?: number) => ipcRenderer.invoke('xtream:epg', accountId, streamId, limit),
    epgTable: (accountId: string, streamIds: string) => ipcRenderer.invoke('xtream:epg-table', accountId, streamIds),
    nowPlaying: (accountId: string, streamIds: number[]) => ipcRenderer.invoke('xtream:now-playing', accountId, streamIds)
  },
  favorites: {
    list: (accountId: string) => ipcRenderer.invoke('favorites:list', accountId),
    toggle: (payload: unknown) => ipcRenderer.invoke('favorites:toggle', payload)
  },
  history: {
    list: (accountId: string) => ipcRenderer.invoke('history:list', accountId),
    upsertProgress: (accountId: string, streamId: number, progress: number, duration: number) => ipcRenderer.invoke('history:upsertProgress', accountId, streamId, progress, duration)
  },
  tmdb: {
    fetchInfo: (name: string, type: 'movie' | 'series') => ipcRenderer.invoke('tmdb:fetchInfo', name, type)
  },
  player: {
    open: (payload: unknown) => ipcRenderer.invoke('player:open', payload),
    resolveUrl: (payload: unknown) => ipcRenderer.invoke('player:resolveUrl', payload),
    openCatchup: (payload: unknown) => ipcRenderer.invoke('player:openCatchup', payload),
    resolveCatchupUrl: (payload: unknown) => ipcRenderer.invoke('player:resolveCatchupUrl', payload),
    probe: (payload: unknown) => ipcRenderer.invoke('player:probe', payload)
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (payload: unknown) => ipcRenderer.invoke('settings:update', payload)
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url)
  }
});
