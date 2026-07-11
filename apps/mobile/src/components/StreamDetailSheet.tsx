import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { ContentType, StreamItem, EpgProgramme, Episode } from '@iplayertv/core';
import { tmdb, xtream, resolveAccount } from '@/lib/services';
import { colors } from '@/lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface StreamDetailSheetProps {
  visible: boolean;
  item: StreamItem | null;
  contentType: ContentType;
  accountId: string | null;
  onClose: () => void;
}

export function StreamDetailSheet({ visible, item, contentType, accountId, onClose }: StreamDetailSheetProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  // Fetch TMDB
  const tmdbQuery = useQuery({
    queryKey: ['tmdb', contentType, item?.name],
    enabled: visible && !!item && (contentType === 'movie' || contentType === 'series'),
    staleTime: 1000 * 60 * 60 * 24,
    queryFn: () => {
      const apiKey = useAppStore.getState().tmdbApiKey || 'a43d0032bda98c8c4cc815fb5a639dfc';
      return tmdb.fetchInfo(item!.name, contentType as 'movie' | 'series', apiKey);
    },
  });

  // Fetch EPG for Live TV
  const epgQuery = useQuery({
    queryKey: ['epg', accountId, item?.stream_id],
    enabled: visible && !!item && contentType === 'live' && !!accountId,
    queryFn: async () => {
      const account = await resolveAccount(accountId!);
      return xtream.shortEpg(account, item!.stream_id!, 15);
    },
  });

  if (!item) return null;

  const cover = tmdbQuery.data?.posterPath || item.cover || item.stream_icon;
  const backdrop = tmdbQuery.data?.backdropPath;
  const plot = tmdbQuery.data?.overview || item.plot;
  const rating = tmdbQuery.data?.voteAverage || item.rating;
  const releaseYear = tmdbQuery.data?.releaseDate?.split('-')[0];

  const handlePlay = () => {
    onClose();
    if (contentType === 'series') {
      router.push({
        pathname: '/series/[id]',
        params: { id: String(item.series_id), title: item.name, cover: cover ?? '' },
      });
    } else {
      router.push({
        pathname: '/player',
        params: {
          contentType,
          streamId: String(item.stream_id ?? item.series_id),
          extension: item.container_extension ?? '',
          title: item.name,
        },
      });
    }
  };

  const epg = epgQuery.data ?? [];
  const catchupEpg = epg.filter((p) => p.has_archive);

  const renderEpg = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('epg.nowPlaying')}</Text>
      {epg.length === 0 ? (
        <Text style={styles.mutedText}>{t('epg.noEpg')}</Text>
      ) : (
        epg.map((prog, idx) => (
          <View key={idx} style={styles.epgCard}>
            <Text style={styles.epgTitle}>{prog.title || 'Sem título'}</Text>
            <Text style={styles.epgTime}>{prog.start} - {prog.end}</Text>
            {prog.description ? <Text style={styles.epgDesc}>{prog.description}</Text> : null}
          </View>
        ))
      )}

      {catchupEpg.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{t('catchup.title')}</Text>
          {catchupEpg.map((prog, idx) => (
            <View key={idx} style={styles.catchupCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.epgTitle}>{prog.title}</Text>
                <Text style={styles.epgTime}>{prog.start} - {prog.end}</Text>
              </View>
              <Pressable
                style={styles.playMiniBtn}
                onPress={() => {
                  onClose();
                  // TODO: route to catchup player with streamId, startRaw, duration
                }}
              >
                <Text style={styles.playMiniBtnText}>▶ Catchup</Text>
              </Pressable>
            </View>
          ))}
        </>
      )}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { maxHeight: height * 0.9, paddingBottom: insets.bottom + 20 }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.dragHandle} />
          
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            {backdrop ? (
              <View style={styles.backdropContainer}>
                <Image source={{ uri: backdrop }} style={StyleSheet.absoluteFill} contentFit="cover" />
                <LinearGradient colors={['transparent', colors.surface]} style={StyleSheet.absoluteFill} />
              </View>
            ) : null}

            <View style={[styles.header, { marginTop: backdrop ? -80 : 0 }]}>
              <Image source={{ uri: cover }} style={styles.poster} contentFit="cover" />
              <View style={styles.headerInfo}>
                <Text style={styles.title} numberOfLines={3}>{item.name}</Text>
                <View style={styles.metaRow}>
                  {rating ? <Text style={styles.metaText}>⭐ {rating}</Text> : null}
                  {releaseYear ? <Text style={styles.metaText}>📅 {releaseYear}</Text> : null}
                  {item.container_extension ? <Text style={styles.metaBadge}>{item.container_extension.toUpperCase()}</Text> : null}
                </View>
              </View>
            </View>

            <View style={styles.content}>
              <Pressable style={styles.playBtn} onPress={handlePlay}>
                <Text style={styles.playBtnText}>▶ {contentType === 'series' ? t('common.moreInfo') : t('common.playNow')}</Text>
              </Pressable>

              {plot ? <Text style={styles.plot}>{plot}</Text> : null}

              {contentType === 'live' && renderEpg()}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
    zIndex: 10,
  },
  backdropContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 16,
    zIndex: 2,
  },
  poster: {
    width: 100,
    aspectRatio: 2 / 3,
    borderRadius: 8,
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  metaBadge: {
    backgroundColor: colors.surfaceHighlight,
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  content: {
    padding: 20,
  },
  playBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  playBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  plot: {
    color: '#cbd5e1',
    lineHeight: 22,
    fontSize: 14,
    marginBottom: 20,
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  epgCard: {
    backgroundColor: colors.surfaceHighlight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  epgTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  epgTime: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  epgDesc: {
    color: '#cbd5e1',
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  catchupCard: {
    backgroundColor: colors.surfaceHighlight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playMiniBtn: {
    backgroundColor: 'rgba(76, 201, 240, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  playMiniBtnText: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 12,
  },
  mutedText: {
    color: colors.textMuted,
  },
});
