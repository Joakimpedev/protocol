import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';

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
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
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

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.background,
      zIndex: 1000,
      paddingBottom: theme.spacing.sm,
    },
    progressBarBg: {
      height: 3,
      backgroundColor: theme.colors.surface,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: theme.colors.accent,
      borderRadius: 2,
    },
    percentText: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 10,
      color: theme.colors.textMuted,
      textAlign: 'right',
      marginTop: 4,
    },
  });
}
