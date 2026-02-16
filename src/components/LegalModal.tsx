import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LegalModalProps {
  visible: boolean;
  onClose: () => void;
  type: 'privacy' | 'terms' | 'faq';
}

export default function LegalModal({ visible, onClose, type }: LegalModalProps) {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  const getTitle = () => {
    switch (type) {
      case 'privacy':
        return 'Privacy Policy';
      case 'terms':
        return 'Terms of Use';
      case 'faq':
        return 'Support & FAQ';
      default:
        return '';
    }
  };

  const getContent = () => {
    switch (type) {
      case 'privacy':
        return <PrivacyPolicyContent styles={styles} />;
      case 'terms':
        return <TermsOfUseContent styles={styles} />;
      case 'faq':
        return <FAQContent styles={styles} />;
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, {
          marginTop: insets.top + theme.spacing.lg,
          marginBottom: insets.bottom + theme.spacing.lg,
          height: SCREEN_HEIGHT * 0.85,
        }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{getTitle()}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {getContent()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function PrivacyPolicyContent({ styles }: { styles: ReturnType<typeof getStyles> }) {
  return (
    <>
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
    </>
  );
}

function TermsOfUseContent({ styles }: { styles: ReturnType<typeof getStyles> }) {
  return (
    <>
      <Text style={styles.lastUpdated}>Last Updated: January 2026</Text>

      <View style={styles.section}>
        <Text style={styles.sectionNumber}>1</Text>
        <Text style={styles.sectionTitle}>Acceptance of Terms</Text>
        <Text style={styles.body}>
          By downloading, accessing, or using Protocol, you agree to be bound by these Terms of Use. If you do not agree to these terms, do not use the app.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionNumber}>2</Text>
        <Text style={styles.sectionTitle}>Description of Service</Text>
        <Text style={styles.body}>
          Protocol is a mobile application that provides personalized skincare routines and facial exercise guidance for men. The app allows users to:
        </Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>• Receive customized skincare and exercise routines based on their input</Text>
          <Text style={styles.listItem}>• Track daily routine completion</Text>
          <Text style={styles.listItem}>• Take and store progress photos locally on their device</Text>
          <Text style={styles.listItem}>• Subscribe for additional premium features</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionNumber}>3</Text>
        <Text style={styles.sectionTitle}>Not Medical Advice</Text>
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            Protocol is for informational and educational purposes only. The routines, exercises, and product recommendations provided are not medical advice and should not be treated as such.
          </Text>
        </View>
        <View style={styles.list}>
          <Text style={styles.listItem}>• Protocol is not a substitute for professional medical advice, diagnosis, or treatment</Text>
          <Text style={styles.listItem}>• Always consult a qualified dermatologist or healthcare provider for serious skin conditions</Text>
          <Text style={styles.listItem}>• If you experience irritation, allergic reactions, or any adverse effects, discontinue use and seek medical attention</Text>
          <Text style={styles.listItem}>• Results vary by individual and are not guaranteed</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionNumber}>4</Text>
        <Text style={styles.sectionTitle}>Eligibility</Text>
        <Text style={styles.body}>
          You must be at least 16 years old to use Protocol. By using the app, you represent that you meet this age requirement.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionNumber}>5</Text>
        <Text style={styles.sectionTitle}>Account Responsibilities</Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>• You are responsible for maintaining the confidentiality of your account credentials</Text>
          <Text style={styles.listItem}>• You are responsible for all activity that occurs under your account</Text>
          <Text style={styles.listItem}>• You agree to provide accurate and complete information when creating your account</Text>
          <Text style={styles.listItem}>• You must notify us immediately of any unauthorized use of your account</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionNumber}>6</Text>
        <Text style={styles.sectionTitle}>Subscriptions and Payments</Text>

        <Text style={styles.subsectionTitle}>Billing</Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>• Subscriptions are billed through Apple's App Store</Text>
          <Text style={styles.listItem}>• Payment is charged to your Apple ID account at confirmation of purchase</Text>
          <Text style={styles.listItem}>• Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period</Text>
        </View>

        <Text style={styles.subsectionTitle}>Cancellation</Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>• You may cancel your subscription at any time through your Apple ID settings</Text>
          <Text style={styles.listItem}>• Go to: Settings → Apple ID → Subscriptions → Protocol → Cancel</Text>
          <Text style={styles.listItem}>• Cancellation takes effect at the end of the current billing period</Text>
          <Text style={styles.listItem}>• No refunds are provided for partial billing periods</Text>
        </View>

        <Text style={styles.subsectionTitle}>Price Changes</Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>• We reserve the right to change subscription prices</Text>
          <Text style={styles.listItem}>• You will be notified of any price changes in advance</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionNumber}>7</Text>
        <Text style={styles.sectionTitle}>Acceptable Use</Text>
        <Text style={styles.body}>You agree not to:</Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>• Use the app for any unlawful purpose</Text>
          <Text style={styles.listItem}>• Attempt to gain unauthorized access to the app or its systems</Text>
          <Text style={styles.listItem}>• Interfere with or disrupt the app's functionality</Text>
          <Text style={styles.listItem}>• Reverse engineer, decompile, or disassemble any part of the app</Text>
          <Text style={styles.listItem}>• Copy, modify, or distribute the app's content without permission</Text>
          <Text style={styles.listItem}>• Use the app to harass, abuse, or harm others</Text>
          <Text style={styles.listItem}>• Create multiple accounts for fraudulent purposes</Text>
          <Text style={styles.listItem}>• Share your account credentials with others</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionNumber}>8</Text>
        <Text style={styles.sectionTitle}>User Content</Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>• You retain ownership of any content you create (such as progress photos)</Text>
          <Text style={styles.listItem}>• Progress photos are stored locally on your device and are not uploaded to our servers</Text>
          <Text style={styles.listItem}>• Any feedback or suggestions you submit may be used by us to improve the app</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionNumber}>9</Text>
        <Text style={styles.sectionTitle}>Intellectual Property</Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>• All content, features, and functionality of Protocol are owned by us and are protected by copyright, trademark, and other intellectual property laws</Text>
          <Text style={styles.listItem}>• The Protocol name, logo, and all related graphics are our trademarks</Text>
          <Text style={styles.listItem}>• You may not copy, reproduce, distribute, or create derivative works from any part of the app without our written permission</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionNumber}>10</Text>
        <Text style={styles.sectionTitle}>Privacy</Text>
        <Text style={styles.body}>
          Your use of Protocol is also governed by our Privacy Policy, which explains how we collect, use, and protect your data. By using the app, you consent to our data practices as described in the Privacy Policy.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionNumber}>11</Text>
        <Text style={styles.sectionTitle}>Disclaimers</Text>
        <View style={styles.legalBox}>
          <Text style={styles.legalText}>
            THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
          </Text>
        </View>
        <Text style={styles.body}>We do not warrant that:</Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>• The app will meet your specific requirements</Text>
          <Text style={styles.listItem}>• The app will be uninterrupted, timely, secure, or error-free</Text>
          <Text style={styles.listItem}>• The results from using the app will be accurate or reliable</Text>
          <Text style={styles.listItem}>• Any errors in the app will be corrected</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionNumber}>12</Text>
        <Text style={styles.sectionTitle}>Limitation of Liability</Text>
        <View style={styles.legalBox}>
          <Text style={styles.legalText}>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.
          </Text>
        </View>
        <Text style={styles.body}>This includes but is not limited to:</Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>• Loss of profits, data, or goodwill</Text>
          <Text style={styles.listItem}>• Personal injury or property damage</Text>
          <Text style={styles.listItem}>• Any damages arising from your use or inability to use the app</Text>
        </View>
        <Text style={styles.bodyMuted}>
          Our total liability shall not exceed the amount you paid for the app in the 12 months preceding the claim.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionNumber}>13</Text>
        <Text style={styles.sectionTitle}>Indemnification</Text>
        <Text style={styles.body}>
          You agree to indemnify and hold us harmless from any claims, damages, losses, or expenses arising from:
        </Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>• Your use of the app</Text>
          <Text style={styles.listItem}>• Your violation of these terms</Text>
          <Text style={styles.listItem}>• Your violation of any rights of another party</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionNumber}>14</Text>
        <Text style={styles.sectionTitle}>Termination</Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>• We may suspend or terminate your access to the app at any time for violation of these terms</Text>
          <Text style={styles.listItem}>• You may stop using the app and delete your account at any time</Text>
          <Text style={styles.listItem}>• Upon termination, your right to use the app ceases immediately</Text>
          <Text style={styles.listItem}>• Sections that by their nature should survive termination will survive (including disclaimers, limitations of liability, and indemnification)</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionNumber}>15</Text>
        <Text style={styles.sectionTitle}>Changes to Terms</Text>
        <Text style={styles.body}>
          We reserve the right to modify these terms at any time. We will notify users of material changes through the app or by email. Your continued use of the app after changes constitutes acceptance of the new terms.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionNumber}>16</Text>
        <Text style={styles.sectionTitle}>Governing Law</Text>
        <Text style={styles.body}>
          These terms shall be governed by and construed in accordance with the laws of Norway, without regard to conflict of law principles.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionNumber}>17</Text>
        <Text style={styles.sectionTitle}>Severability</Text>
        <Text style={styles.body}>
          If any provision of these terms is found to be unenforceable, the remaining provisions will continue in full force and effect.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionNumber}>18</Text>
        <Text style={styles.sectionTitle}>Entire Agreement</Text>
        <Text style={styles.body}>
          These Terms of Use, together with our Privacy Policy, constitute the entire agreement between you and Protocol regarding your use of the app.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionNumber}>19</Text>
        <Text style={styles.sectionTitle}>Contact</Text>
        <Text style={styles.body}>For questions about these terms:</Text>
        <Text style={styles.contactEmail}>contact@instapush.org</Text>
      </View>
    </>
  );
}

