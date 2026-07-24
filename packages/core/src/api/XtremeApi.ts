import type { Account, AppConfig, Category, ContentType, EpgProgramme, Episode, Favorite, NowPlayingMap, StreamItem, TmdbInfo } from '../domain';
import type { AccountInput, AccountUpdateInput } from '../domain/schemas';

// Payload types for the player namespace
export interface PlayerOpenPayload {
  accountId: string;
  contentType: ContentType;
  streamId: number;
  name?: string;
  extension?: string;
}

export interface PlayerResolvePayload {
  accountId: string;
  contentType: ContentType;
  streamId: number;
  extension?: string;
}

export interface PlayerCatchupPayload {
  accountId: string;
  streamId: number;
  name?: string;
  startRaw: string;
  durationMinutes: number;
  extension?: string;
}

export interface PlayerProbePayload {
  accountId: string;
  contentType: ContentType;
  streamId: number;
  extension?: string;
}

export interface FavoriteTogglePayload {
  accountId: string;
  contentType: ContentType;
  streamId: number;
  name: string;
  icon?: string;
}

export interface AccountInfoResponse {
  status: string;
  expDate: string;
  activeConnections: number;
  maxConnections: string;
  allowedFormats: string[];
  serverUrl: string;
  serverTimezone: string;
}

export interface GlobalSearchResult {
  live: StreamItem[];
  movie: StreamItem[];
  series: StreamItem[];
  total: number;
}

// Shape of the client-facing API surface. On desktop it is implemented by the
// Electron preload bridge (window.xtremeApi → ipcRenderer.invoke); on mobile it
// is implemented in-process by wiring the core providers/repositories directly.
export interface XtremeApi {
  search: {
    globalSearch: (accountId: string, query: string) => Promise<GlobalSearchResult>;
  };
  accounts: {
    list: () => Promise<Account[]>;
    getActive: () => Promise<Account | null>;
    setActive: (id: string) => Promise<Account>;
    create: (payload: AccountInput) => Promise<Account>;
    update: (id: string, payload: AccountUpdateInput) => Promise<Account>;
    remove: (id: string) => Promise<void>;
    info: (accountId: string) => Promise<AccountInfoResponse>;
  };
  xtream: {
    categories: (accountId: string, contentType: ContentType) => Promise<Category[]>;
    streams: (accountId: string, contentType: ContentType, categoryId?: string) => Promise<StreamItem[]>;
    seriesEpisodes: (accountId: string, seriesId: number) => Promise<Episode[]>;
    epg: (accountId: string, streamId: number, limit?: number) => Promise<EpgProgramme[]>;
    epgTable: (accountId: string, streamIds: string) => Promise<Record<string, EpgProgramme[]>>;
    nowPlaying: (accountId: string, streamIds: number[]) => Promise<NowPlayingMap>;
    switchAccount?: (accountId: string) => Promise<Account>;
  };
  favorites: {
    list: (accountId: string) => Promise<Favorite[]>;
    toggle: (payload: FavoriteTogglePayload) => Promise<{ favorite: boolean }>;
    syncFavorites?: (accountId: string, favorites: FavoriteTogglePayload[]) => Promise<Favorite[]>;
    sync?: (accountId: string, favorites: FavoriteTogglePayload[]) => Promise<Favorite[]>;
  };
  watched: {
    list: (accountId: string) => Promise<Array<{ contentType: ContentType; streamId: number }>>;
    toggle: (accountId: string, contentType: ContentType, streamId: number) => Promise<boolean>;
    clear: (accountId?: string) => Promise<void>;
  };
  tmdb: {
    fetchInfo: (name: string, type: 'movie' | 'series') => Promise<TmdbInfo | undefined>;
    getMetadata?: (type: 'movie' | 'series', tmdbIdOrTitle: string) => Promise<TmdbInfo | undefined>;
  };
  player: {
    open: (payload: PlayerOpenPayload) => Promise<{ method: string; url: string }>;
    resolveUrl: (payload: PlayerResolvePayload) => Promise<{ url: string }>;
    openCatchup: (payload: PlayerCatchupPayload) => Promise<{ method: string; url: string }>;
    resolveCatchupUrl: (payload: PlayerCatchupPayload) => Promise<{ url: string }>;
    probe: (payload: PlayerProbePayload) => Promise<{ url: string }>;
  };
  settings: {
    get: () => Promise<AppConfig>;
    update: (payload: Partial<AppConfig>) => Promise<AppConfig>;
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
}
