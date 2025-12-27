/**
 * Review Prompt Modal Component
 * 
 * Asks users to leave an App Store review at the right moment
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { colors, typography, spacing } from '../constants/theme';

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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modal: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    ...typography.headingSmall,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: colors.buttonAccent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryButtonText: {
    ...typography.body,
    color: '#000000',
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});


