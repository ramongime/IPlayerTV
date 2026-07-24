import React, { useMemo } from 'react';
import { StyleSheet, View, Text, useWindowDimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { VideoView, type VideoPlayer } from 'expo-video';

export interface GestureVideoPlayerProps {
  player: VideoPlayer;
  title?: string;
  onToggleControls: () => void;
}

export function GestureVideoPlayer({ player, title, onToggleControls }: GestureVideoPlayerProps) {
  const { width, height } = useWindowDimensions();

  // Shared Values for UI HUD Overlays
  const volumeHUDVisible = useSharedValue(0);
  const volumeLevel = useSharedValue(player.volume ?? 1.0);

  const brightnessHUDVisible = useSharedValue(0);
  const brightnessLevel = useSharedValue(1.0);

  const seekHUDVisible = useSharedValue(0);
  const seekOffsetSeconds = useSharedValue(0);
  const isScrubbing = useSharedValue(0);

  const startY = useSharedValue(0);
  const startVolume = useSharedValue(1.0);
  const startBrightness = useSharedValue(1.0);

  // 1. Single Tap Gesture
  const singleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(1)
        .onEnd(() => {
          'worklet';
          scheduleOnRN(onToggleControls);
        }),
    [onToggleControls]
  );

  // 2. Double Tap Left (Seek Back -10s)
  const doubleTapLeft = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .onEnd((e) => {
          'worklet';
          if (e.x < width * 0.35) {
            seekOffsetSeconds.value = -10;
            seekHUDVisible.value = withTiming(1, { duration: 150 }, () => {
              seekHUDVisible.value = withTiming(0, { duration: 600 });
            });
            scheduleOnRN(() => {
              try {
                player.seekBy(-10);
              } catch {}
            });
          }
        }),
    [width, player]
  );

  // 3. Double Tap Right (Seek Forward +10s)
  const doubleTapRight = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .onEnd((e) => {
          'worklet';
          if (e.x > width * 0.65) {
            seekOffsetSeconds.value = 10;
            seekHUDVisible.value = withTiming(1, { duration: 150 }, () => {
              seekHUDVisible.value = withTiming(0, { duration: 600 });
            });
            scheduleOnRN(() => {
              try {
                player.seekBy(10);
              } catch {}
            });
          }
        }),
    [width, player]
  );

  // 4. Double Tap Center (Play/Pause)
  const doubleTapCenter = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .onEnd((e) => {
          'worklet';
          if (e.x >= width * 0.35 && e.x <= width * 0.65) {
            scheduleOnRN(() => {
              try {
                if (player.playing) {
                  player.pause();
                } else {
                  player.play();
                }
              } catch {}
            });
          }
        }),
    [width, player]
  );

  // Combine Double Taps
  const doubleTapGestures = useMemo(
    () => Gesture.Exclusive(doubleTapLeft, doubleTapRight, doubleTapCenter),
    [doubleTapLeft, doubleTapRight, doubleTapCenter]
  );

  // Exclusive: Double Tap takes priority over Single Tap
  const tapGestures = useMemo(
    () => Gesture.Exclusive(doubleTapGestures, singleTap),
    [doubleTapGestures, singleTap]
  );

  // 5. Vertical Pan Gesture (Volume on Right, Brightness on Left)
  const verticalPan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-10, 10])
        .failOffsetX([-15, 15])
        .onBegin((e) => {
          'worklet';
          startY.value = e.y;
          startVolume.value = volumeLevel.value;
          startBrightness.value = brightnessLevel.value;
        })
        .onUpdate((e) => {
          'worklet';
          const deltaY = (startY.value - e.y) / (height * 0.4);
          if (e.x > width * 0.5) {
            // Right Side: Volume
            const newVol = Math.min(1.0, Math.max(0.0, startVolume.value + deltaY));
            volumeLevel.value = newVol;
            volumeHUDVisible.value = 1;
            scheduleOnRN(() => {
              try {
                player.volume = newVol;
              } catch {}
            });
          } else {
            // Left Side: Brightness
            const newBright = Math.min(1.0, Math.max(0.0, startBrightness.value + deltaY));
            brightnessLevel.value = newBright;
            brightnessHUDVisible.value = 1;
          }
        })
        .onFinalize(() => {
          'worklet';
          volumeHUDVisible.value = withTiming(0, { duration: 800 });
          brightnessHUDVisible.value = withTiming(0, { duration: 800 });
        }),
    [height, width, player]
  );

  // 6. Horizontal Pan Gesture (Timeline Scrub)
  const horizontalPan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-15, 15])
        .onBegin(() => {
          'worklet';
          seekHUDVisible.value = 1;
          isScrubbing.value = 1;
        })
        .onUpdate((e) => {
          'worklet';
          const deltaSeconds = (e.translationX / width) * 120;
          seekOffsetSeconds.value = Math.round(deltaSeconds);
        })
        .onFinalize(() => {
          'worklet';
          const offset = seekOffsetSeconds.value;
          if (offset !== 0) {
            scheduleOnRN(() => {
              try {
                player.seekBy(offset);
              } catch {}
            });
          }
          seekHUDVisible.value = withTiming(0, { duration: 800 });
          isScrubbing.value = 0;
        }),
    [width, player]
  );

  const panGestures = useMemo(
    () => Gesture.Simultaneous(verticalPan, horizontalPan),
    [verticalPan, horizontalPan]
  );

  const composedGestures = useMemo(
    () => Gesture.Simultaneous(tapGestures, panGestures),
    [tapGestures, panGestures]
  );

  // Animated Styles for HUD Overlays
  const volumeHUDStyle = useAnimatedStyle(() => ({
    opacity: volumeHUDVisible.value,
    transform: [{ scale: withSpring(volumeHUDVisible.value ? 1 : 0.8) }],
  }));

  const brightnessHUDStyle = useAnimatedStyle(() => ({
    opacity: brightnessHUDVisible.value,
    transform: [{ scale: withSpring(brightnessHUDVisible.value ? 1 : 0.8) }],
  }));

  const seekHUDStyle = useAnimatedStyle(() => ({
    opacity: seekHUDVisible.value,
    transform: [{ scale: withSpring(seekHUDVisible.value ? 1 : 0.8) }],
  }));

  const volumeBarStyle = useAnimatedStyle(() => ({
    height: `${volumeLevel.value * 100}%`,
  }));

  const brightnessBarStyle = useAnimatedStyle(() => ({
    height: `${brightnessLevel.value * 100}%`,
  }));

  return (
    <GestureDetector gesture={composedGestures}>
      <View style={styles.container}>
        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls={false}
          allowsPictureInPicture
          startsPictureInPictureAutomatically
        />

        {/* Volume HUD (Right Side) */}
        <Animated.View style={[styles.hudContainer, styles.hudRight, volumeHUDStyle]} pointerEvents="none">
          <Text style={styles.hudIcon}>🔊</Text>
          <View style={styles.barBackground}>
            <Animated.View style={[styles.barFill, volumeBarStyle]} />
          </View>
          <Text style={styles.hudText}>{Math.round(volumeLevel.value * 100)}%</Text>
        </Animated.View>

        {/* Brightness HUD (Left Side) */}
        <Animated.View style={[styles.hudContainer, styles.hudLeft, brightnessHUDStyle]} pointerEvents="none">
          <Text style={styles.hudIcon}>☀️</Text>
          <View style={styles.barBackground}>
            <Animated.View style={[styles.barFill, brightnessBarStyle]} />
          </View>
          <Text style={styles.hudText}>{Math.round(brightnessLevel.value * 100)}%</Text>
        </Animated.View>

        {/* Seek HUD (Center Overlay) */}
        <Animated.View style={[styles.seekHUDContainer, seekHUDStyle]} pointerEvents="none">
          <Text style={styles.seekHUDText}>
            {seekOffsetSeconds.value >= 0 ? `+${seekOffsetSeconds.value}s` : `${seekOffsetSeconds.value}s`}
          </Text>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1 },
  hudContainer: {
    position: 'absolute',
    top: '30%',
    width: 60,
    height: 160,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    zIndex: 20,
  },
  hudRight: { right: 24 },
  hudLeft: { left: 24 },
  hudIcon: { fontSize: 20, color: '#fff' },
  hudText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  barBackground: {
    width: 6,
    height: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  seekHUDContainer: {
    position: 'absolute',
    alignSelf: 'center',
    top: '45%',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 25,
  },
  seekHUDText: {
    color: '#3b82f6',
    fontSize: 22,
    fontWeight: '800',
  },
});
