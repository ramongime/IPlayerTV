import type { ContentType } from '@iplayertv/core';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resolveAccount, xtream } from '@/lib/services';
import { useAppStore } from '@/lib/store';
import { colors } from '@/lib/theme';

export default function PlayerScreen() {
  const { contentType, streamId, extension, title } = useLocalSearchParams<{
    contentType: ContentType;
    streamId: string;
    extension?: string;
    title?: string;
  }>();
  const accountId = useAppStore((s) => s.activeAccountId);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // resolveBestStreamUrl probes the same URL candidates as the desktop app
  const urlQuery = useQuery({
    queryKey: ['stream-url', accountId, contentType, streamId, extension],
    enabled: !!accountId && !!streamId,
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const account = await resolveAccount(accountId!);
      const forceExtension = contentType === 'live';
      const url = await xtream.resolveBestStreamUrl(
        account,
        contentType,
        Number(streamId),
        contentType === 'live' ? 'm3u8' : extension || undefined,
        forceExtension
      );
      return { url, userAgent: account.userAgent };
    },
  });

  const player = useVideoPlayer(null);

  useEffect(() => {
    if (!urlQuery.data) return;
    const { url, userAgent } = urlQuery.data;
    player
      .replaceAsync({
        uri: url,
        headers: userAgent ? { 'User-Agent': userAgent } : undefined,
      })
      .then(() => {
        player.staysActiveInBackground = true;
        player.play();
      })
      .catch(() => {});
  }, [urlQuery.data, player]);

  return (
    <View style={styles.container}>
      {urlQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loadingText}>{title}</Text>
        </View>
      ) : urlQuery.error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{String(urlQuery.error)}</Text>
        </View>
      ) : (
        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls
          allowsPictureInPicture
          startsPictureInPictureAutomatically
          fullscreenOptions={{ enable: true }}
        />
      )}
      <Pressable
        onPress={() => router.back()}
        style={[styles.closeButton, { top: insets.top + 8 }]}
        hitSlop={12}
      >
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
      {title ? (
        <Text numberOfLines={1} style={[styles.title, { top: insets.top + 12 }]}>{title}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  loadingText: { color: colors.textMuted },
  error: { color: colors.danger, textAlign: 'center' },
  closeButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  title: {
    position: 'absolute',
    left: 64,
    right: 16,
    zIndex: 9,
    color: '#fff',
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 4,
  },
});
