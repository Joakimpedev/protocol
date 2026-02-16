/**
 * Reusable hook for screen entrance animations.
 * Returns an array of animated style objects ready to apply to elements.
 */

import { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

interface EntranceAnimStyle {
  opacity: Animated.Value;
  transform: { translateY: Animated.Value }[];
}

/**
 * Creates staggered entrance animations for screen elements.
 * Each element gets a fadeIn + slideUp combo, triggered on mount.
 *
 * Usage:
 *   const anims = useScreenEntrance(3);
 *   <Animated.View style={{ opacity: anims[0].opacity, transform: anims[0].transform }}>
 */
export function useScreenEntrance(
  count: number,
  staggerDelay = 100,
  initialDelay = 100
): EntranceAnimStyle[] {
  const animsRef = useRef<EntranceAnimStyle[]>(
    Array.from({ length: count }, () => ({
      opacity: new Animated.Value(0),
      transform: [{ translateY: new Animated.Value(20) }],
    }))
  );

  useEffect(() => {
    const anims = animsRef.current;
    const animations = anims.map((anim, index) => {
      const delay = initialDelay + index * staggerDelay;
      return Animated.parallel([
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 400,
          delay,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.spring(anim.transform[0].translateY, {
          toValue: 0,
          delay,
          useNativeDriver: true,
          tension: 180,
          friction: 12,
        }),
      ]);
    });

    Animated.parallel(animations).start();
  }, []);

  return animsRef.current;
}
