import type { ContentType } from '@iplayertv/core';

// Centralized, hierarchical query-key factories (see tanstack-react-query-patterns).
// Keeping keys here instead of inline in components avoids drift and typos and makes
// invalidation predictable.

export const tmdbKeys = {
  all: ['tmdb'] as const,
  info: (contentType: ContentType, name?: string) =>
    [...tmdbKeys.all, contentType, name] as const,
};

export const epgKeys = {
  all: ['epg'] as const,
  short: (accountId: string | null, streamId?: number) =>
    [...epgKeys.all, accountId, streamId] as const,
};
