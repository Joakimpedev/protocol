import React, { useRef, useEffect } from 'react';
import { Animated, StyleSheet, StyleProp, ViewStyle, Easing } from 'react-native';
import { colorsV2, spacingV2, borderRadiusV2 } from '../../constants/themeV2';

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

export default function AnimatedCard({
  children,
  delay = 0,
  style,
}: AnimatedCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

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
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        { opacity, transform: [{ translateY }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colorsV2.surface,
    borderRadius: borderRadiusV2.lg,
    borderWidth: 1,
    borderColor: colorsV2.border,
    padding: spacingV2.lg,
    marginBottom: spacingV2.md,
  },
});
