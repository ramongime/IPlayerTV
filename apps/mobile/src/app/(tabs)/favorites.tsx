import type { Favorite } from '@iplayertv/core';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { favoritesRepo } from '@/lib/repositories';
import { useAppStore } from '@/lib/store';
import { colors } from '@/lib/theme';

const TYPE_LABELS: Record<string, string> = { live: '📺', movie: '🎬', series: '🎞️' };

export default function FavoritesScreen() {
  const accountId = useAppStore((s) => s.activeAccountId);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const favoritesQuery = useQuery({
    queryKey: ['favorites', accountId],
    enabled: !!accountId,
    queryFn: () => favoritesRepo.list(accountId!),
  });

  const openFavorite = (item: Favorite) => {
    if (item.contentType === 'series') {
      router.push({
        pathname: '/series/[id]',
        params: { id: String(item.streamId), title: item.name, cover: item.icon ?? '' },
      });
      return;
    }
    router.push({
      pathname: '/player',
      params: {
        contentType: item.contentType,
        streamId: String(item.streamId),
        extension: '',
        title: item.name,
      },
    });
  };

  const removeFavorite = async (item: Favorite) => {
    await favoritesRepo.toggle(item);
    queryClient.invalidateQueries({ queryKey: ['favorites', accountId] });
  };

  const favorites = favoritesQuery.data ?? [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.heading}>{t('common.favorites')}</Text>
      {favorites.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>☆</Text>
          <Text style={styles.emptySubtitle}>—</Text>
        </View>
      ) : (
        <FlashList
          data={favorites}
          keyExtractor={(item) => `${item.contentType}-${item.streamId}`}
          renderItem={({ item }) => (
            <Pressable onPress={() => openFavorite(item)} style={styles.row}>
              <View style={styles.iconWrapper}>
                {item.icon ? (
                  <Image source={{ uri: item.icon }} style={styles.icon} contentFit="contain" transition={150} />
                ) : (
                  <Text style={styles.iconFallback}>{TYPE_LABELS[item.contentType]}</Text>
                )}
              </View>
              <View style={styles.rowBody}>
                <Text numberOfLines={1} style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowSubtitle}>{TYPE_LABELS[item.contentType]} {t(`tabs.${item.contentType}`)}</Text>
              </View>
              <Pressable hitSlop={12} onPress={() => removeFavorite(item)} style={styles.favButton}>
                <Text style={styles.favIconActive}>★</Text>
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  heading: { color: colors.text, fontSize: 22, fontWeight: '700', margin: 16, marginBottom: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 44, color: colors.textMuted },
  emptySubtitle: { color: colors.textMuted, marginTop: 8 },
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
  iconFallback: { fontSize: 22 },
  rowBody: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '500' },
  rowSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  favButton: { padding: 4 },
  favIconActive: { fontSize: 22, color: colors.favorite },
});
