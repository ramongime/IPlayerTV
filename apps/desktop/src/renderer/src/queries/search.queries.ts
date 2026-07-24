import { queryOptions } from '@tanstack/react-query';
import type { GlobalSearchResult } from '@iplayertv/core';

export const searchQueries = {
  all: ['search'] as const,
  global: (accountId: string | undefined, query: string) =>
    queryOptions<GlobalSearchResult>({
      queryKey: [...searchQueries.all, accountId, query] as const,
      queryFn: async () => {
        if (!accountId || !query.trim() || query.trim().length < 2) {
          return { live: [], movie: [], series: [], total: 0 };
        }
        return window.xtremeApi.search.globalSearch(accountId, query.trim());
      },
      enabled: !!accountId && query.trim().length >= 2,
      staleTime: 5 * 60 * 1000,
      placeholderData: (prev) => prev,
    }),
};
