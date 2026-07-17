import type { Episode } from '@iplayertv/core';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { watchedRepo } from '@/lib/repositories';
import { resolveAccount, xtream } from '@/lib/services';
import { useAppStore } from '@/lib/store';
import { colors } from '@/lib/theme';

export default function SeriesDetailScreen() {
  const { id, title, cover } = useLocalSearchParams<{ id: string; title?: string; cover?: string }>();
  const accountId = useAppStore((s) => s.activeAccountId);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [seasonModalVisible, setSeasonModalVisible] = useState(false);

  const episodesQuery = useQuery({
    queryKey: ['series-episodes', accountId, id],
    enabled: !!accountId && !!id,
    queryFn: async () => xtream.seriesEpisodes(await resolveAccount(accountId!), Number(id)),
  });

  const watchedQuery = useQuery({
    queryKey: ['watched', accountId],
    enabled: !!accountId,
    queryFn: () => watchedRepo.list(accountId!),
  });

  const watchedIds = useMemo(
    () => new Set((watchedQuery.data ?? []).filter((w) => w.contentType === 'series').map((w) => w.streamId)),
    [watchedQuery.data]
  );

  // Group episodes by season
  const seasonMap = useMemo(() => {
    const map = new Map<number, Episode[]>();
    for (const episode of episodesQuery.data ?? []) {
      const list = map.get(episode.season) ?? [];
      list.push(episode);
      map.set(episode.season, list);
    }
    return map;
  }, [episodesQuery.data]);

  const seasons = useMemo(
    () => [...seasonMap.keys()].sort((a, b) => a - b),
    [seasonMap]
  );

  // Default to first season
  const activeSeason = selectedSeason ?? seasons[0] ?? 1;
  const activeEpisodes = seasonMap.get(activeSeason) ?? [];

  const playEpisode = (episode: Episode) => {
    watchedRepo.markWatched(accountId!, 'series', episode.id).then(() =>
      queryClient.invalidateQueries({ queryKey: ['watched', accountId] })
    );
    router.push({
      pathname: '/player',
      params: {
        contentType: 'series',
        streamId: String(episode.id),
        extension: episode.container_extension ?? 'mp4',
        title: `${title ?? ''} — T${episode.season}E${episode.episode_num}`,
      },
    });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: title ?? t('series.title') }} />
      {cover ? (
        <Image source={{ uri: cover }} style={styles.cover} contentFit="cover" transition={200} />
      ) : null}

      {episodesQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : episodesQuery.error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{String(episodesQuery.error)}</Text>
        </View>
      ) : (
        <>
          {/* Season Dropdown */}
          {seasons.length > 1 && (
            <Pressable
              style={styles.seasonDropdown}
              onPress={() => setSeasonModalVisible(true)}
            >
              <Text style={styles.seasonDropdownText}>
                {t('series.season', { season: activeSeason })}
              </Text>
              <Text style={styles.seasonDropdownArrow}>▾</Text>
            </Pressable>
          )}

          {seasons.length === 1 && (
            <Text style={styles.singleSeasonHeader}>
              {t('series.season', { season: activeSeason })}
            </Text>
          )}

          {/* Season Selection Modal */}
          <Modal
            visible={seasonModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setSeasonModalVisible(false)}
          >
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setSeasonModalVisible(false)}
            >
              <Pressable
                style={[styles.modalContent, { paddingBottom: insets.bottom + 12 }]}
                onPress={(e) => e.stopPropagation()}
              >
                <Text style={styles.modalTitle}>{t('series.selectSeason')}</Text>
                {seasons.map((season) => (
                  <Pressable
                    key={season}
                    onPress={() => {
                      setSelectedSeason(season);
                      setSeasonModalVisible(false);
                    }}
                    style={[
                      styles.modalItem,
                      season === activeSeason && styles.modalItemActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        season === activeSeason && styles.modalItemTextActive,
                      ]}
                    >
                      {t('series.season', { season })}
                    </Text>
                    <Text style={styles.modalItemCount}>
                      {seasonMap.get(season)?.length ?? 0} ep.
                    </Text>
                  </Pressable>
                ))}
              </Pressable>
            </Pressable>
          </Modal>

          {/* Episodes List */}
          <FlashList
            data={activeEpisodes}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <Pressable onPress={() => playEpisode(item)} style={styles.row}>
                <Text style={styles.episodeNumber}>E{item.episode_num}</Text>
                <Text numberOfLines={1} style={styles.episodeTitle}>{item.title}</Text>
                {watchedIds.has(item.id) ? <Text style={styles.watched}>✓</Text> : null}
              </Pressable>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  cover: { width: '100%', height: 180 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: colors.danger, textAlign: 'center' },
  // Season Dropdown
  seasonDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  seasonDropdownText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  seasonDropdownArrow: {
    color: colors.textMuted,
    fontSize: 16,
    marginLeft: 8,
  },
  singleSeasonHeader: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  // Season Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    maxHeight: '60%',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalItemActive: {
    backgroundColor: colors.accent + '22',
  },
  modalItemText: {
    color: colors.text,
    fontSize: 15,
  },
  modalItemTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  modalItemCount: {
    color: colors.textMuted,
    fontSize: 12,
  },
  // Episode rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  episodeNumber: { color: colors.accent, fontWeight: '700', width: 44 },
  episodeTitle: { color: colors.text, flex: 1 },
  watched: { color: colors.accent, fontWeight: '700' },
});
