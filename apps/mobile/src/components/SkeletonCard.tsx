import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { colors } from '@/lib/theme';

interface SkeletonCardProps {
  index?: number;
}

export function SkeletonCard({ index = 0 }: SkeletonCardProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    // Mutating .value is Reanimated's documented API for shared values
    // eslint-disable-next-line react-hooks/immutability
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 800 }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.poster, animatedStyle]} />
      <View style={styles.textArea}>
        <Animated.View style={[styles.textLine, animatedStyle, { width: '80%' }]} />
        <Animated.View style={[styles.textLine, animatedStyle, { width: '50%', marginTop: 6 }]} />
      </View>
    </View>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 6,
  },
  card: {
    width: '48%',
    margin: '1%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  poster: {
    aspectRatio: 2 / 3,
    backgroundColor: colors.surfaceHighlight,
  },
  textArea: {
    padding: 8,
    gap: 4,
  },
  textLine: {
    height: 12,
    borderRadius: 4,
    backgroundColor: colors.surfaceHighlight,
  },
});
