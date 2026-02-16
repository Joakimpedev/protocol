import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colorsV2, typographyV2, spacingV2, borderRadiusV2 } from '../../constants/themeV2';

interface RatingCardProps {
  category: string;
  score: number;
  maxScore?: number;
  delay?: number;
}

function getScoreColor(score: number): string {
  if (score >= 7) return colorsV2.success;
  if (score >= 5) return colorsV2.warning;
  return colorsV2.danger;
}

function getScoreLabel(score: number): string {
  if (score >= 7) return 'HIGH';
  if (score >= 5) return 'MID';
  return 'LOW';
}

export default function RatingCard({
  category,
  score,
  maxScore = 10,
  delay = 0,
}: RatingCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const barWidth = useRef(new Animated.Value(0)).current;

  const fraction = score / maxScore;
  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        useNativeDriver: true,
        tension: 180,
        friction: 12,
      }),
    ]).start();

    // Bar fill (non-native for width)
    Animated.timing(barWidth, {
      toValue: fraction,
      duration: 800,
      delay: delay + 200,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, []);

  const barWidthPercent = barWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[styles.card, { opacity, transform: [{ translateY }] }]}
    >
      <View style={styles.header}>
        <Text style={styles.category}>{category}</Text>
        <View style={styles.scoreContainer}>
          <Text style={[styles.score, { color }]}>
            {score}/{maxScore}
          </Text>
          <View style={[styles.badge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.badgeText, { color }]}>{label}</Text>
          </View>
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { width: barWidthPercent, backgroundColor: color }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colorsV2.surface,
    borderRadius: borderRadiusV2.lg,
    borderWidth: 1,
    borderColor: colorsV2.border,
    padding: spacingV2.md,
    marginBottom: spacingV2.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacingV2.sm,
  },
  category: {
    ...typographyV2.bodySmall,
    fontWeight: '600',
    color: colorsV2.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingV2.sm,
  },
  score: {
    ...typographyV2.body,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  badge: {
    paddingHorizontal: spacingV2.sm,
    paddingVertical: 2,
    borderRadius: borderRadiusV2.sm,
  },
  badgeText: {
    ...typographyV2.caption,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colorsV2.border,
    marginBottom: spacingV2.sm,
  },
  barTrack: {
    height: 6,
    backgroundColor: colorsV2.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
});
