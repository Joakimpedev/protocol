import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colorsV2, spacingV2, gradients } from '../../constants/themeV2';

interface V2ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  theme?: 'dark' | 'light';
}

/**
 * Non-linear progress mapping (same approach as V1):
 * First 60% of screens -> 70% of bar progress
 * Last 40% of screens -> remaining 30%
 */
const getProgress = (step: number, total: number): number => {
  const linear = step / total;
  if (linear <= 0.6) {
    return (linear / 0.6) * 0.7;
  }
  return 0.7 + ((linear - 0.6) / 0.4) * 0.3;
};

export default function V2ProgressBar({ currentStep, totalSteps, theme = 'dark' }: V2ProgressBarProps) {
  const insets = useSafeAreaInsets();
  const progress = getProgress(currentStep, totalSteps);
  const animatedProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animatedProgress, {
      toValue: progress,
      tension: 50,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const progressWidth = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const isLight = theme === 'light';

  return (
    <View style={[
      styles.container,
      { paddingTop: insets.top + 8 },
      isLight && styles.containerLight,
    ]}>
      <View style={[styles.track, isLight && styles.trackLight]}>
        <Animated.View style={[styles.fill, { width: progressWidth }]}>
          {isLight ? (
            <View style={styles.fillLight} />
          ) : (
            <LinearGradient
              colors={gradients.primary as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradient}
            />
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacingV2.lg,
    backgroundColor: colorsV2.background,
    zIndex: 1000,
    paddingBottom: spacingV2.sm,
  },
  containerLight: {
    backgroundColor: 'transparent',
  },
  track: {
    height: 3,
    backgroundColor: colorsV2.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  trackLight: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fillLight: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  gradient: {
    flex: 1,
  },
});
