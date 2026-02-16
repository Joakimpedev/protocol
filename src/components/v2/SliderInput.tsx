import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { colorsV2, typographyV2, spacingV2 } from '../../constants/themeV2';

interface SliderInputProps {
  min: number;
  max: number;
  value: number;
  onValueChange: (value: number) => void;
  leftLabel?: string;
  rightLabel?: string;
  step?: number;
}

export default function SliderInput({
  min,
  max,
  value,
  onValueChange,
  leftLabel,
  rightLabel,
  step = 1,
}: SliderInputProps) {
  const lastHapticValue = useRef(value);

  const handleValueChange = (newValue: number) => {
    const stepped = Math.round(newValue / step) * step;
    if (stepped !== lastHapticValue.current) {
      Haptics.selectionAsync();
      lastHapticValue.current = stepped;
    }
    onValueChange(stepped);
  };

  return (
    <View style={styles.container}>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={handleValueChange}
        minimumTrackTintColor={colorsV2.accentOrange}
        maximumTrackTintColor={colorsV2.surfaceLight}
        thumbTintColor="#FFFFFF"
      />

      {(leftLabel || rightLabel) && (
        <View style={styles.labels}>
          <Text style={styles.labelText}>{leftLabel || ''}</Text>
          <Text style={styles.labelText}>{rightLabel || ''}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacingV2.md,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacingV2.sm,
    paddingHorizontal: 4,
  },
  labelText: {
    ...typographyV2.caption,
    color: colorsV2.textMuted,
  },
});
