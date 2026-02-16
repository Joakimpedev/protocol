import React, { useRef } from 'react';
import { TouchableOpacity, Animated, Text, View, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colorsV2, typographyV2, spacingV2, borderRadiusV2 } from '../../constants/themeV2';

interface SelectionCardProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: string;
  disabled?: boolean;
}

export default function SelectionCard({
  label,
  selected,
  onPress,
  icon,
  disabled = false,
}: SelectionCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} disabled={disabled} activeOpacity={1}>
      <Animated.View
        style={[
          { transform: [{ scale: scaleAnim }] },
          disabled && styles.disabled,
        ]}
      >
        <View
          style={[
            styles.card,
            selected && styles.cardSelected,
          ]}
        >
          {icon ? <Text style={styles.icon}>{icon}</Text> : null}
          <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
          {selected && (
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorsV2.surface,
    borderWidth: 1,
    borderColor: colorsV2.border,
    borderLeftWidth: 1,
    borderLeftColor: colorsV2.border,
    borderRadius: borderRadiusV2.lg,
    paddingVertical: spacingV2.md,
    paddingHorizontal: spacingV2.lg,
    marginBottom: spacingV2.sm,
  },
  cardSelected: {
    borderColor: colorsV2.border,
    borderLeftWidth: 3,
    borderLeftColor: colorsV2.accentOrange,
    shadowColor: colorsV2.accentOrange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  icon: {
    fontSize: 20,
    marginRight: spacingV2.md,
  },
  label: {
    ...typographyV2.body,
    flex: 1,
    color: colorsV2.textSecondary,
  },
  labelSelected: {
    color: colorsV2.textPrimary,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colorsV2.accentOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
});
