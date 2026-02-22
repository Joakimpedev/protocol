/**
 * AvatarDisplay
 * Shows level-appropriate placeholder with level name and browse arrows
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import { getLevelDefinition } from '../services/xpService';
import { LEVELS, MAX_LEVEL } from '../data/levels';

interface AvatarDisplayProps {
  level: number;
  levelName: string;
}

// Level-based gradient colors
const LEVEL_GRADIENTS: Record<number, [string, string]> = {
  1: ['#6B7280', '#4B5563'],
  2: ['#3B82F6', '#2563EB'],
  3: ['#10B981', '#059669'],
  4: ['#8B5CF6', '#7C3AED'],
  5: ['#F59E0B', '#D97706'],
  6: ['#EF4444', '#DC2626'],
  7: ['#EC4899', '#DB2777'],
  8: ['#14B8A6', '#0D9488'],
  9: ['#F97316', '#EA580C'],
  10: ['#6366F1', '#4F46E5'],
};

function getGradientForLevel(level: number): [string, string] {
  const key = ((level - 1) % 10) + 1;
  return LEVEL_GRADIENTS[key] || LEVEL_GRADIENTS[1];
}

export default function AvatarDisplay({ level, levelName }: AvatarDisplayProps) {
  const theme = useTheme();
  const gradient = getGradientForLevel(level);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.avatarBox}
      >
        <Text style={styles.levelNumber}>LV</Text>
        <Text style={styles.levelBig}>{level}</Text>
      </LinearGradient>
      <Text style={[styles.levelName, { color: theme.colors.text }]}>
        {levelName.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 16,
  },
  avatarBox: {
    width: 140,
    height: 140,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
  },
  levelBig: {
    fontSize: 56,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: -4,
  },
  levelName: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 12,
  },
});
