import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../constants/theme';

export default function GuideScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Guide</Text>
      <Text style={styles.body}>Your routine guide will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  heading: {
    ...typography.heading,
    marginBottom: spacing.md,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
  },
});





