import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Category, Favorite, HistoryItem, StreamItem, ContentType } from '@shared/domain';

interface UseLibraryParams {
  accountId?: string;
  activeTab: ContentType;
  activeCategoryId: string;
  enableSearchAll: boolean;
}

export function useLibrary({ accountId, activeTab, activeCategoryId, enableSearchAll }: UseLibraryParams) {
  const queryClient = useQueryClient();

  const baseDataQuery = useQuery({
    queryKey: ['library-base', accountId, activeTab],
    queryFn: async () => {
      if (!accountId) return { categories: [], favorites: [], history: [] };
      const [categories, favorites, history] = await Promise.all([
        window.xtremeApi.xtream.categories(accountId, activeTab),
        window.xtremeApi.favorites.list(accountId),
        window.xtremeApi.history.list(accountId)
      ]);
      return { categories, favorites, history };
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000,
  });

  const categories = baseDataQuery.data?.categories ?? [];
  const favorites = baseDataQuery.data?.favorites ?? [];
  const history = baseDataQuery.data?.history ?? [];

  let categoryToLoad = activeCategoryId;
  if (categoryToLoad === 'all' && !enableSearchAll && categories.length > 0) {
    categoryToLoad = categories[0].category_id;
  }

  const streamsQuery = useQuery({
    queryKey: ['library-streams', accountId, activeTab, categoryToLoad, enableSearchAll],
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
    queryKey: ['library-now-playing', accountId, activeTab, categoryToLoad, enableSearchAll],
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
    queryClient.invalidateQueries({ queryKey: ['library-base'] });
  };

  return {
    categories,
    favorites,
    history,
    streams,
    nowPlaying,
    categoryToLoad,
    isLoading,
    error: error ? String(error) : undefined,
    invalidateLibrary
  };
}
