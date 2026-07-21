import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ContentType, NowPlayingMap } from '@iplayertv/core';
import { favoritesRepo, watchedRepo } from '@/lib/repositories';
import { resolveAccount, xtream } from '@/lib/services';
import { useAppStore } from '@/lib/store';

interface UseLibraryParams {
  accountId: string | null;
  contentType: ContentType;
  categoryId?: string;
  tmdbApiKey?: string;
  isSearching?: boolean;
}

export const libraryKeys = {
  all: ['library'] as const,
  base: (accountId: string | null, contentType: ContentType) =>
    [...libraryKeys.all, 'base', accountId, contentType] as const,
  streams: (accountId: string | null, contentType: ContentType, categoryId?: string) =>
    [...libraryKeys.all, 'streams', accountId, contentType, categoryId] as const,
  nowPlaying: (accountId: string | null, streamIds: number[]) =>
    [...libraryKeys.all, 'now-playing', accountId, streamIds] as const,
};

export function useLibrary({ accountId, contentType, categoryId, tmdbApiKey, isSearching }: UseLibraryParams) {
  const queryClient = useQueryClient();
  const enableSearchAll = useAppStore((s) => s.enableSearchAll);

  // Base data: categories + favorites + watched
  const baseQuery = useQuery({
    queryKey: libraryKeys.base(accountId, contentType),
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const account = await resolveAccount(accountId!);
      const [categories, favorites, watched] = await Promise.all([
        xtream.categories(account, contentType),
        favoritesRepo.list(accountId!),
        watchedRepo.list(accountId!),
      ]);
      return { categories, favorites, watched };
    },
  });

  const rawCategories = baseQuery.data?.categories ?? [];
  const hiddenCategoriesStore = useAppStore((s) => s.hiddenCategories);
  const hiddenKeys = hiddenCategoriesStore[`${accountId}:${contentType}`] || [];
  const categories = rawCategories.filter(c => !hiddenKeys.includes(c.category_id));

  const favorites = baseQuery.data?.favorites ?? [];
  const watched = baseQuery.data?.watched ?? [];

  // Resolve active category — fallback to first if not set
  let activeCategoryId: string | undefined = categoryId ?? categories[0]?.category_id;
  
  // If global search is enabled and user is searching, fetch all streams (undefined category)
  if (enableSearchAll && isSearching) {
    activeCategoryId = undefined;
  }

  // Streams for the selected category (or all if activeCategoryId is undefined)
  const streamsQuery = useQuery({
    queryKey: libraryKeys.streams(accountId, contentType, activeCategoryId),
    enabled: !!accountId && (activeCategoryId !== undefined || (enableSearchAll && isSearching)),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const account = await resolveAccount(accountId!);
      return xtream.streams(account, contentType, activeCategoryId);
    },
  });

  const streams = streamsQuery.data ?? [];

  // Now Playing EPG for live channels (first 150 to match desktop)
  const liveStreamIds = contentType === 'live'
    ? streams.slice(0, 150).map((s) => s.stream_id!).filter(Boolean)
    : [];

  const nowPlayingQuery = useQuery({
    queryKey: libraryKeys.nowPlaying(accountId, liveStreamIds),
    enabled: contentType === 'live' && !!accountId && liveStreamIds.length > 0,
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const account = await resolveAccount(accountId!);
      return xtream.nowPlaying(account, liveStreamIds);
    },
  });

  const nowPlaying: NowPlayingMap = nowPlayingQuery.data ?? {};

  const isLoading = baseQuery.isLoading || streamsQuery.isLoading;
  const error = baseQuery.error || streamsQuery.error;

  const invalidateLibrary = () => {
    queryClient.invalidateQueries({ queryKey: libraryKeys.all });
  };

  const refetch = async () => {
    await Promise.all([
      baseQuery.refetch(),
      streamsQuery.refetch(),
    ]);
  };

  return {
    categories,
    favorites,
    watched,
    streams,
    nowPlaying,
    activeCategoryId,
    isLoading,
    isRefetching: baseQuery.isRefetching || streamsQuery.isRefetching,
    error: error ? String(error) : undefined,
    invalidateLibrary,
    refetch,
  };
}
