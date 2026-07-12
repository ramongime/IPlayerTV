import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Category, Favorite, StreamItem, ContentType, ShelfView } from '@iplayertv/core';

interface UseLibraryParams {
  accountId?: string;
  activeTab: ContentType;
  activeCategoryId: string;
  enableSearchAll: boolean;
  search?: string;
  shelfView?: ShelfView;
}

export const libraryKeys = {
  all: ['library'] as const,
  bases: () => [...libraryKeys.all, 'base'] as const,
  base: (accountId: string | undefined, tab: ContentType) =>
    [...libraryKeys.bases(), accountId, tab] as const,
  streams: (accountId: string | undefined, tab: ContentType, categoryId: string, searchAll: boolean) =>
    [...libraryKeys.all, 'streams', accountId, tab, categoryId, searchAll] as const,
  nowPlaying: (accountId: string | undefined, tab: ContentType, categoryId: string, searchAll: boolean, search?: string, shelfView?: ShelfView) =>
    [...libraryKeys.all, 'now-playing', accountId, tab, categoryId, searchAll, search, shelfView] as const,
};

export function useLibrary({ accountId, activeTab, activeCategoryId, enableSearchAll, search = '', shelfView = 'catalog' }: UseLibraryParams) {
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

  const filteredStreams = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const base = shelfView === 'catalog'
      ? streams
      : streams.filter((stream) => favorites.some((fav) => fav.contentType === activeTab && fav.streamId === (stream.stream_id ?? stream.series_id ?? 0)));

    if (!normalized) return base;
    return base.filter((item) => item.name.toLowerCase().includes(normalized));
  }, [streams, search, favorites, shelfView, activeTab]);

  const nowPlayingQuery = useQuery({
    queryKey: libraryKeys.nowPlaying(accountId, activeTab, categoryToLoad, enableSearchAll, search, shelfView),
    queryFn: async () => {
      if (!accountId || activeTab !== 'live' || filteredStreams.length === 0) return {};
      
      const streamsToFetch = filteredStreams
        .filter(s => s.stream_id)
        .slice(0, 150);
        
      if (streamsToFetch.length === 0) return {};

      const BATCH_SIZE = 50;
      let epgData: Record<string, any[]> = {};
      
      for (let i = 0; i < streamsToFetch.length; i += BATCH_SIZE) {
        const batch = streamsToFetch.slice(i, i + BATCH_SIZE);
        const streamIdsStr = batch.map(s => s.stream_id).join(',');
        try {
          const batchData = await window.xtremeApi.xtream.epgTable(accountId, streamIdsStr);
          epgData = { ...epgData, ...batchData };
        } catch (e) {
          console.error('Failed to fetch EPG batch', e);
        }
      }

      const nowPlayingMap: Record<number, string> = {};
      const currentTime = Math.floor(Date.now() / 1000);

      for (const stream of streamsToFetch) {
        if (!stream.stream_id) continue;
        const programmes = epgData[String(stream.stream_id)] || (stream.epg_channel_id ? epgData[stream.epg_channel_id] : null) || [];
        
        const now = programmes.find(prog => {
          if (prog.start_timestamp && prog.stop_timestamp) {
            return prog.start_timestamp <= currentTime && prog.stop_timestamp > currentTime;
          }
          if (!prog.start_raw || !prog.end_raw) return false;
          const pStart = new Date(prog.start_raw.replace(' ', 'T')).getTime() / 1000;
          const pEnd = new Date(prog.end_raw.replace(' ', 'T')).getTime() / 1000;
          return pStart <= currentTime && pEnd > currentTime;
        });

        if (now?.title) {
          nowPlayingMap[stream.stream_id] = now.title;
        } else if (programmes.length > 0 && programmes[0].title) {
          nowPlayingMap[stream.stream_id] = programmes[0].title;
        }
      }

      return nowPlayingMap;
    },
    enabled: !!accountId && activeTab === 'live' && filteredStreams.length > 0,
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
    streams: filteredStreams,
    nowPlaying,
    categoryToLoad,
    isLoading,
    error: error ? String(error) : undefined,
    invalidateLibrary
  };
}
