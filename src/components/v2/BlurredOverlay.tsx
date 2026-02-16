import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { colorsV2 } from '../../constants/themeV2';

interface BlurredOverlayProps {
  children: React.ReactNode;
  intensity?: number;
  style?: StyleProp<ViewStyle>;
}

export default function BlurredOverlay({
  children,
  intensity = 20,
  style,
}: BlurredOverlayProps) {
  return (
    <View style={[styles.container, style]}>
      {children}
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.overlay]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 16,
  },
  overlay: {
    backgroundColor: 'rgba(13, 13, 15, 0.3)',
  },
});
