/// <reference types="vite/client" />

declare global {
  interface Window {
    xtremeApi: {
      accounts: {
        list: () => Promise<any[]>;
        create: (payload: any) => Promise<any>;
        remove: (id: string) => Promise<{ ok: boolean }>;
      };
      xtream: {
        categories: (accountId: string, contentType: 'live' | 'movie' | 'series') => Promise<any[]>;
        streams: (accountId: string, contentType: 'live' | 'movie' | 'series', categoryId?: string) => Promise<any[]>;
        seriesEpisodes: (accountId: string, seriesId: number) => Promise<any[]>;
        epg: (accountId: string, streamId: number, limit?: number) => Promise<any[]>;
      };
      favorites: {
        list: (accountId: string) => Promise<any[]>;
        toggle: (payload: any) => Promise<{ favorite: boolean }>;
      };
      history: {
        list: (accountId: string) => Promise<any[]>;
      };
      player: {
        open: (payload: any) => Promise<{ method: string; url: string }>;
        probe: (payload: any) => Promise<{ url: string }>;
      };
      settings: {
        get: () => Promise<any>;
        update: (payload: any) => Promise<any>;
      };
    };
  }
}

export {};
