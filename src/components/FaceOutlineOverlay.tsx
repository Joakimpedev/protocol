/**
 * Face Outline Overlay Component
 *
 * Displays a face outline guide overlay on top of camera preview
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes/types';

export default function FaceOutlineOverlay() {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      {/* Face outline oval */}
      <View style={styles.faceOutline}>
        {/* Eye level guide line */}
        <View style={styles.eyeGuide} />

        {/* Center vertical line */}
        <View style={styles.centerLine} />
      </View>
    </View>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceOutline: {
    width: 240,
    height: 320,
    borderRadius: 120,
    borderWidth: 2,
    borderColor: theme.colors.text,
    borderStyle: 'dashed',
    opacity: 0.3,
    position: 'relative',
  },
  eyeGuide: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: theme.colors.text,
    opacity: 0.3,
  },
  centerLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 1,
    backgroundColor: theme.colors.text,
    opacity: 0.3,
  },
});
