import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, MONOSPACE_FONT } from '../constants/theme';

interface ProgressHeaderProps {
  currentScreenIndex: number;
  totalScreens: number;
}

/**
 * Non-linear progress mapping:
 * First 60% of screens → 70% of progress bar
 * Last 40% of screens → remaining 30% of progress bar
 *
 * This makes the bar feel faster early (builds momentum)
 * and slower late (sets expectation for important final steps)
 */
const getProgressPercentage = (screenIndex: number, totalScreens: number): number => {
  const linearProgress = screenIndex / totalScreens;

  if (linearProgress <= 0.6) {
    // First 60% of screens: map to 0-70% of bar
    return (linearProgress / 0.6) * 0.7;
  } else {
    // Last 40% of screens: map to 70-100% of bar
    return 0.7 + ((linearProgress - 0.6) / 0.4) * 0.3;
  }
};

export const ProgressHeader: React.FC<ProgressHeaderProps> = ({
  currentScreenIndex,
  totalScreens
}) => {
  const insets = useSafeAreaInsets();
  const progress = getProgressPercentage(currentScreenIndex, totalScreens);
  const animatedProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animatedProgress, {
      toValue: progress,
      tension: 50,
      friction: 8,
      useNativeDriver: false, // Can't use native driver for width
    }).start();
  }, [progress]);

  const progressWidth = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.progressBarBg}>
        <Animated.View
          style={[
            styles.progressBarFill,
            { width: progressWidth }
          ]}
        />
      </View>
      <Text style={styles.percentText}>
        {Math.round(progress * 100)}%
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    zIndex: 1000,
    paddingBottom: spacing.sm,
  },
  progressBarBg: {
    height: 3,
    backgroundColor: colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  percentText: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
});
