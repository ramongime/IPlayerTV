import type { Category, ContentType, StreamItem } from '@iplayertv/core';
import { FlashList } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { favoritesRepo, watchedRepo } from '@/lib/repositories';
import { useAppStore } from '@/lib/store';
import { useLibrary } from '@/hooks/useLibrary';
import { StreamCard } from '@/components/StreamCard';
import { HeroBanner } from '@/components/HeroBanner';
import { SkeletonGrid } from '@/components/SkeletonCard';
import { StreamDetailSheet } from '@/components/StreamDetailSheet';
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

  const {
    categories,
    favorites,
    streams,
    nowPlaying,
    activeCategoryId,
    isLoading,
    isRefetching,
    error,
    invalidateLibrary,
    refetch,
  } = useLibrary({
    accountId,
    contentType,
    categoryId,
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return streams;
    return streams.filter((s) => s.name.toLowerCase().includes(term));
  }, [streams, search]);

  const favoriteIds = useMemo(
    () => new Set(favorites.filter((f) => f.contentType === contentType).map((f) => f.streamId)),
    [favorites, contentType]
  );

  // State for the details sheet
  const [selectedStream, setSelectedStream] = useState<StreamItem | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  // Hero banner: first stream with a cover
  const featuredStream = useMemo(() => {
    if ((contentType === 'movie' || contentType === 'series') && filtered.length > 0 && !search) {
      return filtered.find((s) => s.cover || s.stream_icon) || filtered[0];
    }
    return null;
  }, [filtered, contentType, search]);

  const tmdbQuery = useQuery({
    queryKey: ['tmdb', contentType, featuredStream?.name],
    enabled: !!featuredStream && (contentType === 'movie' || contentType === 'series'),
    staleTime: 1000 * 60 * 60 * 24, // 24h
    queryFn: () => {
      const apiKey = useAppStore.getState().tmdbApiKey || 'a43d0032bda98c8c4cc815fb5a639dfc';
      return tmdb.fetchInfo(featuredStream!.name, contentType as 'movie' | 'series', apiKey);
    },
  });

  // Grid items: exclude featured stream
  const gridItems = useMemo(() => {
    if (!featuredStream) return filtered;
    return filtered.filter((s) => s !== featuredStream);
  }, [filtered, featuredStream]);

  if (hasHydrated && !accountId) {
    return <Redirect href="/login" />;
  }

  const idOf = (item: StreamItem) => (contentType === 'series' ? item.series_id : item.stream_id) ?? 0;

  const openItem = (item: StreamItem) => {
    setSelectedStream(item);
    setSheetVisible(true);
  };

  const toggleFavorite = async (item: StreamItem) => {
    await favoritesRepo.toggle({
      accountId: accountId!,
      contentType,
      streamId: idOf(item),
      name: item.name,
      icon: item.stream_icon ?? item.cover,
    });
    invalidateLibrary();
  };

  const isGridMode = contentType === 'movie' || contentType === 'series';

  const renderCategory = ({ item }: { item: Category }) => (
    <Pressable
      onPress={() => setCategoryId(item.category_id)}
      onLongPress={() => {
        Alert.alert(t('common.hideCategory'), `${t('common.hide')} ${item.category_name}?`, [
          { text: t('common.cancel'), style: 'cancel' },
          { 
            text: t('common.hide'), 
            style: 'destructive',
            onPress: () => {
              useAppStore.getState().toggleHiddenCategory(accountId!, contentType, item.category_id);
            }
          }
        ]);
      }}
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

  // Live TV: list view
  const renderListItem = ({ item }: { item: StreamItem }) => {
    const icon = item.stream_icon || item.cover;
    const np = contentType === 'live' && item.stream_id ? nowPlaying[item.stream_id] : undefined;
    const isFav = favoriteIds.has(idOf(item));

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
          {np ? (
            <Text numberOfLines={1} style={styles.rowSubtitle}>▶ {np}</Text>
          ) : null}
        </View>
        <Pressable hitSlop={12} onPress={() => toggleFavorite(item)} style={styles.favButton}>
          <Text style={[styles.favIcon, isFav && styles.favIconActive]}>{isFav ? '★' : '☆'}</Text>
        </Pressable>
      </Pressable>
    );
  };

  // Movies/Series: card grid
  const renderGridItem = useCallback(({ item, index }: { item: StreamItem; index: number }) => {
    return (
      <StreamCard
        item={item}
        index={index}
        isFavorite={favoriteIds.has(idOf(item))}
        nowPlaying={contentType === 'live' && item.stream_id ? nowPlaying[item.stream_id] : undefined}
        onPress={() => openItem(item)}
        onToggleFavorite={() => toggleFavorite(item)}
      />
    );
  }, [favoriteIds, nowPlaying, contentType, accountId]);

  const ListHeader = useMemo(() => {
    if (!featuredStream || isGridMode === false) return null;
    return (
      <HeroBanner
        stream={featuredStream}
        tmdbBackdrop={tmdbQuery.data?.backdropPath}
        onPlay={() => openItem(featuredStream)}
        onMoreInfo={() => {
          if (contentType === 'series') {
            router.push({
              pathname: '/series/[id]',
              params: { id: String(featuredStream.series_id), title: featuredStream.name, cover: featuredStream.cover ?? featuredStream.stream_icon ?? '' },
            });
          } else {
            openItem(featuredStream);
          }
        }}
      />
    );
  }, [featuredStream, isGridMode, contentType]);

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

      {isLoading ? (
        isGridMode ? (
          <SkeletonGrid count={6} />
        ) : (
          <View style={styles.center}>
            <Text style={styles.loadingText}>{t('epg.loading')}</Text>
          </View>
        )
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : isGridMode ? (
        <FlashList
          data={gridItems}
          renderItem={renderGridItem}
          keyExtractor={(item) => String(idOf(item))}
          numColumns={2}
          ListHeaderComponent={ListHeader}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.accent}
            />
          }
          extraData={[favoriteIds, nowPlaying]}
          estimatedItemSize={250}
        />
      ) : (
        <FlashList
          data={filtered}
          renderItem={renderListItem}
          keyExtractor={(item) => String(idOf(item))}
          extraData={[nowPlaying, favoriteIds]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.accent}
            />
          }
        />
      )}

      <StreamDetailSheet
        visible={sheetVisible}
        item={selectedStream}
        contentType={contentType}
        accountId={accountId!}
        onClose={() => {
          setSheetVisible(false);
          setSelectedStream(null);
        }}
      />
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
  // List view styles (Live TV)
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
  loadingText: { color: colors.textMuted },
});
