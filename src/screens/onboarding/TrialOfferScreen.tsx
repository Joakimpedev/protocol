import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { AnimatedButton } from '../../components/AnimatedButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, MONOSPACE_FONT } from '../../constants/theme';
import { OnboardingDevMenu } from '../../components/OnboardingDevMenu';
import { getOfferings, getAnnualPackageFromOffering } from '../../services/subscriptionService';
import { formatPrice } from '../../utils/priceUtils';
import { useOnboardingTracking, ONBOARDING_SCREENS } from '../../hooks/useOnboardingTracking';

const OFFER_NAMES: Record<number, string> = {
  1: "New Years Offer",
  2: "Spring Enrollment Offer",
  3: "Spring Enrollment Offer",
  4: "Spring Enrollment Offer",
  5: "Spring Enrollment Offer",
  6: "Summer Window Offer",
  7: "Summer Window Offer",
  8: "Summer Window Offer",
  9: "Fall Enrollment Offer",
  10: "Fall Enrollment Offer",
  11: "Year-End Offer",
  12: "Year-End Offer"
};

function getOfferName(): string {
  const month = new Date().getMonth() + 1; // getMonth() returns 0-11
  return OFFER_NAMES[month] || "Special Offer";
}

function getOfferDateRange(): string {
  const today = new Date();

  // Start date: 10 days before today
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 10);

  // End date: 4 days after today
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 4);

  // Format as "MMM D – MMM D"
  const formatDate = (date: Date) => {
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  };

  return `${formatDate(startDate)} – ${formatDate(endDate)}`;
}

export default function TrialOfferScreen({ navigation }: any) {
  useOnboardingTracking(ONBOARDING_SCREENS.TRIAL_OFFER);
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [trialPriceLabel, setTrialPriceLabel] = useState<string>('0'); // formatted "0" in user currency once loaded

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // Yearly offer: 3-day free trial shows 0 in user's currency from RevenueCat
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const offering = await getOfferings();
      const annualPkg = getAnnualPackageFromOffering(offering);
      const currencyCode = annualPkg?.product?.currencyCode;
      if (cancelled) return;
      if (currencyCode) {
        setTrialPriceLabel(formatPrice(0, currencyCode));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleClaimSpot = () => {
    navigation.navigate('TrialReminder');
  };

  const offerName = getOfferName();
  const dateRange = getOfferDateRange();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: spacing.xl + insets.top, paddingBottom: spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.badgeWrapper}>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeTitle}>{offerName}</Text>
            </View>
            <View style={styles.dateTag}>
              <Text style={styles.badgeDate}>{dateRange}</Text>
            </View>
          </View>

          <Text style={styles.heading}>
            You're getting{'\n'}
            <Text style={styles.headingAccent}>3 days</Text> free.
          </Text>

          <View style={styles.socialProofContainer}>
            <Text style={styles.socialProofText}>
            <Text style={styles.userCount}>6,800+ users</Text> currently {'\n'}subscribe to Protocol.</Text>
            <Text style={styles.callToAction}>Try what they use,{'\n'}free for 3 days.</Text>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.bottomSection, { paddingBottom: insets.bottom }]}>
        <OnboardingDevMenu />
        <AnimatedButton style={styles.ctaButton} onPress={handleClaimSpot}>
          <Text style={styles.ctaText}>Try for {trialPriceLabel}</Text>
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
  badgeWrapper: {
    position: 'relative',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl + spacing.sm,
  },
  badgeContainer: {
    backgroundColor: 'rgba(0, 200, 100, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 200, 100, 0.2)',
    borderRadius: 4,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  badgeTitle: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.5,
  },
  dateTag: {
    position: 'absolute',
    bottom: -15,
    backgroundColor: colors.accent,
    borderRadius: 3,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  badgeDate: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 11,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: 0.5,
  },
  heading: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 26,
    fontWeight: '600',
    lineHeight: 32,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl * 2,
  },
  headingAccent: {
    color: colors.accent,
  },
  socialProofContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  userCount: {
    ...typography.body,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  socialProofText: {
    ...typography.body,
    fontSize: 17,
    lineHeight: 24,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  callToAction: {
    ...typography.body,
    paddingTop: spacing.md,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    color: colors.text,
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
