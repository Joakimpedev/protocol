/**
 * StreakBadge
 * Fire icon + streak count
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface StreakBadgeProps {
  streak: number;
}

export default function StreakBadge({ streak }: StreakBadgeProps) {
  const theme = useTheme();

  if (streak <= 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={styles.fire}>{'\u{1F525}'}</Text>
      <Text style={[styles.count, { color: theme.colors.text }]}>{streak}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  fire: {
    fontSize: 16,
  },
  count: {
    fontSize: 14,
    fontWeight: '700',
  },
});
