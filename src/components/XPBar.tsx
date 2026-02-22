/**
 * XPBar
 * Animated progress bar showing XP toward next level
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface XPBarProps {
  currentXP: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  level: number;
}

export default function XPBar({ currentXP, xpForCurrentLevel, xpForNextLevel, level }: XPBarProps) {
  const theme = useTheme();
  const isPro = theme.key === 'pro';
  const animatedWidth = useRef(new Animated.Value(0)).current;

  const xpIntoLevel = currentXP - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const progress = xpNeeded > 0 ? Math.min(xpIntoLevel / xpNeeded, 1) : 1;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const barColor = isPro ? '#A855F7' : '#22C55E';
  const barBg = isPro ? 'rgba(168, 85, 247, 0.15)' : 'rgba(34, 197, 94, 0.15)';

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.xpText, { color: theme.colors.textSecondary }]}>
          {xpNeeded > 0 ? `${currentXP.toLocaleString()} / ${xpForNextLevel.toLocaleString()} XP` : 'MAX'}
        </Text>
      </View>
      <View style={[styles.barBackground, { backgroundColor: barBg }]}>
        <Animated.View
          style={[
            styles.barFill,
            {
              backgroundColor: barColor,
              width: animatedWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 6,
  },
  xpText: {
    fontSize: 12,
    fontWeight: '500',
  },
  barBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
});
