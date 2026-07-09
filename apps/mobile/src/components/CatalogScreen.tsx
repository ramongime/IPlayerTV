import type { Category, ContentType, StreamItem } from '@iplayertv/core';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { favoritesRepo, watchedRepo } from '@/lib/repositories';
import { resolveAccount, xtream } from '@/lib/services';
import { useAppStore } from '@/lib/store';
import { colors } from '@/lib/theme';

export function CatalogScreen({ contentType }: { contentType: ContentType }) {
  const accountId = useAppStore((s) => s.activeAccountId);
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const categoriesQuery = useQuery({
    queryKey: ['categories', accountId, contentType],
    enabled: !!accountId,
    queryFn: async () => xtream.categories(await resolveAccount(accountId!), contentType),
  });

  const categories = categoriesQuery.data ?? [];
  const activeCategoryId = categoryId ?? categories[0]?.category_id;

  const streamsQuery = useQuery({
    queryKey: ['streams', accountId, contentType, activeCategoryId],
    enabled: !!accountId && !!activeCategoryId,
    queryFn: async () => xtream.streams(await resolveAccount(accountId!), contentType, activeCategoryId),
  });

  const favoritesQuery = useQuery({
    queryKey: ['favorites', accountId],
    enabled: !!accountId,
    queryFn: () => favoritesRepo.list(accountId!),
  });

  const streams = streamsQuery.data ?? [];
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return streams;
    return streams.filter((s) => s.name.toLowerCase().includes(term));
  }, [streams, search]);

  // EPG "now playing" for the visible live channels (same pattern as desktop useLibrary)
  const nowPlayingIds = useMemo(
    () => (contentType === 'live' ? filtered.slice(0, 50).map((s) => s.stream_id!).filter(Boolean) : []),
    [contentType, filtered]
  );
  const nowPlayingQuery = useQuery({
    queryKey: ['now-playing', accountId, nowPlayingIds],
    enabled: contentType === 'live' && !!accountId && nowPlayingIds.length > 0,
    refetchInterval: 60_000,
    queryFn: async () => xtream.nowPlaying(await resolveAccount(accountId!), nowPlayingIds),
  });

  if (hasHydrated && !accountId) {
    return <Redirect href="/login" />;
  }

  const favoriteIds = new Set(
    (favoritesQuery.data ?? [])
      .filter((f) => f.contentType === contentType)
      .map((f) => f.streamId)
  );

  const idOf = (item: StreamItem) => (contentType === 'series' ? item.series_id : item.stream_id) ?? 0;

  const openItem = async (item: StreamItem) => {
    if (contentType === 'series') {
      router.push({
        pathname: '/series/[id]',
        params: { id: String(item.series_id), title: item.name, cover: item.cover ?? item.stream_icon ?? '' },
      });
      return;
    }
    if (contentType === 'movie') {
      watchedRepo.markWatched(accountId!, contentType, item.stream_id!).then(() =>
        queryClient.invalidateQueries({ queryKey: ['watched', accountId] })
      );
    }
    router.push({
      pathname: '/player',
      params: {
        contentType,
        streamId: String(item.stream_id),
        extension: item.container_extension ?? '',
        title: item.name,
      },
    });
  };

  const toggleFavorite = async (item: StreamItem) => {
    await favoritesRepo.toggle({
      accountId: accountId!,
      contentType,
      streamId: idOf(item),
      name: item.name,
      icon: item.stream_icon ?? item.cover,
    });
    queryClient.invalidateQueries({ queryKey: ['favorites', accountId] });
  };

  const renderCategory = ({ item }: { item: Category }) => (
    <Pressable
      onPress={() => setCategoryId(item.category_id)}
      style={[styles.chip, item.category_id === activeCategoryId && styles.chipActive]}
    >
      <Text
        numberOfLines={1}
        style={[styles.chipText, item.category_id === activeCategoryId && styles.chipTextActive]}
      >
        {item.category_name}
      </Text>
    </Pressable>
  );

  const renderStream = ({ item }: { item: StreamItem }) => {
    const icon = item.stream_icon || item.cover;
    const nowPlaying = contentType === 'live' && item.stream_id ? nowPlayingQuery.data?.[item.stream_id] : undefined;
    const isFavorite = favoriteIds.has(idOf(item));

    return (
      <Pressable onPress={() => openItem(item)} style={styles.row}>
        <View style={styles.iconWrapper}>
          {icon ? (
            <Image source={{ uri: icon }} style={styles.icon} contentFit="contain" transition={150} />
          ) : (
            <Text style={styles.iconFallback}>{item.name.slice(0, 2).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.rowBody}>
          <Text numberOfLines={1} style={styles.rowTitle}>{item.name}</Text>
          {nowPlaying ? (
            <Text numberOfLines={1} style={styles.rowSubtitle}>▶ {nowPlaying}</Text>
          ) : null}
        </View>
        <Pressable hitSlop={12} onPress={() => toggleFavorite(item)} style={styles.favButton}>
          <Text style={[styles.favIcon, isFavorite && styles.favIconActive]}>{isFavorite ? '★' : '☆'}</Text>
        </Pressable>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TextInput
        placeholder={t('common.search')}
        placeholderTextColor={colors.textMuted}
        value={search}
        onChangeText={setSearch}
        style={styles.search}
        autoCorrect={false}
      />
      <View style={styles.categories}>
        <FlashList
          horizontal
          data={categories}
          renderItem={renderCategory}
          keyExtractor={(item) => item.category_id}
          showsHorizontalScrollIndicator={false}
          extraData={activeCategoryId}
        />
      </View>
      {streamsQuery.isLoading || categoriesQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : streamsQuery.error || categoriesQuery.error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{String(streamsQuery.error ?? categoriesQuery.error)}</Text>
        </View>
      ) : (
        <FlashList
          data={filtered}
          renderItem={renderStream}
          keyExtractor={(item) => String(idOf(item))}
          extraData={[nowPlayingQuery.data, favoritesQuery.data]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  search: {
    margin: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surface,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categories: { height: 44, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: colors.surface,
    marginLeft: 8,
    maxWidth: 220,
  },
  chipActive: { backgroundColor: colors.accent },
  chipText: { color: colors.textMuted, fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  icon: { width: 52, height: 52 },
  iconFallback: { color: colors.textMuted, fontWeight: '700' },
  rowBody: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '500' },
  rowSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  favButton: { padding: 4 },
  favIcon: { fontSize: 22, color: colors.textMuted },
  favIconActive: { color: colors.favorite },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: colors.danger, textAlign: 'center' },
});
