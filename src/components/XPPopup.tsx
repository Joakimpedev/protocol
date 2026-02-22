/**
 * XPPopup
 * Floating "+X XP" text that pops up and fades upward.
 * Rendered at the screen level (absolute overlay) so it's never clipped by containers.
 * Use a unique `key` prop each time to force remount and restart the animation.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';

interface XPPopupProps {
  amount: number;
  visible: boolean;
  /** Screen-space position where the popup should appear */
  position?: { x: number; y: number };
  onComplete?: () => void;
}

export default function XPPopup({ amount, visible, position, onComplete }: XPPopupProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!visible) return;

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -80,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.2,
          tension: 100,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(700),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onComplete?.();
    });
  }, [visible]);

  if (!visible || !position) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          left: position.x,
          top: position.y,
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
      pointerEvents="none"
    >
      <Text style={[styles.text, amount < 0 && styles.textNegative]}>
        {amount >= 0 ? '+' : ''}{amount} XP
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 9999,
    // Center text on the position point
    marginLeft: -30,
    marginTop: -12,
  },
  text: {
    fontSize: 18,
    fontWeight: '800',
    color: '#A855F7',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  textNegative: {
    color: '#EF4444',
  },
});
