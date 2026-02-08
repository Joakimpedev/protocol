import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, typography, spacing, MONOSPACE_FONT } from '../constants/theme';

export default function FAQScreen({ navigation }: any) {
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  heading: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 28,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  contactCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  contactLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  contactEmail: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  contactHint: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  faqItem: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  question: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  answer: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  feedbackCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.lg,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});

