import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { AnimatedButton } from '../../components/AnimatedButton';
import LegalModal from '../../components/LegalModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, MONOSPACE_FONT } from '../../constants/theme';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useDevMode } from '../../contexts/DevModeContext';
import { OnboardingDevMenu } from '../../components/OnboardingDevMenu';
import { useAuth } from '../../contexts/AuthContext';
import { usePremium } from '../../contexts/PremiumContext';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { clearOnboardingProgress } from '../../utils/onboardingStorage';
import {
  getOfferings,
  getAnnualPackageFromOffering,
  purchasePackage,
  restorePurchases,
  logInRevenueCat,
} from '../../services/subscriptionService';
import { PurchasesPackage } from 'react-native-purchases';
import { formatPrice } from '../../utils/priceUtils';
import { buildRoutineFromOnboarding } from '../../utils/buildRoutineFromOnboarding';
import { useOnboardingTracking, ONBOARDING_SCREENS, buildOnboardingProperties, POSTHOG_EVENTS } from '../../hooks/useOnboardingTracking';
import { usePostHog } from 'posthog-react-native';
import { CATEGORIES } from '../../constants/categories';
import { trackTrialStarted as trackTikTokTrialStarted } from '../../services/tiktok';

function getProblemDisplayName(problemId: string): string {
  const cat = CATEGORIES.find((c) => c.id === problemId);
  if (cat) return cat.label.split(' / ')[0].toLowerCase();
  return problemId.replace(/_/g, ' ').toLowerCase();
}

function formatProblemsList(problems: string[]): string {
  if (!problems || problems.length === 0) return 'your concerns';

  const displayNames = problems.map(getProblemDisplayName);

  if (displayNames.length === 1) {
    return displayNames[0];
  } else if (displayNames.length === 2) {
    return `${displayNames[0]} and ${displayNames[1]}`;
  } else {
    const lastProblem = displayNames[displayNames.length - 1];
    const otherProblems = displayNames.slice(0, -1).join(', ');
    return `${otherProblems}, and ${lastProblem}`;
  }
}

function getTrialSteps(problems: string[]) {
  const problemsList = formatProblemsList(problems);

  return [
    {
      icon: '01',
      title: 'Day 1 – Your protocol starts',
      description: `Custom routine for ${problemsList}. Morning and evening reminders.`,
    },
    {
      icon: '02',
      title: 'Day 2 – Build your streak',
      description: "Track your consistency, see your analytics, we'll remind you before trial ends",
    },
    {
      icon: '03',
      title: 'Day 3 – Keep going or cancel',
      description: 'Continue with full access or cancel anytime, keep your progress data',
    },
  ];
}

