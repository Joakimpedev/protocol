import React, { useRef, useEffect } from 'react';
import { Animated, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '../../constants/themeV2';

interface GradientBackgroundProps {
  colors?: readonly string[];
  style?: StyleProp<ViewStyle>;
  animated?: boolean;
}

export default function GradientBackground({
  colors: customColors,
  style,
  animated = false,
}: GradientBackgroundProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animated) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animated]);

  const gradientColors = customColors || gradients.primary;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { transform: [{ scale: pulseAnim }] },
        style,
      ]}
    >
      <LinearGradient
        colors={gradientColors as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}
