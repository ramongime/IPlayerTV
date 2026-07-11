// Domain types and validation schemas
export * from './domain';
export * from './domain/schemas';

// Utilities
export * from './utils/parseM3uUrl';
export { decodeBase64 } from './utils/base64';

// Providers (platform-agnostic; inject platform specifics via constructor)
export { XtreamProvider } from './providers/XtreamProvider';
export { TmdbClient, type FetchLike } from './providers/TmdbClient';

// Contracts implemented per platform
export type { IAccountRepository } from './repositories/IAccountRepository';
export type { IFavoriteRepository } from './repositories/IFavoriteRepository';
export type { IWatchedRepository } from './repositories/IWatchedRepository';
export type { IXtreamProvider } from './services/IXtreamProvider';
export type { IPlayerProvider } from './services/IPlayerProvider';

// API surface & typed payloads
export type {
  XtremeApi,
  PlayerOpenPayload,
  PlayerResolvePayload,
  PlayerCatchupPayload,
  PlayerProbePayload,
  FavoriteTogglePayload,
  AccountInfoResponse,
} from './api/XtremeApi';

// Shared i18n resources
export { resources } from './i18n/resources';
