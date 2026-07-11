import type { StreamItem } from '@iplayertv/core';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors } from '@/lib/theme';

interface StreamCardProps {
  item: StreamItem;
  index: number;
  isFavorite: boolean;
  nowPlaying?: string;
  onPress: () => void;
  onToggleFavorite: () => void;
}

export function StreamCard({ item, index, isFavorite, nowPlaying, onPress, onToggleFavorite }: StreamCardProps) {
  const icon = item.cover || item.stream_icon;

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(300).springify()}>
      <Pressable onPress={onPress} style={styles.card}>
        <View style={styles.posterWrapper}>
          {icon ? (
            <Image source={{ uri: icon }} style={styles.poster} contentFit="cover" transition={200} />
          ) : (
            <View style={styles.posterFallback}>
              <Text style={styles.fallbackText}>{item.name.slice(0, 2).toUpperCase()}</Text>
            </View>
          )}
          <Pressable hitSlop={12} onPress={onToggleFavorite} style={styles.favBadge}>
            <Text style={[styles.favIcon, isFavorite && styles.favIconActive]}>
              {isFavorite ? '★' : '☆'}
            </Text>
          </Pressable>
        </View>
        <Text numberOfLines={2} style={styles.name}>{item.name}</Text>
        {nowPlaying ? (
          <Text numberOfLines={1} style={styles.nowPlaying}>▶ {nowPlaying}</Text>
        ) : null}
        {item.rating ? (
          <Text style={styles.rating}>⭐ {item.rating}</Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  posterWrapper: {
    aspectRatio: 2 / 3,
    backgroundColor: colors.surfaceHighlight,
    position: 'relative',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHighlight,
  },
  fallbackText: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 20,
  },
  favBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favIcon: { fontSize: 16, color: colors.textMuted },
  favIconActive: { color: colors.favorite },
  name: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
  nowPlaying: {
    color: colors.accent,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  rating: {
    color: colors.textMuted,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
});
