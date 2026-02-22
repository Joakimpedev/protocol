/**
 * DailyProgressBar
 * "TODAY - X XP" with colored progress bar tracking daily XP earned.
 * Updates instantly via optimistic XP state from TodayScreen.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface DailyProgressBarProps {
  /** Today's XP earned so far (can be negative from penalties) */
  dailyXP: number;
  /** Daily XP goal */
  dailyGoal: number;
}

export default function DailyProgressBar({ dailyXP, dailyGoal }: DailyProgressBarProps) {
  const theme = useTheme();
  const isPro = theme.key === 'pro';
  const animatedWidth = useRef(new Animated.Value(0)).current;

  const clampedXP = Math.max(0, dailyXP);
  const progress = dailyGoal > 0 ? Math.min(clampedXP / dailyGoal, 1) : 0;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const barColor = isPro ? '#A855F7' : '#22C55E';
  const barBg = isPro ? 'rgba(168, 85, 247, 0.12)' : 'rgba(34, 197, 94, 0.12)';
  const goalReached = clampedXP >= dailyGoal && dailyGoal > 0;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          TODAY
        </Text>
        <Text style={[styles.count, { color: goalReached ? barColor : theme.colors.text }]}>
          {clampedXP}/{dailyGoal} XP
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
    // No margins — parent container handles spacing
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  count: {
    fontSize: 14,
    fontWeight: '600',
  },
  barBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
});
