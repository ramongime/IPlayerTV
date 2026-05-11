/// <reference types="vite/client" />

declare global {
  interface Window {
    xtremeApi: {
      accounts: {
        list: () => Promise<any[]>;
        create: (payload: any) => Promise<any>;
        update: (id: string, payload: any) => Promise<any>;
        remove: (id: string) => Promise<{ ok: boolean }>;
        info: (accountId: string) => Promise<{
          status: string;
          expDate: string;
          activeConnections: number;
          maxConnections: string;
          allowedFormats: string[];
          serverUrl: string;
          serverTimezone: string;
        }>;
      };
      xtream: {
        categories: (accountId: string, contentType: 'live' | 'movie' | 'series') => Promise<any[]>;
        streams: (accountId: string, contentType: 'live' | 'movie' | 'series', categoryId?: string) => Promise<any[]>;
        seriesEpisodes: (accountId: string, seriesId: number) => Promise<any[]>;
        epg: (accountId: string, streamId: number, limit?: number) => Promise<any[]>;
        epgTable: (accountId: string, streamIds: string) => Promise<Record<string, any[]>>;
        nowPlaying: (accountId: string, streamIds: number[]) => Promise<Record<number, string>>;
      };
      favorites: {
        list: (accountId: string) => Promise<any[]>;
        toggle: (payload: any) => Promise<{ favorite: boolean }>;
      };
      history: {
        list: (accountId: string) => Promise<any[]>;
        upsertProgress: (accountId: string, streamId: number, progress: number, duration: number) => Promise<void>;
      };
      tmdb: {
        fetchInfo: (name: string, type: 'movie' | 'series') => Promise<import('@shared/domain').TmdbInfo | undefined>;
      };
      player: {
        open: (payload: any) => Promise<{ method: string; url: string }>;
        resolveUrl: (payload: any) => Promise<{ url: string }>;
        openCatchup: (payload: any) => Promise<{ method: string; url: string }>;
        resolveCatchupUrl: (payload: any) => Promise<{ url: string }>;
        probe: (payload: any) => Promise<{ url: string }>;
      };
      settings: {
        get: () => Promise<any>;
        update: (payload: any) => Promise<any>;
      };
      shell: {
        openExternal: (url: string) => Promise<void>;
      };
      backup: {
        export: () => Promise<{ ok: boolean; path?: string }>;
        import: () => Promise<{ ok: boolean }>;
      };
      window: {
        togglePip: (enable: boolean) => Promise<void>;
        download: (url: string) => Promise<void>;
      };
    };
  }
}

export { };