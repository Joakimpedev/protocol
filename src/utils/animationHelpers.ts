/**
 * Shared animation utilities for V2 onboarding.
 * Uses React Native's built-in Animated API.
 */

import { Animated, Easing } from 'react-native';

/** Standard spring configs */
export const springConfig = {
  bouncy: { tension: 180, friction: 12 },
  gentle: { tension: 50, friction: 8 },
  snappy: { tension: 300, friction: 10 },
};

/** Fade in from 0 to 1 */
export function fadeIn(
  animValue: Animated.Value,
  duration = 400,
  delay = 0
): Animated.CompositeAnimation {
  return Animated.timing(animValue, {
    toValue: 1,
    duration,
    delay,
    useNativeDriver: true,
    easing: Easing.out(Easing.cubic),
  });
}

/** Slide up from a distance (use with translateY) */
export function slideUp(
  animValue: Animated.Value,
  distance = 30,
  duration = 500,
  delay = 0
): Animated.CompositeAnimation {
  animValue.setValue(distance);
  return Animated.spring(animValue, {
    toValue: 0,
    delay,
    useNativeDriver: true,
    ...springConfig.bouncy,
  });
}

/** Scale in from 0.8 to 1 */
export function scaleIn(
  animValue: Animated.Value,
  duration = 400,
  delay = 0
): Animated.CompositeAnimation {
  animValue.setValue(0.8);
  return Animated.spring(animValue, {
    toValue: 1,
    delay,
    useNativeDriver: true,
    ...springConfig.bouncy,
  });
}

/** Continuous pulse loop (scale 1 -> 1.05 -> 1) */
export function pulseLoop(animValue: Animated.Value): Animated.CompositeAnimation {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(animValue, {
        toValue: 1.05,
        duration: 1200,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.sin),
      }),
      Animated.timing(animValue, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.sin),
      }),
    ])
  );
}

/** Continuous shimmer effect (translateX loop) */
export function shimmer(animValue: Animated.Value, width = 300): Animated.CompositeAnimation {
  return Animated.loop(
    Animated.timing(animValue, {
      toValue: width,
      duration: 1500,
      useNativeDriver: true,
      easing: Easing.linear,
    })
  );
}

/** Staggered entrance: sequential fadeIn + slideUp for a list of element pairs */
export function staggeredEntrance(
  animValues: { opacity: Animated.Value; translateY: Animated.Value }[],
  staggerDelay = 100
): Animated.CompositeAnimation {
  const animations = animValues.map((pair, index) => {
    return Animated.parallel([
      Animated.timing(pair.opacity, {
        toValue: 1,
        duration: 400,
        delay: index * staggerDelay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(pair.translateY, {
        toValue: 0,
        delay: index * staggerDelay,
        useNativeDriver: true,
        ...springConfig.bouncy,
      }),
    ]);
  });
  return Animated.parallel(animations);
}

/** Animate a value for progress bars and sliders (non-native driver for width/layout) */
export function fillBar(
  animValue: Animated.Value,
  toValue: number,
  duration = 800
): Animated.CompositeAnimation {
  return Animated.timing(animValue, {
    toValue,
    duration,
    useNativeDriver: false,
    easing: Easing.out(Easing.cubic),
  });
}
