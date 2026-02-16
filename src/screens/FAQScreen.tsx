import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';

export default function FAQScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Support & FAQ</Text>
        <Text style={styles.subtitle}>Common questions answered</Text>

        <View style={styles.contactCard}>
          <Text style={styles.contactLabel}>Need Help?</Text>
          <Text style={styles.contactEmail}>contact@instapush.org</Text>
          <Text style={styles.contactHint}>Subject line: Protocol [your concern]</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Common Questions</Text>

          <View style={styles.faqItem}>
            <Text style={styles.question}>How do I reset my password?</Text>
            <Text style={styles.answer}>
              Tap "Forgot password" on the login screen and enter your email. You'll receive a reset link.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.question}>Where are my photos stored?</Text>
            <Text style={styles.answer}>
              Your progress photos are stored privately on your device only. They are never uploaded to our servers.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.question}>How do I cancel my subscription?</Text>
            <Text style={styles.answer}>
              Go to your device Settings → Apple ID → Subscriptions → Protocol → Cancel.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.question}>I lost my photos after reinstalling the app.</Text>
            <Text style={styles.answer}>
              Photos are stored locally on your device. If you delete the app, photos cannot be recovered.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.question}>How do I delete my account?</Text>
            <Text style={styles.answer}>
              Contact us at the email above and we will delete your account and data.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.question}>How do I connect with friends?</Text>
            <Text style={styles.answer}>
              Go to the Progress tab, find your friend code, and share it. Your friend enters your code in their app.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feedback</Text>
          <Text style={styles.body}>
            Have suggestions? We'd love to hear from you.
          </Text>
          <View style={styles.feedbackCard}>
            <Text style={styles.contactEmail}>contact@instapush.org</Text>
            <Text style={styles.contactHint}>Subject line: Protocol Feedback</Text>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: theme.spacing.lg,
    },
    heading: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 28,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.textMuted,
      marginBottom: theme.spacing.xl,
    },
    contactCard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
    },
    contactLabel: {
      ...theme.typography.label,
      color: theme.colors.textMuted,
      marginBottom: theme.spacing.sm,
    },
    contactEmail: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 16,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    contactHint: {
      ...theme.typography.bodySmall,
      color: theme.colors.textMuted,
    },
    section: {
      marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.lg,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    faqItem: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    question: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    answer: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      lineHeight: 22,
    },
    body: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md,
    },
    feedbackCard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
    },
    bottomPadding: {
      height: theme.spacing.xxl,
    },
  });
}
