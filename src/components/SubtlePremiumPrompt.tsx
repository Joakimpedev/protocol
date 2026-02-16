/**
 * Subtle Premium Prompt Component
 *
 * Non-aggressive premium upsell prompts for use in free tier features
 * Should appear before Week 5 paywall to encourage upgrades
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';
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
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
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

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.surface,
      marginTop: theme.spacing.md,
    },
    message: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
    },
    button: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.sm,
      alignSelf: 'flex-start',
    },
    buttonText: {
      ...theme.typography.bodySmall,
      color: theme.colors.text,
      fontWeight: '500',
    },
    minimalContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm,
    },
    minimalText: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    minimalCta: {
      ...theme.typography.bodySmall,
      color: theme.colors.text,
      fontWeight: '500',
      marginLeft: theme.spacing.md,
      textDecorationLine: 'underline',
    },
  });
}
