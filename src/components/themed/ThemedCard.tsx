import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface ThemedCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glow?: boolean;
}

export default function ThemedCard({ children, style, glow }: ThemedCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.md,
          ...theme.shadows.card,
        },
        glow && theme.key === 'pro' && theme.shadows.glow,
        style,
      ]}
    >
      {children}
    </View>
  );
}
