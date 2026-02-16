import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Theme } from '../../constants/themes/types';

const BRACKET_SIZE = 28;
const BRACKET_THICKNESS = 2;

// Facial landmark dots at percentage-based positions (x%, y%)
const LANDMARKS = [
  { x: 35, y: 32 },  // left eye
  { x: 65, y: 32 },  // right eye
  { x: 50, y: 45 },  // nose bridge
  { x: 50, y: 55 },  // nose tip
  { x: 38, y: 65 },  // left mouth
  { x: 62, y: 65 },  // right mouth
  { x: 50, y: 68 },  // chin center
  { x: 28, y: 48 },  // left cheek
  { x: 72, y: 48 },  // right cheek
];

interface FaceScanOverlayProps {
  animated?: boolean;
}

export default function FaceScanOverlay({ animated = true }: FaceScanOverlayProps) {
  const theme = useTheme();
  const scanColor = theme.colors.accent;
  const styles = useMemo(() => getStyles(scanColor), [scanColor]);
  const scanLineY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineY, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.quad),
        }),
        Animated.timing(scanLineY, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.quad),
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animated]);

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Grid lines at 25/50/75% */}
      <View style={[styles.gridLine, { top: '25%' }]} />
      <View style={[styles.gridLine, { top: '50%' }]} />
      <View style={[styles.gridLine, { top: '75%' }]} />
      <View style={[styles.gridLineV, { left: '25%' }]} />
      <View style={[styles.gridLineV, { left: '50%' }]} />
      <View style={[styles.gridLineV, { left: '75%' }]} />

      {/* Vertical symmetry line */}
      <View style={styles.symmetryLine} />

      {/* Corner brackets */}
      <View style={[styles.bracket, styles.bracketTL]} />
      <View style={[styles.bracket, styles.bracketTR]} />
      <View style={[styles.bracket, styles.bracketBL]} />
      <View style={[styles.bracket, styles.bracketBR]} />

      {/* Facial landmark dots */}
      {LANDMARKS.map((point, i) => (
        <View
          key={i}
          style={[
            styles.landmark,
            { left: `${point.x}%`, top: `${point.y}%` },
          ]}
        />
      ))}

      {/* Animated scan line */}
      {animated && (
        <Animated.View
          style={[
            styles.scanLine,
            {
              transform: [
                {
                  translateY: scanLineY.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 400],
                  }),
                },
              ],
            },
          ]}
        />
      )}
    </View>
  );
}

const getStyles = (color: string) => StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: color,
    opacity: 0.08,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: color,
    opacity: 0.08,
  },
  symmetryLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: color,
    opacity: 0.2,
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  bracket: {
    position: 'absolute',
    width: BRACKET_SIZE,
    height: BRACKET_SIZE,
    borderColor: color,
  },
  bracketTL: {
    top: 8,
    left: 8,
    borderTopWidth: BRACKET_THICKNESS,
    borderLeftWidth: BRACKET_THICKNESS,
    borderTopLeftRadius: 4,
  },
  bracketTR: {
    top: 8,
    right: 8,
    borderTopWidth: BRACKET_THICKNESS,
    borderRightWidth: BRACKET_THICKNESS,
    borderTopRightRadius: 4,
  },
  bracketBL: {
    bottom: 8,
    left: 8,
    borderBottomWidth: BRACKET_THICKNESS,
    borderLeftWidth: BRACKET_THICKNESS,
    borderBottomLeftRadius: 4,
  },
  bracketBR: {
    bottom: 8,
    right: 8,
    borderBottomWidth: BRACKET_THICKNESS,
    borderRightWidth: BRACKET_THICKNESS,
    borderBottomRightRadius: 4,
  },
  landmark: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: color,
    opacity: 0.6,
    marginLeft: -2,
    marginTop: -2,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    backgroundColor: color,
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
});
