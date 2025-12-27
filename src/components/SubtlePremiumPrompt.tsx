/**
 * Subtle Premium Prompt Component
 * 
 * Non-aggressive premium upsell prompts for use in free tier features
 * Should appear before Week 5 paywall to encourage upgrades
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../constants/theme';
import { usePremium } from '../contexts/PremiumContext';
import PaywallModal from './PaywallModal';

interface SubtlePremiumPromptProps {
  message: string;
  ctaText?: string;
  onUpgrade?: () => void;
  variant?: 'default' | 'minimal';
}

export default function SubtlePremiumPrompt({
  message,
  ctaText = 'Go Premium',
  onUpgrade,
  variant = 'default',
}: SubtlePremiumPromptProps) {
  const { isPremium } = usePremium();
  const [showPaywall, setShowPaywall] = React.useState(false);

  // Don't show if user is already premium
  if (isPremium) {
    return null;
  }

  const handlePress = () => {
    if (onUpgrade) {
      onUpgrade();
    }
    setShowPaywall(true);
  };

  if (variant === 'minimal') {
    return (
      <>
        <TouchableOpacity onPress={handlePress} style={styles.minimalContainer}>
          <Text style={styles.minimalText}>{message}</Text>
          <Text style={styles.minimalCta}>{ctaText}</Text>
        </TouchableOpacity>
        <PaywallModal
          visible={showPaywall}
          onClose={() => setShowPaywall(false)}
          subtitle={message}
        />
      </>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity style={styles.button} onPress={handlePress}>
          <Text style={styles.buttonText}>{ctaText}</Text>
        </TouchableOpacity>
      </View>
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        subtitle={message}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    marginTop: spacing.md,
  },
  message: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  button: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  buttonText: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '500',
  },
  minimalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  minimalText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  minimalCta: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '500',
    marginLeft: spacing.md,
    textDecorationLine: 'underline',
  },
});



