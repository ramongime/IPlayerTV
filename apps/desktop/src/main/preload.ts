import { contextBridge, ipcRenderer } from 'electron';
import type { XtremeApi } from '@iplayertv/core';

const xtremeApi = {
  search: {
    globalSearch: (accountId: string, query: string) => ipcRenderer.invoke('search:global', accountId, query)
  },
  accounts: {
    list: () => ipcRenderer.invoke('accounts:list'),
    getActive: () => ipcRenderer.invoke('accounts:getActive'),
    setActive: (id: string) => ipcRenderer.invoke('accounts:setActive', id),
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
    nowPlaying: (accountId: string, streamIds: number[]) => ipcRenderer.invoke('xtream:now-playing', accountId, streamIds),
    switchAccount: (accountId: string) => ipcRenderer.invoke('xtream:switchAccount', accountId)
  },
  favorites: {
    list: (accountId: string) => ipcRenderer.invoke('favorites:list', accountId),
    toggle: (payload: unknown) => ipcRenderer.invoke('favorites:toggle', payload),
    syncFavorites: (accountId: string, favorites: unknown[]) => ipcRenderer.invoke('favorites:sync', accountId, favorites),
    sync: (accountId: string, favorites: unknown[]) => ipcRenderer.invoke('favorites:sync', accountId, favorites)
  },

  watched: {
    list: (accountId: string) => ipcRenderer.invoke('watched:list', accountId),
    toggle: (accountId: string, contentType: string, streamId: number) => ipcRenderer.invoke('watched:toggle', accountId, contentType, streamId),
    clear: (accountId?: string) => ipcRenderer.invoke('watched:clear', accountId)
  },
  tmdb: {
    fetchInfo: (name: string, type: 'movie' | 'series') => ipcRenderer.invoke('tmdb:fetchInfo', name, type),
    getMetadata: (type: 'movie' | 'series', tmdbIdOrTitle: string) => ipcRenderer.invoke('tmdb:getMetadata', type, tmdbIdOrTitle)
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
  },
  backup: {
    export: () => ipcRenderer.invoke('backup:export'),
    import: () => ipcRenderer.invoke('backup:import')
  },
  window: {
    togglePip: (enable: boolean) => ipcRenderer.invoke('window:togglePip', enable),
    download: (url: string) => ipcRenderer.invoke('window:download', url)
  }
} satisfies XtremeApi;

contextBridge.exposeInMainWorld('xtremeApi', xtremeApi);