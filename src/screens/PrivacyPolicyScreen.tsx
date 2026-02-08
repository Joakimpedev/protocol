import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, typography, spacing, MONOSPACE_FONT } from '../constants/theme';

export default function PrivacyPolicyScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Privacy Policy</Text>
        <Text style={styles.lastUpdated}>Last Updated: January 2026</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.body}>
            Protocol is a face-focused skincare and exercise routine app. This policy explains what data we collect, how we use it, and your rights.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data We Collect</Text>
          
          <Text style={styles.subsectionTitle}>Account Information</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Email address (required for account creation)</Text>
            <Text style={styles.listItem}>• Password (encrypted, we cannot read it)</Text>
          </View>

          <Text style={styles.subsectionTitle}>Profile Information</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Skin concerns you select (e.g., acne, oily skin, jawline)</Text>
            <Text style={styles.listItem}>• Skin type, budget preference, and time availability</Text>
            <Text style={styles.listItem}>• Friend codes for connecting with other users</Text>
          </View>

          <Text style={styles.subsectionTitle}>Usage Data</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Routine completions and consistency scores</Text>
            <Text style={styles.listItem}>• Which steps you skip or complete</Text>
            <Text style={styles.listItem}>• Skin ratings you provide after progress photos (Worse/Same/Better)</Text>
          </View>

          <Text style={styles.subsectionTitle}>Subscription Information</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Purchase history and subscription status (processed by RevenueCat)</Text>
          </View>

          <Text style={styles.subsectionTitle}>Feedback</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Any feedback you submit through the app</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data We Do NOT Collect</Text>
          
          <Text style={styles.subsectionTitle}>Progress Photos</Text>
          <Text style={styles.body}>
            Your progress photos are stored locally on your device only. They are never uploaded to our servers or any cloud service. If you delete the app, your photos are permanently deleted.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How We Use Your Data</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• To create and manage your account</Text>
            <Text style={styles.listItem}>• To build your personalized routine</Text>
            <Text style={styles.listItem}>• To track your progress and display consistency scores</Text>
            <Text style={styles.listItem}>• To provide weekly summaries and insights</Text>
            <Text style={styles.listItem}>• To process your subscription</Text>
            <Text style={styles.listItem}>• To connect you with friends via friend codes</Text>
            <Text style={styles.listItem}>• To improve the app based on feedback</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Third-Party Services</Text>
          <Text style={styles.body}>We use the following services:</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Firebase (Google) — Authentication and data storage</Text>
            <Text style={styles.listItem}>• RevenueCat — Subscription management</Text>
            <Text style={styles.listItem}>• OpenAI — Processes your text input to classify skin concerns (no personal data is stored by OpenAI)</Text>
          </View>
          <Text style={styles.bodyMuted}>These services have their own privacy policies.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Sharing</Text>
          <Text style={styles.body}>
            We do not sell your data. We do not share your data with advertisers. We only share data with the third-party services listed above as necessary to operate the app.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Retention</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Account data is retained while your account is active</Text>
            <Text style={styles.listItem}>• If you cancel your subscription, your data is retained for 6 months</Text>
            <Text style={styles.listItem}>• You can request deletion of your account and data at any time</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rights</Text>
          <Text style={styles.body}>You can:</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Request a copy of your data</Text>
            <Text style={styles.listItem}>• Request deletion of your account and data</Text>
            <Text style={styles.listItem}>• Update your information within the app</Text>
          </View>
          <Text style={styles.bodyMuted}>To make a request, contact us at: contact@instapush.org</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Children's Privacy</Text>
          <Text style={styles.body}>
            Protocol is intended for users aged 16 and older. We do not knowingly collect data from children under 16.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Changes to This Policy</Text>
          <Text style={styles.body}>
            We may update this policy. Continued use of the app after changes constitutes acceptance.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <Text style={styles.body}>For privacy questions or requests:</Text>
          <Text style={styles.contactEmail}>contact@instapush.org</Text>
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
  lastUpdated: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subsectionTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  bodyMuted: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  list: {
    marginLeft: spacing.sm,
  },
  listItem: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  contactEmail: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 14,
    color: colors.text,
    marginTop: spacing.sm,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});

