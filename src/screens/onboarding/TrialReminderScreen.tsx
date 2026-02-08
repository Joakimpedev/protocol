import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { AnimatedButton } from '../../components/AnimatedButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, MONOSPACE_FONT } from '../../constants/theme';
import { OnboardingDevMenu } from '../../components/OnboardingDevMenu';
import { useOnboardingTracking, ONBOARDING_SCREENS } from '../../hooks/useOnboardingTracking';

function getTrialEndDate(): string {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 3); // 3 days from now

  // Format as "MMM D, YYYY"
  const month = endDate.toLocaleDateString('en-US', { month: 'short' });
  const day = endDate.getDate();
  const year = endDate.getFullYear();

  return `${month} ${day}, ${year}`;
}

export default function TrialReminderScreen({ navigation }: any) {
  useOnboardingTracking(ONBOARDING_SCREENS.TRIAL_REMINDER);
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleContinue = () => {
    navigation.navigate('TrialPaywall');
  };

  const trialEndDate = getTrialEndDate();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: spacing.xl + insets.top, paddingBottom: spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <Text style={styles.heading}>
            We'll remind you <Text style={styles.highlight}>1 day</Text> before your trial ends
          </Text>

          <View style={styles.reassuranceSection}>
            <Text style={styles.noPayment}>No payment due now</Text>
            <Text style={styles.freeUntil}>Free until {trialEndDate}</Text>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.bottomSection, { paddingBottom: insets.bottom }]}>
        <OnboardingDevMenu />
        <AnimatedButton style={styles.ctaButton} onPress={handleContinue}>
          <Text style={styles.ctaText}>Continue for free</Text>
        </AnimatedButton>
      </View>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  content: {
    alignItems: 'center',
  },
  bottomSection: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  heading: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 30,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  highlight: {
    color: colors.accent,
  },
  reassuranceSection: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  noPayment: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  freeUntil: {
    ...typography.bodySmall,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  ctaButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  ctaText: {
    ...typography.body,
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
});
