import type { ContentType } from '@iplayertv/core';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resolveAccount, xtream } from '@/lib/services';
import { useAppStore } from '@/lib/store';
import { colors } from '@/lib/theme';

const CONTROLS_TIMEOUT = 4000;

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
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;
  const isLive = contentType === 'live';

  // Controls visibility
  const [showControls, setShowControls] = useState(true);
  const controlsOpacity = useMemo(() => new Animated.Value(1), []);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimer.current = setTimeout(() => {
      Animated.timing(controlsOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setShowControls(false));
    }, CONTROLS_TIMEOUT);
  }, [clearHideTimer, controlsOpacity]);

  const toggleControls = useCallback(() => {
    if (showControls) {
      // Hide immediately
      clearHideTimer();
      Animated.timing(controlsOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShowControls(false));
    } else {
      // Show
      setShowControls(true);
      controlsOpacity.setValue(1);
      scheduleHide();
    }
  }, [showControls, clearHideTimer, controlsOpacity, scheduleHide]);

  // Auto-hide after initial show
  useEffect(() => {
    if (showControls) {
      scheduleHide();
    }
    return clearHideTimer;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount
  }, []);

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
    
    return () => {
      try { player.pause(); } catch {}
    };
  }, [urlQuery.data, player]);



  return (
    <View
      style={[
        styles.container,
        isPortrait && { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      {urlQuery.error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{String(urlQuery.error)}</Text>
        </View>
      ) : !isLive && urlQuery.isLoading ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>{title}</Text>
        </View>
      ) : (
        <Pressable style={styles.videoContainer} onPress={toggleControls}>
          <VideoView
            player={player}
            style={styles.video}
            contentFit="contain"
            nativeControls={false}
            allowsPictureInPicture
            startsPictureInPictureAutomatically
          />
        </Pressable>
      )}

      {/* Overlay Controls */}
      {showControls && (
        <Animated.View
          style={[styles.controlsOverlay, { opacity: controlsOpacity }]}
          pointerEvents="box-none"
        >
          {/* Top bar: close button + title */}
          <View style={[styles.topBar, { top: isPortrait ? insets.top + 8 : 8 }]}>
            <Pressable
              onPress={() => {
                try { player.pause(); } catch {}
                router.back();
              }}
              style={styles.closeButton}
              hitSlop={12}
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
            {title ? (
              <Text numberOfLines={1} style={styles.title}>{title}</Text>
            ) : null}
          </View>

          {/* Bottom bar: live badge */}
          {isLive && (
            <View style={[styles.bottomBar, { bottom: isPortrait ? insets.bottom + 12 : 12 }]}>
              <View style={styles.liveBadge}>
                <Text style={styles.liveDot}>●</Text>
                <Text style={styles.liveText}>{t('player.liveTag')}</Text>
              </View>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  videoContainer: { flex: 1 },
  video: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  loadingText: { color: colors.textMuted },
  error: { color: colors.danger, textAlign: 'center' },
  // Controls overlay
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 11,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  title: {
    flex: 1,
    color: '#fff',
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 4,
  },
  // Bottom bar with live badge
  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 11,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220,38,38,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 5,
  },
  liveDot: {
    color: '#fff',
    fontSize: 10,
  },
  liveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
