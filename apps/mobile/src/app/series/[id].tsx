import type { Episode } from '@iplayertv/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { watchedRepo } from '@/lib/repositories';
import { resolveAccount, xtream } from '@/lib/services';
import { useAppStore } from '@/lib/store';
import { colors } from '@/lib/theme';

export default function SeriesDetailScreen() {
  const { id, title, cover } = useLocalSearchParams<{ id: string; title?: string; cover?: string }>();
  const accountId = useAppStore((s) => s.activeAccountId);
  const router = useRouter();
  const queryClient = useQueryClient();

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

  const sections = useMemo(() => {
    const bySeason = new Map<number, Episode[]>();
    for (const episode of episodesQuery.data ?? []) {
      const list = bySeason.get(episode.season) ?? [];
      list.push(episode);
      bySeason.set(episode.season, list);
    }
    return [...bySeason.entries()]
      .sort(([a], [b]) => a - b)
      .map(([season, data]) => ({ title: `Temporada ${season}`, data }));
  }, [episodesQuery.data]);

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
      <Stack.Screen options={{ title: title ?? 'Série' }} />
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
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <Pressable onPress={() => playEpisode(item)} style={styles.row}>
              <Text style={styles.episodeNumber}>E{item.episode_num}</Text>
              <Text numberOfLines={1} style={styles.episodeTitle}>{item.title}</Text>
              {watchedIds.has(item.id) ? <Text style={styles.watched}>✓</Text> : null}
            </Pressable>
          )}
          stickySectionHeadersEnabled
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  cover: { width: '100%', height: 180 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: colors.danger, textAlign: 'center' },
  sectionHeader: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
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
