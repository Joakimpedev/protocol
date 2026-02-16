import React, { useRef } from 'react';
import { TouchableOpacity, Animated, Text, View, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';

type Variant = 'primary' | 'secondary' | 'outline';

interface ThemedButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
}

export default function ThemedButton({
  title,
  onPress,
  disabled = false,
  variant = 'primary',
  style,
}: ThemedButtonProps) {
  const theme = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const isPro = theme.key === 'pro';
  const br = theme.borderRadius.pill;

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={1}
      >
        <Animated.View
          style={[
            {
              paddingVertical: theme.spacing.md,
              paddingHorizontal: theme.spacing.xl,
              borderRadius: br,
              alignItems: 'center' as const,
              justifyContent: 'center' as const,
              borderWidth: 1.5,
              borderColor: theme.colors.border,
              opacity: disabled ? 0.5 : 1,
              transform: [{ scale: scaleAnim }],
            },
            style,
          ]}
        >
          <Text
            style={{
              ...theme.typography.body,
              fontSize: 17,
              fontWeight: '600',
              color: theme.colors.textSecondary,
            }}
          >
            {title}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  if (variant === 'secondary') {
    return (
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={1}
      >
        <Animated.View
          style={[
            {
              paddingVertical: theme.spacing.md,
              paddingHorizontal: theme.spacing.xl,
              borderRadius: br,
              alignItems: 'center' as const,
              justifyContent: 'center' as const,
              backgroundColor: theme.colors.surfaceLight,
              opacity: disabled ? 0.5 : 1,
              transform: [{ scale: scaleAnim }],
            },
            style,
          ]}
        >
          <Text
            style={{
              ...theme.typography.body,
              fontSize: 17,
              fontWeight: '600',
              color: theme.colors.text,
            }}
          >
            {title}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  // Primary variant
  if (isPro) {
    return (
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={1}
      >
        <Animated.View
          style={[
            {
              ...theme.shadows.glow,
              shadowOpacity: 0.5,
              shadowRadius: 20,
              borderRadius: br,
              opacity: disabled ? 0.5 : 1,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={theme.gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              {
                paddingVertical: 18,
                paddingHorizontal: theme.spacing.xl,
                borderRadius: br,
                alignItems: 'center' as const,
                justifyContent: 'center' as const,
              },
              style,
            ]}
          >
            <Text
              style={{
                ...theme.typography.body,
                fontSize: 18,
                fontWeight: '700',
                color: '#FFFFFF',
              }}
            >
              {title}
            </Text>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  // Classic primary - solid color
  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          {
            paddingVertical: theme.spacing.md,
            paddingHorizontal: theme.spacing.xl,
            borderRadius: br,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.accent,
            opacity: disabled ? 0.5 : 1,
            transform: [{ scale: scaleAnim }],
          },
          style,
        ]}
      >
        <Text
          style={{
            ...theme.typography.body,
            fontSize: 16,
            fontWeight: '600',
            color: theme.colors.accent,
          }}
        >
          {title}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}
