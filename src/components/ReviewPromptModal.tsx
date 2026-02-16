/**
 * Review Prompt Modal Component
 *
 * Asks users to leave an App Store review at the right moment
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';

interface ReviewPromptModalProps {
  visible: boolean;
  onLeaveReview: () => void;
  onNotNow: () => void;
}

export default function ReviewPromptModal({
  visible,
  onLeaveReview,
  onNotNow,
}: ReviewPromptModalProps) {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onNotNow}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>We're glad you're seeing progress.</Text>
          <Text style={styles.body}>
            Would you mind leaving a review? Protocol is a small team, and it helps others find us.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onLeaveReview}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Leave a review</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onNotNow}
            activeOpacity={0.6}
          >
            <Text style={styles.secondaryButtonText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    modal: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      width: '100%',
      maxWidth: 400,
    },
    title: {
      ...theme.typography.headingSmall,
      marginBottom: theme.spacing.md,
      textAlign: 'center',
    },
    body: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xl,
      textAlign: 'center',
      lineHeight: 22,
    },
    primaryButton: {
      backgroundColor: theme.colors.accent,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    primaryButtonText: {
      ...theme.typography.body,
      color: '#000000',
      fontWeight: '600',
    },
    secondaryButton: {
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
    },
    secondaryButtonText: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
    },
  });
}