export default function TrialPaywallScreen({ navigation }: any) {
  useOnboardingTracking(ONBOARDING_SCREENS.TRIAL_PAYWALL);
  const posthog = usePostHog();
  const { isDevModeEnabled, clearForceFlags } = useDevMode();
  const { data, setOnboardingComplete } = useOnboarding();
  const { user, signInAnonymous } = useAuth();
  const { refreshSubscriptionStatus } = usePremium();
  const insets = useSafeAreaInsets();
  const [finishing, setFinishing] = useState(false);
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | 'faq'>('terms');
  const [restoring, setRestoring] = useState(false);
  const [yearlyPackage, setYearlyPackage] = useState<PurchasesPackage | null>(null);
  const [pricingLine, setPricingLine] = useState<string>('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Get user's problems for personalization
  const userProblems = data.selectedCategories || data.selectedProblems || [];
  const TRIAL_STEPS = getTrialSteps(userProblems);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // Load yearly offer and build pricing line (monthly equivalent + yearly priceString)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const offering = await getOfferings();
      const annualPkg = getAnnualPackageFromOffering(offering);
      if (cancelled) return;
      setYearlyPackage(annualPkg ?? null);
      if (annualPkg?.product) {
        const { price, priceString, currencyCode } = annualPkg.product;
        if (currencyCode && price != null) {
          const perMonth = price / 12;
          setPricingLine(
            `${formatPrice(perMonth, currencyCode)}/month, billed yearly as ${priceString}/year`
          );
        } else if (priceString) {
          setPricingLine(`Billed yearly as ${priceString}/year`);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleTryForFree = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      let uid = user?.uid;
      if (!uid) {
        const cred = await signInAnonymous();
        uid = cred.user.uid;
      }

      const signupDate = new Date();
      const photoDay = signupDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const { ingredientSelections, exerciseSelections } = buildRoutineFromOnboarding(data);
      const userRef = doc(db, 'users', uid!);
      const existing = await getDoc(userRef);

      const routinePayload = {
        concerns: data.selectedCategories || data.selectedProblems || [],
        routineStarted: true,
        routineStartDate: signupDate.toISOString(),
        ingredientSelections,
        exerciseSelections,
        signupDate: signupDate.toISOString(),
        photoDay,
        createdAt: signupDate.toISOString(),
        ...(data.skinType && { skinType: data.skinType }),
        ...(data.budget && { budget: data.budget }),
        ...(data.timeCommitment && { timeAvailability: data.timeCommitment }),
      };

      if (existing.exists()) {
        await updateDoc(userRef, routinePayload);
      } else {
        await setDoc(userRef, routinePayload);
      }

      if (isDevModeEnabled) {
        const { initializeUserNotifications } = require('../../services/notificationService');
        await initializeUserNotifications(uid!);
        await clearOnboardingProgress();
        await clearForceFlags();
        setOnboardingComplete(true);
        setFinishing(false);
        return;
      }

      if (!yearlyPackage) {
        Alert.alert(
          'Not Ready',
          'Subscription options are still loading. Please try again in a moment.'
        );
        setFinishing(false);
        return;
      }

      const result = await purchasePackage(yearlyPackage);
      if (result.success) {
        if (posthog) {
          posthog.capture(POSTHOG_EVENTS.TRIAL_STARTED, buildOnboardingProperties(data) as Record<string, string | number | boolean | null | string[]>);
        }

        // Track trial started with TikTok (main conversion event)
        try {
          await trackTikTokTrialStarted();
          console.log('[TrialPaywallScreen] ✅ TikTok trial started event tracked');
        } catch (error) {
          console.warn('[TrialPaywallScreen] Failed to track TikTok trial started:', error);
        }

        await refreshSubscriptionStatus();
        const { initializeUserNotifications } = require('../../services/notificationService');
        await initializeUserNotifications(uid!);
        await clearOnboardingProgress();
        setOnboardingComplete(true);
      } else {
        if (result.error === 'Purchase cancelled') {
          // User closed the sheet, no alert
          return;
        }
        Alert.alert('Error', result.error || 'Purchase failed. Please try again.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to complete');
    } finally {
      setFinishing(false);
    }
  };

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      // Ensure we have a user so restore is linked to this device/account and synced to Firestore
      let uid = user?.uid;
      if (!uid) {
        const cred = await signInAnonymous();
        uid = cred.user.uid;
      }
      // Link RevenueCat to this user so the restored Apple ID subscription is tied to this Firebase user
      await logInRevenueCat(uid);
      const result = await restorePurchases(uid);
      if (result.success) {
        if (result.isPremium) {
          const userRef = doc(db, 'users', uid!);
          const existing = await getDoc(userRef);
          const { ingredientSelections, exerciseSelections } = buildRoutineFromOnboarding(data);
          const now = new Date();
          const routinePayload = {
            routineStarted: true,
            routineStartDate: now.toISOString(),
            concerns: data.selectedCategories || data.selectedProblems || [],
            ingredientSelections,
            exerciseSelections,
            signupDate: now.toISOString(),
            createdAt: now.toISOString(),
            photoDay: now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
            ...(data.skinType && { skinType: data.skinType }),
            ...(data.budget && { budget: data.budget }),
            ...(data.timeCommitment && { timeAvailability: data.timeCommitment }),
          };
          if (existing.exists()) {
            await updateDoc(userRef, routinePayload);
          } else {
            await setDoc(userRef, routinePayload);
          }
          await refreshSubscriptionStatus();
          const { initializeUserNotifications } = require('../../services/notificationService');
          await initializeUserNotifications(uid!);
          await clearOnboardingProgress();
          setOnboardingComplete(true);
        } else {
          Alert.alert('Restored', 'Your purchases have been restored. No active subscription was found for this Apple ID.');
        }
      } else {
        Alert.alert('No Purchases', 'No previous purchases found for this Apple ID. Sign in with the Apple ID you used to subscribe.');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: spacing.xl + insets.top, paddingBottom: spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.title}>How your free trial works</Text>

          <View style={styles.steps}>
            {TRIAL_STEPS.map((step, index) => (
              <View key={index} style={styles.stepRow}>
                <View style={styles.stepIconWrap}>
                  <Text style={styles.stepIcon}>{step.icon}</Text>
                </View>
                <View style={styles.stepTextWrap}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.bottomSection, { paddingBottom: insets.bottom }]}>
        <OnboardingDevMenu />
        <AnimatedButton
          style={[styles.ctaButton, finishing && styles.buttonDisabled]}
          onPress={handleTryForFree}
          disabled={finishing}
        >
          <Text style={styles.ctaText}>{finishing ? '...' : 'Start Protocol for Free'}</Text>
        </AnimatedButton>

        {pricingLine ? (
          <Text style={styles.pricing}>{pricingLine}</Text>
        ) : null}

        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={handleRestore} disabled={restoring}>
            <Text style={styles.footerLink}>Restore Purchases</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}> · </Text>
          <TouchableOpacity onPress={() => { setLegalModalType('terms'); setLegalModalVisible(true); }}>
            <Text style={styles.footerLink}>Terms</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}> · </Text>
          <TouchableOpacity onPress={() => { setLegalModalType('privacy'); setLegalModalVisible(true); }}>
            <Text style={styles.footerLink}>Privacy</Text>
          </TouchableOpacity>
        </View>
      </View>

      <LegalModal
        visible={legalModalVisible}
        onClose={() => setLegalModalVisible(false)}
        type={legalModalType}
      />
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
  title: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 30,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl + spacing.md,
  },
  steps: {
    marginBottom: spacing.xl + spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  stepIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  stepIcon: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },
  stepTextWrap: {
    flex: 1,
    paddingTop: 1,
  },
  stepTitle: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  stepDescription: {
    ...typography.body,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  bottomSection: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  ctaButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    ...typography.body,
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  pricing: {
    ...typography.bodySmall,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  footerLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  footerLink: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  footerDot: {
    fontSize: 15,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
  },
});
