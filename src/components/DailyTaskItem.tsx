/**
 * DailyTaskItem
 * Checkbox + icon + task name for daily tasks with haptic feedback and XP popup
 */

import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';

interface DailyTaskItemProps {
  id: string;
  name: string;
  icon?: string;
  iconColor?: string;
  completed: boolean;
  onToggle: (id: string) => void;
  onLongPress?: (id: string) => void;
  subtitle?: string;
  xpAmount?: number;
  /** Called when XP is earned, with amount and screen position for the flying popup */
  onXPEarned?: (amount: number, position: { x: number; y: number }) => void;
}

export default function DailyTaskItem({
  id,
  name,
  icon,
  iconColor,
  completed,
  onToggle,
  onLongPress,
  subtitle,
  xpAmount = 10,
  onXPEarned,
}: DailyTaskItemProps) {
  const theme = useTheme();
  const isPro = theme.key === 'pro';
  const accentColor = isPro ? '#A855F7' : '#22C55E';
  const checkScale = useRef(new Animated.Value(1)).current;
  const itemPosition = useRef<{ x: number; y: number; w: number }>({ x: 0, y: 0, w: 0 });

  const handlePress = useCallback(() => {
    if (!completed) {
      // Haptic feedback on completion
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      // Checkbox bounce animation
      Animated.sequence([
        Animated.timing(checkScale, { toValue: 1.3, duration: 100, useNativeDriver: true }),
        Animated.spring(checkScale, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }),
      ]).start();

      // Fire XP earned — position at top of the task item
      if (onXPEarned && xpAmount > 0) {
        const pos = itemPosition.current;
        onXPEarned(xpAmount, { x: pos.x + pos.w / 2, y: pos.y });
      }
    }
    onToggle(id);
  }, [completed, id, onToggle, onXPEarned, xpAmount]);

  return (
    <View
      style={{ position: 'relative' }}
      onLayout={(e) => {
        (e.target as any).measureInWindow?.((x: number, y: number, w: number) => {
          itemPosition.current = { x, y, w };
        });
      }}
    >
      <TouchableOpacity
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.surface,
            borderColor: completed ? accentColor : theme.colors.border,
            opacity: completed ? 0.7 : 1,
          },
        ]}
        onPress={handlePress}
        onLongPress={() => onLongPress?.(id)}
        activeOpacity={0.7}
      >
        <Animated.View
          style={[
            styles.checkbox,
            {
              borderColor: completed ? accentColor : theme.colors.textSecondary,
              backgroundColor: completed ? accentColor : 'transparent',
              transform: [{ scale: checkScale }],
            },
          ]}
        >
          {completed && <Text style={styles.checkmark}>{'\u2713'}</Text>}
        </Animated.View>
        {icon ? (
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name={icon as any} size={20} color="#C084FC" />
          </View>
        ) : null}
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.name,
              {
                color: completed ? theme.colors.textSecondary : theme.colors.text,
                textDecorationLine: completed ? 'line-through' : 'none',
              },
            ]}
            numberOfLines={1}
          >
            {name}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {xpAmount > 0 && (
          <Text style={[styles.xpText, { opacity: completed ? 0.4 : 0.6 }]}>
            +{xpAmount} XP
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 6,
    elevation: 5,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  xpText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A855F7',
    marginLeft: 8,
  },
});
