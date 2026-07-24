import type { Category, ContentType, StreamItem } from '@iplayertv/core';
import { FlashList as BaseFlashList } from '@shopify/flash-list';
const FlashList = BaseFlashList as any;
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
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
import * as Haptics from 'expo-haptics';
import { favoritesRepo } from '@/lib/repositories';
import { tmdb, DEFAULT_TMDB_API_KEY } from '@/lib/services';
import { tmdbKeys } from '@/lib/queryKeys';
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
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

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
    isSearching: !!search.trim(),
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

  const listExtraData = useMemo(() => ({ favoriteIds, nowPlaying }), [favoriteIds, nowPlaying]);

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
    queryKey: tmdbKeys.info(contentType, featuredStream?.name),
    enabled: !!featuredStream && (contentType === 'movie' || contentType === 'series'),
    staleTime: 1000 * 60 * 60 * 24, // 24h
    queryFn: () => {
      const apiKey = useAppStore.getState().tmdbApiKey || DEFAULT_TMDB_API_KEY;
      return tmdb.fetchInfo(featuredStream!.name, contentType as 'movie' | 'series', apiKey);
    },
  });

  // Grid items: exclude featured stream
  const gridItems = useMemo(() => {
    if (!featuredStream) return filtered;
    return filtered.filter((s) => s !== featuredStream);
  }, [filtered, featuredStream]);

  const idOf = (item: StreamItem) => (contentType === 'series' ? item.series_id : item.stream_id) ?? 0;

  const openItem = (item: StreamItem) => {
    setSelectedStream(item);
    setSheetVisible(true);
  };

  const toggleFavorite = async (item: StreamItem) => {
    const streamId = idOf(item);
    if (!streamId) return; // Don't favorite items without a valid ID
    Haptics.selectionAsync();
    await favoritesRepo.toggle({
      accountId: accountId!,
      contentType,
      streamId,
      name: item.name,
      icon: item.stream_icon ?? item.cover,
    });
    invalidateLibrary();
    // Also invalidate the favorites-specific query used by the Favorites tab
    queryClient.invalidateQueries({ queryKey: ['favorites', accountId] });
  };

  const isGridMode = contentType === 'movie' || contentType === 'series';

  // --- Category Dropdown ---
  const activeCategoryName = useMemo(() => {
    if (!activeCategoryId) return t('common.allCategories');
    return categories.find((c) => c.category_id === activeCategoryId)?.category_name ?? t('common.allCategories');
  }, [activeCategoryId, categories, t]);

  const filteredCategories = useMemo(() => {
    const term = categorySearch.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter((c) => c.category_name.toLowerCase().includes(term));
  }, [categories, categorySearch]);

  const selectCategory = (cat: Category | null) => {
    setCategoryId(cat?.category_id);
    setCategoryModalVisible(false);
    setCategorySearch('');
  };

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
  }, [favoriteIds, nowPlaying, contentType, accountId, idOf, toggleFavorite, openItem]);

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
  }, [featuredStream, isGridMode, contentType, router, tmdbQuery.data?.backdropPath, openItem]);

  if (hasHydrated && !accountId) {
    return <Redirect href="/login" />;
  }

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

      {/* Category Dropdown Trigger */}
      <Pressable
        style={styles.categoryDropdown}
        onPress={() => setCategoryModalVisible(true)}
      >
        <Text numberOfLines={1} style={styles.categoryDropdownText}>
          {activeCategoryName}
        </Text>
        <Text style={styles.categoryDropdownArrow}>▾</Text>
      </Pressable>

      {/* Category Selection Modal */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="fade"
        supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
        onRequestClose={() => {
          setCategoryModalVisible(false);
          setCategorySearch('');
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            setCategoryModalVisible(false);
            setCategorySearch('');
          }}
        >
          <Pressable
            style={[styles.modalContent, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>{t('common.selectCategory')}</Text>
            <TextInput
              placeholder={t('common.search')}
              placeholderTextColor={colors.textMuted}
              value={categorySearch}
              onChangeText={setCategorySearch}
              style={styles.modalSearch}
              autoCorrect={false}
              autoFocus
            />
            <View style={{ flex: 1, minHeight: 300, width: '100%' }}>
              <FlashList
                // @ts-ignore
                data={filteredCategories}
                estimatedItemSize={44}
                keyExtractor={(item: any) => item.category_id}
              ListHeaderComponent={
                <Pressable
                  onPress={() => selectCategory(null)}
                  style={[styles.modalItem, !activeCategoryId && styles.modalItemActive]}
                >
                  <Text style={[styles.modalItemText, !activeCategoryId && styles.modalItemTextActive]}>
                    {t('common.allCategories')}
                  </Text>
                </Pressable>
              }
              renderItem={({ item }: { item: any }) => (
                <Pressable
                  onPress={() => selectCategory(item)}
                  onLongPress={() => {
                    Alert.alert(t('common.hideCategory'), `${t('common.hide')} ${item.category_name}?`, [
                      { text: t('common.cancel'), style: 'cancel' },
                      {
                        text: t('common.hide'),
                        style: 'destructive',
                        onPress: () => {
                          useAppStore.getState().toggleHiddenCategory(accountId!, contentType, item.category_id);
                        },
                      },
                    ]);
                  }}
                  style={[styles.modalItem, item.category_id === activeCategoryId && styles.modalItemActive]}
                >
                  <Text
                    numberOfLines={1}
                    style={[styles.modalItemText, item.category_id === activeCategoryId && styles.modalItemTextActive]}
                  >
                    {item.category_name}
                  </Text>
                </Pressable>
                )}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
          // @ts-ignore
          data={gridItems}
          estimatedItemSize={220}
          renderItem={renderGridItem}
          keyExtractor={(item: any) => String(idOf(item))}
          numColumns={2}
          ListHeaderComponent={ListHeader}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.accent}
            />
          }
          extraData={listExtraData}
        />
      ) : (
        <FlashList
          // @ts-ignore
          data={filtered}
          estimatedItemSize={68}
          renderItem={renderListItem}
          keyExtractor={(item: any) => String(idOf(item))}
          extraData={listExtraData}
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
  // Category Dropdown
  categoryDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryDropdownText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  categoryDropdownArrow: {
    color: colors.textMuted,
    fontSize: 16,
    marginLeft: 8,
  },
  // Category Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    maxHeight: '70%',
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalSearch: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceHighlight,
    color: colors.text,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalItemActive: {
    backgroundColor: colors.accent + '22',
  },
  modalItemText: {
    color: colors.text,
    fontSize: 14,
  },
  modalItemTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
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
