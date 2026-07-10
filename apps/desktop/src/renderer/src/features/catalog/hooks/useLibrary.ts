import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Category, Favorite, StreamItem, ContentType } from '@iplayertv/core';

interface UseLibraryParams {
  accountId?: string;
  activeTab: ContentType;
  activeCategoryId: string;
  enableSearchAll: boolean;
}

export const libraryKeys = {
  all: ['library'] as const,
  bases: () => [...libraryKeys.all, 'base'] as const,
  base: (accountId: string | undefined, tab: ContentType) =>
    [...libraryKeys.bases(), accountId, tab] as const,
  streams: (accountId: string | undefined, tab: ContentType, categoryId: string, searchAll: boolean) =>
    [...libraryKeys.all, 'streams', accountId, tab, categoryId, searchAll] as const,
  nowPlaying: (accountId: string | undefined, tab: ContentType, categoryId: string, searchAll: boolean) =>
    [...libraryKeys.all, 'now-playing', accountId, tab, categoryId, searchAll] as const,
};

export function useLibrary({ accountId, activeTab, activeCategoryId, enableSearchAll }: UseLibraryParams) {
  const queryClient = useQueryClient();

  const baseDataQuery = useQuery({
    queryKey: libraryKeys.base(accountId, activeTab),
    queryFn: async () => {
      if (!accountId) return { categories: [], favorites: [], watched: [] };
      const [categories, favorites, watched] = await Promise.all([
        window.xtremeApi.xtream.categories(accountId, activeTab),
        window.xtremeApi.favorites.list(accountId),
        window.xtremeApi.watched.list(accountId)
      ]);
      return { categories, favorites, watched };
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000,
  });

  const categories = baseDataQuery.data?.categories ?? [];
  const favorites = baseDataQuery.data?.favorites ?? [];

  const watched = baseDataQuery.data?.watched ?? [];

  let categoryToLoad = activeCategoryId;
  if (categoryToLoad === 'all' && !enableSearchAll && categories.length > 0) {
    categoryToLoad = categories[0].category_id;
  }

  const streamsQuery = useQuery({
    queryKey: libraryKeys.streams(accountId, activeTab, categoryToLoad, enableSearchAll),
    queryFn: async () => {
      if (!accountId) return [];
      if (categoryToLoad === 'all' && !enableSearchAll) return [];
      
      return window.xtremeApi.xtream.streams(
        accountId, 
        activeTab, 
        categoryToLoad === 'all' ? undefined : categoryToLoad
      );
    },
    enabled: !!accountId && (categoryToLoad !== 'all' || enableSearchAll),
    staleTime: 5 * 60 * 1000,
  });

  const streams = streamsQuery.data ?? [];

  const nowPlayingQuery = useQuery({
    queryKey: libraryKeys.nowPlaying(accountId, activeTab, categoryToLoad, enableSearchAll),
    queryFn: async () => {
      if (!accountId || activeTab !== 'live' || streams.length === 0) return {};
      
      const streamIds = streams
        .filter(s => s.stream_id)
        .slice(0, 50)
        .map(s => s.stream_id as number);
        
      if (streamIds.length === 0) return {};
      return window.xtremeApi.xtream.nowPlaying(accountId, streamIds);
    },
    enabled: !!accountId && activeTab === 'live' && streams.length > 0,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000, // Refresh every minute
  });

  const nowPlaying = nowPlayingQuery.data ?? {};

  const isLoading = baseDataQuery.isLoading || streamsQuery.isLoading;
  const error = baseDataQuery.error || streamsQuery.error;

  const invalidateLibrary = () => {
    queryClient.invalidateQueries({ queryKey: libraryKeys.bases() });
  };

  return {
    categories,
    favorites,

    watched,
    streams,
    nowPlaying,
    categoryToLoad,
    isLoading,
    error: error ? String(error) : undefined,
    invalidateLibrary
  };
}
