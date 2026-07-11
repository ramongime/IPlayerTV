import type { StreamItem } from '@iplayertv/core';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors } from '@/lib/theme';

interface HeroBannerProps {
  stream: StreamItem;
  tmdbBackdrop?: string;
  onPlay: () => void;
  onMoreInfo: () => void;
}

export function HeroBanner({ stream, tmdbBackdrop, onPlay, onMoreInfo }: HeroBannerProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bannerImage = tmdbBackdrop || stream.cover || stream.stream_icon;
  const height = Math.min(width * 0.65, 320);

  return (
    <Animated.View entering={FadeIn.duration(500)} style={[styles.container, { height }]}>
      {bannerImage ? (
        <Image
          source={{ uri: bannerImage }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={300}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceHighlight }]} />
      )}
      <LinearGradient
        colors={['transparent', 'rgba(11, 18, 32, 0.7)', colors.background]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <Text numberOfLines={2} style={styles.title}>{stream.name}</Text>
        {stream.plot ? (
          <Text numberOfLines={2} style={styles.plot}>{stream.plot}</Text>
        ) : null}
        <View style={styles.buttons}>
          <Pressable onPress={onPlay} style={styles.playButton}>
            <Text style={styles.playButtonText}>▶ {t('common.playNow')}</Text>
          </Pressable>
          <Pressable onPress={onMoreInfo} style={styles.infoButton}>
            <Text style={styles.infoButtonText}>{t('common.moreInfo')}</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 6,
  },
  plot: {
    color: '#cbd5e1',
    fontSize: 13,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 4,
    lineHeight: 18,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  playButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  playButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  infoButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  infoButtonText: {
    color: '#e2e8f0',
    fontWeight: '600',
    fontSize: 14,
  },
});