function FAQContent({ styles }: { styles: ReturnType<typeof getStyles> }) {
  return (
    <>
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
    </>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.lg,
      width: '95%',
      maxWidth: 500,
      maxHeight: '90%',
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    closeButton: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeButtonText: {
      fontSize: 20,
      color: theme.colors.text,
      fontWeight: '300',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },
    lastUpdated: {
      ...theme.typography.bodySmall,
      color: theme.colors.textMuted,
      marginBottom: theme.spacing.xl,
    },
    subtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.textMuted,
      marginBottom: theme.spacing.xl,
    },
    section: {
      marginBottom: theme.spacing.xl,
    },
    sectionNumber: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 12,
      color: theme.colors.textMuted,
      marginBottom: theme.spacing.xs,
    },
    sectionTitle: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    subsectionTitle: {
      ...theme.typography.body,
      fontWeight: '600',
      color: theme.colors.text,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    body: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      lineHeight: 24,
    },
    bodyMuted: {
      ...theme.typography.bodySmall,
      color: theme.colors.textMuted,
      marginTop: theme.spacing.md,
    },
    list: {
      marginLeft: theme.spacing.sm,
    },
    listItem: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
      lineHeight: 22,
    },
    warningBox: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.warning,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    warningText: {
      ...theme.typography.body,
      color: theme.colors.warning,
      fontWeight: '500',
    },
    legalBox: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    legalText: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    contactEmail: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 14,
      color: theme.colors.text,
      marginTop: theme.spacing.sm,
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
    contactHint: {
      ...theme.typography.bodySmall,
      color: theme.colors.textMuted,
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
    feedbackCard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginTop: theme.spacing.md,
    },
  });
}
