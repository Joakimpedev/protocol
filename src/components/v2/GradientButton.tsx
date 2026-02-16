import React, { useRef } from 'react';
import { TouchableOpacity, Animated, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colorsV2, typographyV2, spacingV2, borderRadiusV2, gradients, shadows } from '../../constants/themeV2';

type Variant = 'primary' | 'secondary' | 'outline';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
  hapticStyle?: Haptics.ImpactFeedbackStyle;
  colors?: readonly string[];
}

export default function GradientButton({
  title,
  onPress,
  disabled = false,
  variant = 'primary',
  style,
  hapticStyle = Haptics.ImpactFeedbackStyle.Light,
  colors: customColors,
}: GradientButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Haptics.impactAsync(hapticStyle);
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

  const gradientColors = customColors || gradients.primary;

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
            styles.outline,
            disabled && styles.disabled,
            { transform: [{ scale: scaleAnim }] },
            style,
          ]}
        >
          <Text style={styles.outlineText}>{title}</Text>
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
            styles.secondary,
            disabled && styles.disabled,
            { transform: [{ scale: scaleAnim }] },
            style,
          ]}
        >
          <Text style={styles.secondaryText}>{title}</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  }

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
          styles.primaryGlow,
          disabled && styles.disabled,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <LinearGradient
          colors={gradientColors as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.primary, style]}
        >
          <Text style={styles.primaryText}>{title}</Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primaryGlow: {
    ...shadows.glow,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    borderRadius: borderRadiusV2.pill,
  },
  primary: {
    paddingVertical: 18,
    paddingHorizontal: spacingV2.xl,
    borderRadius: borderRadiusV2.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    ...typographyV2.body,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondary: {
    paddingVertical: spacingV2.md,
    paddingHorizontal: spacingV2.xl,
    borderRadius: borderRadiusV2.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colorsV2.surfaceLight,
  },
  secondaryText: {
    ...typographyV2.body,
    fontSize: 17,
    fontWeight: '600',
    color: colorsV2.textPrimary,
  },
  outline: {
    paddingVertical: spacingV2.md,
    paddingHorizontal: spacingV2.xl,
    borderRadius: borderRadiusV2.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colorsV2.border,
  },
  outlineText: {
    ...typographyV2.body,
    fontSize: 17,
    fontWeight: '600',
    color: colorsV2.textSecondary,
  },
  disabled: {
    opacity: 0.5,
  },
});
