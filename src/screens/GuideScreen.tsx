import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';

export default function GuideScreen() {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Guide</Text>
      <Text style={styles.body}>Your routine guide will appear here.</Text>
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.md,
    },
    heading: {
      ...theme.typography.heading,
      marginBottom: theme.spacing.md,
    },
    body: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
    },
  });
}
