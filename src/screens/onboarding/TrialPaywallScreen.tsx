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
  getWeeklyPackageFromOffering,
  purchasePackage,
  restorePurchases,
  logInRevenueCat,
} from '../../services/subscriptionService';
import { PurchasesPackage } from 'react-native-purchases';
import { formatPrice } from '../../utils/priceUtils';
import { buildRoutineFromOnboarding } from '../../utils/buildRoutineFromOnboarding';
import { useOnboardingTracking, ONBOARDING_SCREENS, buildOnboardingProperties, POSTHOG_EVENTS, REFERRAL_SOURCE } from '../../hooks/useOnboardingTracking';
import { usePostHog } from 'posthog-react-native';
import { CATEGORIES } from '../../constants/categories';
import { trackTrialStarted as trackTikTokTrialStarted } from '../../services/tiktok';
import ReferralModal from '../../components/ReferralModal';
import {
  getUserReferralCode,
  getReferralStatus,
  redeemReferralCode,
  validateReferralCode,
  markFriendStartedTrial,
  checkTrialEligibility,
} from '../../services/referralService';
import {
  setPendingReferralCode,
  getAndClearPendingReferralCode,
} from '../../utils/referralStorage';

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
  const { isDevModeEnabled, clearForceFlags, simulateFriendUsedReferral } = useDevMode();
  const { data, setOnboardingComplete } = useOnboarding();
  const { user, signInAnonymous } = useAuth();
  const { refreshSubscriptionStatus } = usePremium();
  const insets = useSafeAreaInsets();
  const [finishing, setFinishing] = useState(false);
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | 'faq'>('terms');
  const [restoring, setRestoring] = useState(false);
  const [weeklyPackage, setWeeklyPackage] = useState<PurchasesPackage | null>(null);
  const [pricingLine, setPricingLine] = useState<string>('$3.99/week');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Referral system state
  const [referralModalVisible, setReferralModalVisible] = useState(false);
  const [referralModalMode, setReferralModalMode] = useState<'share' | 'enter'>('share');
  const [userReferralCode, setUserReferralCode] = useState('');
  const [waitingForFriend, setWaitingForFriend] = useState(false);
  const [hasReferralCredit, setHasReferralCredit] = useState(false);
  const [hasUsedReferralCode, setHasUsedReferralCode] = useState(false);

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

  // Load user's referral code and check status; apply any pending code (entered before sign-in)
  useEffect(() => {
    (async () => {
      try {
        // Ensure we have a user (create anonymous if needed) so share code and status work
        let uid = user?.uid;
        if (!uid) {
          console.log('[TrialPaywall] No user yet, creating anonymous user...');
          const cred = await signInAnonymous();
          uid = cred.user.uid;
        }

        // Apply pending referral code if user entered one before having an account
        const pendingCode = await getAndClearPendingReferralCode();
        if (pendingCode) {
          try {
            const redeemResult = await redeemReferralCode(pendingCode, uid);
            if (redeemResult.success) {
              console.log('[TrialPaywall] Applied pending referral code');
            }
          } catch (e) {
            console.warn('[TrialPaywall] Failed to apply pending referral code:', e);
          }
        }

        // Get or create user's referral code
        const code = await getUserReferralCode(uid);
        setUserReferralCode(code);

        // Check referral status
        const status = await getReferralStatus(uid);

        // Check if they should get trial via referral
        const eligibility = await checkTrialEligibility(uid);

        // Check if user has already used a code
        const userRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setHasUsedReferralCode(!!(userData.hasUsedReferralCode || userData.referredBy));
        }

        // Dev: simulate that friend used your code and started trial
        if (simulateFriendUsedReferral) {
          setHasReferralCredit(true);
          setWaitingForFriend(false);
        } else {
          setHasReferralCredit(eligibility.shouldGetTrial);
          setWaitingForFriend(status.waitingForFriend);
        }

        console.log('[TrialPaywall] Referral status:', {
          code,
          waitingForFriend: status.waitingForFriend,
          hasCredit: eligibility.shouldGetTrial,
          reason: eligibility.reason,
          simulateFriendUsedReferral,
        });
      } catch (error) {
        console.warn('[TrialPaywall] Error loading referral data:', error);
      }
    })();
  }, [user?.uid, simulateFriendUsedReferral]);

  // Load weekly package based on referral eligibility
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const offering = await getOfferings();
      if (cancelled) return;

      // Get appropriate package based on referral credit
      const pkg = getWeeklyPackageFromOffering(offering, hasReferralCredit);
      setWeeklyPackage(pkg ?? null);

      if (pkg?.product) {
        const { priceString } = pkg.product;
        setPricingLine(priceString || '$3.99/week');
      }
    })();
    return () => { cancelled = true; };
  }, [hasReferralCredit]);

  const handleEnterCode = async (
    code: string
  ): Promise<{ success: boolean; error?: string; appliedLater?: boolean }> => {
    try {
      // When not signed in: validate code and store for later (apply when they start trial)
      if (!user?.uid) {
        const ownerId = await validateReferralCode(code);
        if (!ownerId) {
          return { success: false, error: 'Invalid or already used code' };
        }
        await setPendingReferralCode(code);
        return { success: true, appliedLater: true };
      }

      // Check if already used a code
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists() && (userDoc.data().hasUsedReferralCode || userDoc.data().referredBy)) {
        return { success: false, error: 'You have already used a referral code' };
      }

      // Redeem the code
      const result = await redeemReferralCode(code, user.uid);

      if (result.success) {
        setWaitingForFriend(true);
        return { success: true };
      }

      return { success: false, error: result.error };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Failed to redeem code' };
    }
  };

  const handleCheckStatus = async (): Promise<{ eligible: boolean; message: string }> => {
    try {
      // Dev: simulate that friend used your code and started trial
      if (simulateFriendUsedReferral) {
        setHasReferralCredit(true);
        return {
          eligible: true,
          message: "You're eligible for 7-day trial! Your friend started their trial. Tap the button above to start yours.",
        };
      }

      let uid = user?.uid;
      if (!uid) {
        const cred = await signInAnonymous();
        uid = cred.user.uid;
      }

      // Check referral status
      const status = await getReferralStatus(uid);

      if (status.friendStartedTrial) {
        // Friend has started trial - they're eligible!
        setHasReferralCredit(true);
        return {
          eligible: true,
          message: "You're eligible for 7-day trial! Your friend started their trial. Tap the button above to start yours.",
        };
      } else if (status.friendClaimed) {
        // Friend claimed but hasn't started trial yet
        return {
          eligible: false,
          message: 'Your friend has entered your code but hasn\'t started their trial yet. Once they start, you both unlock 7 days free.',
        };
      } else {
        // No one has used their code yet
        return {
          eligible: false,
          message: 'No one has used your code yet. Share it with a friend and when they start their trial, you both get 7 days free.',
        };
      }
    } catch (error: any) {
      return {
        eligible: false,
        message: error?.message || 'Failed to check status',
      };
    }
  };

  const handleTryForFree = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      let uid = user?.uid;
      if (!uid) {
        const cred = await signInAnonymous();
        uid = cred.user.uid;
      }

      // Track whether they have referral credit (for PostHog event after purchase)
      let hadReferralCredit = hasReferralCredit;

      // Apply any referral code they entered before having an account
      const pendingCode = await getAndClearPendingReferralCode();
      if (pendingCode) {
        try {
          const redeemResult = await redeemReferralCode(pendingCode, uid);
          if (redeemResult.success) {
            hadReferralCredit = true;
            setHasReferralCredit(true);
          }
        } catch (e) {
          console.warn('[TrialPaywall] Failed to apply pending referral code:', e);
        }
      }

      const signupDate = new Date();
      const photoDay = signupDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const { ingredientSelections, exerciseSelections } = buildRoutineFromOnboarding(data);
      const userRef = doc(db, 'users', uid!);
      const existing = await getDoc(userRef);

      // Check if user entered a referral code
      const userDoc = await getDoc(userRef);
      const hasReferredBy = userDoc.exists() && userDoc.data().referredBy;

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
        // Mark that they've used a referral code (if applicable)
        ...(hasReferredBy && { hasUsedReferralCode: true }),
      };

      if (existing.exists()) {
        await updateDoc(userRef, routinePayload);
      } else {
        await setDoc(userRef, routinePayload);
      }

      if (isDevModeEnabled) {
        // Notification initialization moved to first homescreen load (TodayScreen)
        await clearOnboardingProgress();
        await clearForceFlags();
        setOnboardingComplete(true);
        setFinishing(false);
        return;
      }

      if (!weeklyPackage) {
        Alert.alert(
          'Not Ready',
          'Subscription options are still loading. Please try again in a moment.'
        );
        setFinishing(false);
        return;
      }

      const result = await purchasePackage(weeklyPackage);
      if (result.success) {
        if (posthog) {
          const baseProps = buildOnboardingProperties(data) as Record<string, string | number | boolean | null | string[]>;
          if (hadReferralCredit) {
            const userSnap = await getDoc(doc(db, 'users', uid!));
            const referredBy = userSnap.exists() ? userSnap.data().referredBy : null;
            posthog.capture(POSTHOG_EVENTS.FREE_TRIAL_STARTED, {
              ...baseProps,
              referral_source: referredBy ? REFERRAL_SOURCE.ENTERED_FRIEND_CODE : REFERRAL_SOURCE.FRIEND_USED_MY_CODE,
            });
          } else {
            posthog.capture(POSTHOG_EVENTS.WEEKLY_PURCHASE, baseProps);
          }
        }

        // Track trial started with TikTok (main conversion event)
        try {
          await trackTikTokTrialStarted();
          console.log('[TrialPaywallScreen] ✅ TikTok trial started event tracked');
        } catch (error) {
          console.warn('[TrialPaywallScreen] Failed to track TikTok trial started:', error);
        }

        // Mark that this user started trial (for referral credit)
        try {
          await markFriendStartedTrial(uid!);
          console.log('[TrialPaywallScreen] ✅ Referral credit marked');
        } catch (error) {
          console.warn('[TrialPaywallScreen] Failed to mark referral credit:', error);
        }

        await refreshSubscriptionStatus();
        // Notification initialization moved to first homescreen load (TodayScreen)
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
          // Notification initialization moved to first homescreen load (TodayScreen)
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

        {/* Main CTA button */}
        <AnimatedButton
          style={[styles.ctaButton, finishing && styles.buttonDisabled]}
          onPress={handleTryForFree}
          disabled={finishing}
        >
          <Text style={styles.ctaText}>
            {finishing
              ? '...'
              : hasReferralCredit
                ? 'Start 7-Day Trial'
                : `Start Protocol - ${pricingLine}`}
          </Text>
        </AnimatedButton>

        {/* Referral credit badge */}
        {hasReferralCredit && (
          <View style={styles.creditBadge}>
            <Text style={styles.creditText}>✓ 7-day trial unlocked via referral</Text>
          </View>
        )}

        {/* Waiting for friend badge */}
        {waitingForFriend && !hasReferralCredit && (
          <View style={styles.waitingBadge}>
            <Text style={styles.waitingText}>⏳ Waiting for friend to start trial...</Text>
          </View>
        )}

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Referral buttons - two touching buttons */}
        {hasReferralCredit ? (
          <View style={[styles.inviteButton, styles.inviteButtonCompleted]}>
            <Text style={styles.inviteButtonText}>Friend invite completed</Text>
            <Text style={styles.inviteButtonSubtext}>7-day trial unlocked</Text>
          </View>
        ) : (
          <View style={styles.referralButtonsContainer}>
            <TouchableOpacity
              style={styles.inviteButtonLeft}
              onPress={() => {
                setReferralModalMode('share');
                setReferralModalVisible(true);
              }}
            >
              <Text style={styles.inviteButtonText}>Invite a Friend</Text>
              <Text style={styles.inviteButtonSubtext}>
                Both get <Text style={styles.inviteButtonSubtextGreen}>7 days free</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gotCodeButton}
              onPress={() => {
                setReferralModalMode('enter');
                setReferralModalVisible(true);
              }}
            >
              <Text style={styles.gotCodeButtonText}>Got a code?</Text>
            </TouchableOpacity>
          </View>
        )}

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

      <ReferralModal
        visible={referralModalVisible}
        onClose={() => setReferralModalVisible(false)}
        userCode={userReferralCode}
        onEnterCode={handleEnterCode}
        onCheckStatus={handleCheckStatus}
        waitingForFriend={waitingForFriend}
        hasUsedCode={hasUsedReferralCode}
        initialMode={referralModalMode}
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.bodySmall,
    fontSize: 13,
    color: colors.textMuted,
    marginHorizontal: spacing.md,
  },
  inviteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  inviteButtonCompleted: {
    opacity: 0.8,
  },
  inviteButtonText: {
    ...typography.body,
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  inviteButtonSubtext: {
    ...typography.bodySmall,
    fontSize: 13,
    color: colors.textSecondary,
  },
  inviteButtonSubtextGreen: {
    color: colors.accent,
    fontWeight: '600',
  },
  referralButtonsContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: 8,
    overflow: 'hidden',
  },
  inviteButtonLeft: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1.5,
    borderRightColor: colors.accent,
  },
  gotCodeButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gotCodeButtonText: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  creditBadge: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  creditText: {
    ...typography.bodySmall,
    fontSize: 13,
    color: colors.accent,
    textAlign: 'center',
    fontWeight: '600',
  },
  waitingBadge: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  waitingText: {
    ...typography.bodySmall,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
