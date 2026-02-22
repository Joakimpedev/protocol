import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Easing,
  Image,
  Dimensions,
  AppState,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colorsV2, typographyV2, spacingV2, borderRadiusV2, gradients } from '../../constants/themeV2';
import GradientButton from '../../components/v2/GradientButton';
import BlurredOverlay from '../../components/v2/BlurredOverlay';
import RoomModal from '../../components/v2/RoomModal';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePremium } from '../../contexts/PremiumContext';
import { useDevMode } from '../../contexts/DevModeContext';
import { getUserRoom, ReferralRoom, markFriendStartedTrial } from '../../services/referralService';
import { loadSelfiePhotos } from '../../services/faceAnalysisService';
import { useOnboardingTracking, buildOnboardingProperties, POSTHOG_EVENTS } from '../../hooks/useOnboardingTracking';
import { useABTest } from '../../hooks/useABTest';
import { usePostHog } from 'posthog-react-native';
import { scheduleAbandonedCartNotification, setAbandonedCartQuickAction, cancelAbandonedCartNotification, clearAbandonedCartQuickAction } from '../../services/notificationService';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { clearOnboardingProgress } from '../../utils/onboardingStorage';
import { formatPrice } from '../../utils/priceUtils';
import {
  getOfferings,
  getMonthlyPackageFromOffering,
  getYearlyTrialPackageFromOffering,
  purchasePackage,
  restorePurchases,
  logInRevenueCat,
} from '../../services/subscriptionService';
import { PurchasesPackage } from 'react-native-purchases';
import { trackTrialStarted as trackTikTokTrialStarted, trackWeeklyPurchase as trackTikTokWeeklyPurchase, identifyUser as identifyTikTokUser, trackCompleteRegistration as trackTikTokRegistration } from '../../services/tiktok';
import { buildRoutineFromOnboarding } from '../../utils/buildRoutineFromOnboarding';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_SIZE = (SCREEN_WIDTH - spacingV2.lg * 2 - spacingV2.sm) / 2;

const PREVIEW_CATEGORIES = [
  { label: 'Jawline', baseScore: 0.68 },
  { label: 'Symmetry', baseScore: 0.74 },
  { label: 'Skin', baseScore: 0.49 },
  { label: 'Cheekbones', baseScore: 0.65 },
  { label: 'Eyes', baseScore: 0.71 },
  { label: 'Hair', baseScore: 0.52 },
  { label: 'Masculinity', baseScore: 0.67 },
];

function getBarColor(fraction: number): string {
  if (fraction >= 0.75) return '#4ADE80';   // green
  if (fraction >= 0.55) return '#FBBF24';   // yellow/amber
  return '#F87171';                          // red
}

// Improvement levels per concern — varied so it feels like a real assessment
const CONCERN_LEVELS: Record<string, { level: string; color: string }> = {
  'Skin Quality':     { level: 'High',    color: '#4ADE80' },
  'Facial Structure': { level: 'Medium',  color: '#FBBF24' },
  'Hair & Hairline':  { level: 'Medium',  color: '#FBBF24' },
  'Body Composition': { level: 'High',    color: '#4ADE80' },
  'Style & Grooming': { level: 'High',    color: '#4ADE80' },
  'Confidence':       { level: 'Medium',  color: '#FBBF24' },
};

type PlanType = 'monthly' | 'annual';

export default function ResultsPaywallScreen({ navigation }: any) {
  useOnboardingTracking('v2_results_paywall');
  const { data, setOnboardingComplete } = useOnboarding();
  const { user, signInAnonymous } = useAuth();
  const { refreshSubscriptionStatus, isPremium } = usePremium();
  const { isDevModeEnabled, clearForceFlags } = useDevMode();
  const posthog = usePostHog();

  // GUARD: If user is already premium (trial or paid), skip this paywall entirely
  useEffect(() => {
    if (isPremium) {
      console.log('[ResultsPaywall] User is already premium, skipping paywall');
      navigation.replace('V2FaceRating');
    }
  }, [isPremium]);

  // AB test: 'test' = show purchase buttons here, skip ProPaywall
  const paywallVariant = useABTest('results-paywall-purchase');
  const showPurchaseButtons = paywallVariant === 'test';

  // AB test: 'yearly_only' = show only yearly, 'monthly_yearly' (default) = show monthly + yearly
  const pricingVariant = useABTest('pricing-variant');
  const showMonthlyOption = pricingVariant !== 'yearly_only';

  const [roomModalVisible, setRoomModalVisible] = useState(false);
  const [userRoom, setUserRoom] = useState<ReferralRoom | null>(null);
  const [photos, setPhotos] = useState<{ frontUri: string; sideUri: string } | null>(null);

  // Purchase state (only used in 'test' variant)
  const [finishing, setFinishing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [annualPackage, setAnnualPackage] = useState<PurchasesPackage | null>(null);

  const anims = useScreenEntrance(4);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Oscillating bar anims (each bar drifts ±12% around its base)
  const barOscillations = useRef(
    PREVIEW_CATEGORIES.map(() => new Animated.Value(0))
  ).current;

  // Overall bar oscillation
  const overallOscillation = useRef(new Animated.Value(0)).current;

  // Build concern rows from user's actual selections
  const concernRows = useMemo(() => {
    const concerns = data.selectedConcerns ?? [];
    return concerns
      .map((c) => ({
        label: c,
        ...(CONCERN_LEVELS[c] || { level: 'Medium', color: '#FBBF24' }),
      }))
      .slice(0, 4); // max 4 rows to keep it tight
  }, [data.selectedConcerns]);

  // Load selfie photos
  useEffect(() => {
    (async () => {
      const saved = await loadSelfiePhotos();
      if (saved) setPhotos(saved);
    })();
  }, []);

  // Start oscillation loops
  useEffect(() => {
    const catLoops = barOscillations.map((anim, i) => {
      const duration = 2000 + i * 400;
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: -1,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: duration * 0.5,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      );
    });
    catLoops.forEach(l => l.start());

    const overallLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(overallOscillation, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(overallOscillation, {
          toValue: -1,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(overallOscillation, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
    overallLoop.start();

    return () => {
      catLoops.forEach(l => l.stop());
      overallLoop.stop();
    };
  }, []);

  // Fetch user room
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let uid = user?.uid;
        if (!uid) {
          const cred = await signInAnonymous();
          uid = cred.user.uid;
        }
        const room = await getUserRoom(uid);
        if (!cancelled) setUserRoom(room);
      } catch (e) {
        console.warn('[ResultsPaywall] Failed to fetch room:', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Set abandoned cart quick action on app icon long-press (only for non-premium users)
  useEffect(() => {
    if (!isPremium) {
      setAbandonedCartQuickAction();
    }
  }, [isPremium]);

  // Schedule abandoned cart notification when user backgrounds the app
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (!userRoom && !isPremium) {
          scheduleAbandonedCartNotification();
        }
      }
    });
    return () => subscription.remove();
  }, [userRoom, isPremium]);

  // Load RevenueCat offerings when in purchase variant
  useEffect(() => {
    if (!showPurchaseButtons) return;
    let cancelled = false;
    (async () => {
      try {
        const offering = await getOfferings();
        if (cancelled) return;
        const monthly = getMonthlyPackageFromOffering(offering);
        const yearlyTrial = getYearlyTrialPackageFromOffering(offering);
        setMonthlyPackage(monthly ?? null);
        setAnnualPackage(yearlyTrial ?? null);
      } catch (error) {
        console.warn('[ResultsPaywall] Failed to load offerings:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [showPurchaseButtons]);

  const handlePurchase = async (plan: PlanType = 'annual') => {
    if (finishing) return;
    setFinishing(true);
    try {
      let uid = user?.uid;
      if (!uid) { const cred = await signInAnonymous(); uid = cred.user.uid; }
      const signupDate = new Date();
      const { ingredientSelections, exerciseSelections } = buildRoutineFromOnboarding(data);
      const userRef = doc(db, 'users', uid!);
      const routinePayload = {
        concerns: data.selectedProblems || [],
        routineStarted: false,
        routineStartDate: signupDate.toISOString(),
        ingredientSelections, exerciseSelections,
        signupDate: signupDate.toISOString(),
        createdAt: signupDate.toISOString(),
        ...(data.skinType && { skinType: data.skinType }),
        ...(data.budget && { budget: data.budget }),
      };
      if (isDevModeEnabled) {
        const existing = await getDoc(userRef);
        if (existing.exists()) { await updateDoc(userRef, routinePayload); }
        else { await setDoc(userRef, routinePayload); }
        await clearOnboardingProgress(); await clearForceFlags();
        cancelAbandonedCartNotification(); clearAbandonedCartQuickAction();
        navigation.navigate('V2FaceRating'); setFinishing(false); return;
      }
      const pkg = plan === 'monthly' ? monthlyPackage : annualPackage;
      if (!pkg) { Alert.alert('Not Ready', 'Subscription options are still loading.'); setFinishing(false); return; }
      const result = await purchasePackage(pkg);
      if (result.success) {
        cancelAbandonedCartNotification(); clearAbandonedCartQuickAction();
        const existing = await getDoc(userRef);
        if (existing.exists()) { await updateDoc(userRef, routinePayload); }
        else { await setDoc(userRef, routinePayload); }
        if (posthog) {
          const baseProps = buildOnboardingProperties(data) as Record<string, string | number | boolean | null | string[]>;
          posthog.capture(POSTHOG_EVENTS.WEEKLY_PURCHASE, { ...baseProps, plan_type: plan, ab_variant: 'results_paywall_purchase', pricing_variant: pricingVariant });
        }
        try { await identifyTikTokUser(uid!); } catch {}
        try { await trackTikTokRegistration('apple', uid); } catch {}
        const price = pkg.product?.price;
        const currency = pkg.product?.currencyCode;
        if (plan === 'monthly') {
          try { await trackTikTokWeeklyPurchase(price, currency); } catch {}
        } else {
          try { await trackTikTokTrialStarted(price, currency); } catch {}
        }
        try { await markFriendStartedTrial(uid!); } catch {}
        await refreshSubscriptionStatus(); await clearOnboardingProgress();
        navigation.navigate('V2FaceRating');
      } else {
        if (result.error === 'Purchase cancelled') return;
        Alert.alert('Error', result.error || 'Purchase failed.');
      }
    } catch (e: any) { Alert.alert('Error', e?.message || 'Failed to complete purchase.'); }
    finally { setFinishing(false); }
  };

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      let uid = user?.uid;
      if (!uid) { const cred = await signInAnonymous(); uid = cred.user.uid; }
      await logInRevenueCat(uid);
      const result = await restorePurchases(uid);
      if (result.success) {
        if (result.isPremium) {
          cancelAbandonedCartNotification(); clearAbandonedCartQuickAction();
          const userRef = doc(db, 'users', uid!);
          const existing = await getDoc(userRef);
          const { ingredientSelections, exerciseSelections } = buildRoutineFromOnboarding(data);
          const now = new Date();
          const rp = { concerns: data.selectedProblems || [], routineStarted: false, routineStartDate: now.toISOString(), ingredientSelections, exerciseSelections, signupDate: now.toISOString(), createdAt: now.toISOString(), ...(data.skinType && { skinType: data.skinType }), ...(data.budget && { budget: data.budget }) };
          if (existing.exists()) { await updateDoc(userRef, rp); } else { await setDoc(userRef, rp); }
          await refreshSubscriptionStatus(); await clearOnboardingProgress();
          navigation.navigate('V2FaceRating');
        } else { Alert.alert('Restored', 'No active subscription found.'); }
      } else { Alert.alert('No Purchases', 'No previous purchases found.'); }
    } catch { Alert.alert('Error', 'Failed to restore purchases.'); }
    finally { setRestoring(false); }
  };

  // Pricing display values
  const monthlyPrice = monthlyPackage?.product?.priceString || '$9.99';
  const annualPrice = annualPackage?.product?.priceString || '$29.99';
  const monthlyRaw = monthlyPackage?.product?.price;
  const annualRaw = annualPackage?.product?.price;
  let savePct = 75;
  if (monthlyRaw && annualRaw && monthlyRaw > 0) {
    const yearlyCostAtMonthly = monthlyRaw * 12;
    savePct = Math.round(((yearlyCostAtMonthly - annualRaw) / yearlyCostAtMonthly) * 100);
  }

  const handleShake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleGetPro = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('V2ProPaywall');
  };

  const handleInviteFriends = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRoomModalVisible(true);
  };

  const handleNavigateToReferralPaywall = () => {
    navigation.navigate('V2ProPaywall', { referralOnly: true });
  };

  const inviteCount = userRoom ? Math.max(0, 4 - userRoom.memberCount) : 3;

  // Overall bar oscillation: base 67% ± 12%
  const overallPct = overallOscillation.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [55, 67, 79],
  });
  const overallBarWidth = overallOscillation.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['55%', '67%', '79%'],
  });
  const potentialGapPct = 17;
  const potentialBarWidth = Animated.add(overallPct, potentialGapPct).interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacingV2.md, paddingBottom: 140 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Photos — compact strip, no header above */}
        {photos && (
          <Animated.View
            style={[
              styles.photosSection,
              { opacity: anims[0].opacity, transform: anims[0].transform },
            ]}
          >
            <View style={styles.photosRow}>
              <View style={styles.photoCard}>
                <Image source={{ uri: photos.frontUri }} style={styles.photo} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.6)']}
                  style={styles.photoGradientOverlay}
                />
                <Text style={styles.photoTag}>FRONT</Text>
              </View>
              <View style={styles.photoCard}>
                <Image source={{ uri: photos.sideUri }} style={styles.photo} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.6)']}
                  style={styles.photoGradientOverlay}
                />
                <Text style={styles.photoTag}>SIDE</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Improvement Assessment — the hero section */}
        <Animated.View
          style={[
            styles.assessmentOuter,
            { opacity: anims[1].opacity, transform: anims[1].transform },
          ]}
        >
          <LinearGradient
            colors={['#FBBF24', '#D97706', '#92400E', '#FBBF24']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.assessmentBorder}
          >
            <View style={styles.assessmentCard}>
              <Text style={styles.assessmentLabel}>IMPROVEMENT POTENTIAL</Text>
              <View style={styles.assessmentScoreRow}>
                <Text style={styles.assessmentGrade}>Medium+</Text>
                <View style={styles.assessmentBadge}>
                  <LinearGradient
                    colors={['#FBBF24', '#F59E0B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.assessmentBadgeGradient}
                  >
                    <Text style={styles.assessmentBadgeText}>ABOVE AVG</Text>
                  </LinearGradient>
                </View>
              </View>
              <Text style={styles.assessmentSub}>There's real room to work with here</Text>

              {/* Per-concern breakdown */}
              {concernRows.length > 0 && (
                <View style={styles.concernsContainer}>
                  {concernRows.map((row) => (
                    <View key={row.label} style={styles.concernRow}>
                      <Text style={styles.concernLabel}>{row.label} Potential</Text>
                      <Text style={[styles.concernLevel, { color: row.color }]}>{row.level}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Score Card with selective blur */}
        <Animated.View
          style={[
            styles.cardWrapper,
            {
              opacity: anims[2].opacity,
              transform: [
                ...anims[2].transform,
                { translateX: shakeAnim },
              ],
            },
          ]}
        >
          <TouchableOpacity activeOpacity={1} onPress={handleShake}>
            <View style={styles.scoreCard}>
              {/* Overall score — heavily blurred */}
              <View style={styles.overallSection}>
                <BlurredOverlay intensity={50} style={styles.scoreBlur}>
                  <View style={styles.overallRowInner}>
                    <Text style={styles.overallScore}>6.7</Text>
                    <Text style={styles.overallMax}>/10</Text>
                  </View>
                </BlurredOverlay>
                <Text style={styles.overallLabel}>Overall Rating</Text>
              </View>

              {/* Overall stacked bar — blurred */}
              <View style={styles.stackedBarContainer}>
                <Animated.View style={[styles.overallBarGlow, { width: overallBarWidth }]} />
                <BlurredOverlay intensity={20} style={styles.barBlur}>
                  <View style={styles.stackedBarTrack}>
                    <Animated.View style={[styles.potentialBarFill, { width: potentialBarWidth }]}>
                      <LinearGradient
                        colors={[colorsV2.accentPurple + 'AA', colorsV2.accentPurple + '70']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.barGradientFill}
                      />
                    </Animated.View>
                    <Animated.View style={[styles.currentBarFill, { width: overallBarWidth }]}>
                      <LinearGradient
                        colors={gradients.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.barGradientFill}
                      />
                    </Animated.View>
                  </View>
                </BlurredOverlay>
              </View>

              <View style={styles.divider} />

              {/* Category breakdown — labels visible, bars+scores blurred */}
              {PREVIEW_CATEGORIES.map((cat, i) => {
                const basePct = cat.baseScore * 100;
                const swing = 12;
                const barWidth = barOscillations[i].interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [
                    `${basePct - swing}%`,
                    `${basePct}%`,
                    `${basePct + swing}%`,
                  ],
                });
                const color = getBarColor(cat.baseScore);

                return (
                  <View key={cat.label} style={styles.ratingRow}>
                    <Text style={styles.ratingLabel}>{cat.label}</Text>
                    <View style={styles.barAndScoreArea}>
                      <BlurredOverlay intensity={18} style={styles.rowBlur}>
                        <View style={styles.barScoreInner}>
                          <View style={styles.barWrapper}>
                            <Animated.View style={[styles.barGlow, { width: barWidth, backgroundColor: color, shadowColor: color }]} />
                            <View style={styles.barTrack}>
                              <Animated.View style={[styles.barFill, { width: barWidth, backgroundColor: color }]} />
                            </View>
                          </View>
                          <Text style={[styles.ratingScore, { color }]}>?.?</Text>
                        </View>
                      </BlurredOverlay>
                    </View>
                  </View>
                );
              })}
            </View>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Sticky CTA footer */}
      <Animated.View
        style={[
          styles.stickyFooter,
          { paddingBottom: insets.bottom + spacingV2.sm },
          { opacity: anims[3].opacity, transform: anims[3].transform },
        ]}
        pointerEvents="box-none"
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)', '#000000']}
          locations={[0, 0.4, 1]}
          style={styles.footerGradient}
          pointerEvents="none"
        />
        {showPurchaseButtons ? (
          <View style={styles.footerContent} pointerEvents="box-none">
            {/* Monthly — only shown in monthly_yearly variant */}
            {showMonthlyOption && (
              <TouchableOpacity activeOpacity={0.8} onPress={() => handlePurchase('monthly')} disabled={finishing}>
                <View style={styles.pricingCard}>
                  <View style={styles.pricingRow}>
                    <Text style={styles.pricingTier}>MONTHLY ACCESS</Text>
                    <View style={styles.pricingPriceCol}>
                      <Text style={styles.pricingAmount}>{monthlyPrice}</Text>
                      <Text style={styles.pricingPeriod}>per month</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Annual with trial */}
            <TouchableOpacity activeOpacity={0.8} onPress={() => handlePurchase('annual')} disabled={finishing} style={showMonthlyOption ? { marginTop: spacingV2.sm } : undefined}>
              <View style={[styles.pricingCard, styles.pricingCardAnnual]}>
                <View style={styles.trialBadge}>
                  <LinearGradient
                    colors={['#C084FC', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.trialBadgeGradient}
                  >
                    <Text style={styles.trialBadgeText}>3 DAYS FREE</Text>
                  </LinearGradient>
                </View>
                <View style={styles.pricingRow}>
                  <View>
                    <Text style={styles.pricingTierHighlight}>YEARLY ACCESS</Text>
                    <Text style={styles.pricingSubDetail}>Then {annualPrice} per year</Text>
                  </View>
                  <View style={styles.pricingPriceCol}>
                    <Text style={styles.pricingAmountHighlight}>
                      {annualPackage?.product?.price && annualPackage?.product?.currencyCode
                        ? formatPrice(annualPackage.product.price / 52, annualPackage.product.currencyCode)
                        : '$0.75'}
                    </Text>
                    <Text style={styles.pricingPeriod}>per week</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            <Text style={styles.cancelText}>cancel anytime</Text>

            <View style={styles.footerLinks}>
              <TouchableOpacity onPress={handleRestore} disabled={restoring}>
                <Text style={styles.footerLink}>{restoring ? 'Restoring...' : 'Restore Purchases'}</Text>
              </TouchableOpacity>
              <Text style={styles.footerDot}> | </Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://protocol.app/terms')}>
                <Text style={styles.footerLink}>Terms</Text>
              </TouchableOpacity>
              <Text style={styles.footerDot}> | </Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://protocol.app/privacy')}>
                <Text style={styles.footerLink}>Privacy</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.footerContent} pointerEvents="box-none">
            <GradientButton title="See Your Full Results" onPress={handleGetPro} />
            <TouchableOpacity onPress={handleInviteFriends} style={styles.inviteLink}>
              <Text style={styles.inviteLinkText}>
                or <Text style={styles.inviteLinkHighlight}>invite {inviteCount} friend{inviteCount !== 1 ? 's' : ''}</Text> to unlock free
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      <RoomModal
        visible={roomModalVisible}
        onClose={() => setRoomModalVisible(false)}
        onNavigateToReferralPaywall={handleNavigateToReferralPaywall}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Screen layout
  screen: {
    flex: 1,
    backgroundColor: colorsV2.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacingV2.lg,
  },

  // Photos — compact, top of screen
  photosSection: {
    marginTop: spacingV2.sm,
    marginBottom: spacingV2.md,
  },
  photosRow: {
    flexDirection: 'row' as const,
    gap: spacingV2.sm,
  },
  photoCard: {
    flex: 1,
    height: PHOTO_SIZE * 0.75,
    borderRadius: borderRadiusV2.lg,
    overflow: 'hidden' as const,
    backgroundColor: colorsV2.surface,
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover' as const,
  },
  photoGradientOverlay: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  photoTag: {
    position: 'absolute' as const,
    bottom: 8,
    left: 10,
    ...typographyV2.label,
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.5,
  },

  // Improvement Assessment card — gradient border trick
  assessmentOuter: {
    marginBottom: spacingV2.md,
    borderRadius: borderRadiusV2.xl,
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  assessmentBorder: {
    borderRadius: borderRadiusV2.xl,
    padding: 1.5, // the visible "stroke" width
  },
  assessmentCard: {
    backgroundColor: colorsV2.surface,
    borderRadius: borderRadiusV2.xl - 1,
    padding: spacingV2.lg,
  },
  assessmentLabel: {
    ...typographyV2.label,
    color: colorsV2.textMuted,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: spacingV2.sm,
  },
  assessmentScoreRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: spacingV2.xs,
  },
  assessmentGrade: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#FBBF24',
    marginRight: spacingV2.sm,
  },
  assessmentBadge: {
    borderRadius: borderRadiusV2.sm,
    overflow: 'hidden' as const,
  },
  assessmentBadgeGradient: {
    paddingHorizontal: spacingV2.sm,
    paddingVertical: 3,
    borderRadius: borderRadiusV2.sm,
  },
  assessmentBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#000000',
    letterSpacing: 1,
  },
  assessmentSub: {
    ...typographyV2.bodySmall,
    color: colorsV2.textMuted,
    marginBottom: spacingV2.md,
  },

  // Concern rows
  concernsContainer: {
    backgroundColor: colorsV2.surfaceLight,
    borderRadius: borderRadiusV2.md,
    paddingVertical: spacingV2.sm,
    paddingHorizontal: spacingV2.md,
  },
  concernRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 6,
  },
  concernLabel: {
    ...typographyV2.bodySmall,
    color: colorsV2.textSecondary,
    fontSize: 13,
  },
  concernLevel: {
    ...typographyV2.bodySmall,
    fontWeight: '700' as const,
    fontSize: 13,
  },
  // Score card
  cardWrapper: {
    marginBottom: spacingV2.md,
    position: 'relative' as const,
  },
  scoreCard: {
    backgroundColor: colorsV2.surface,
    borderRadius: borderRadiusV2.xl,
    borderWidth: 1,
    borderColor: colorsV2.border,
    padding: spacingV2.md,
  },

  // Overall score
  overallSection: {
    alignItems: 'center' as const,
    marginBottom: spacingV2.sm,
  },
  scoreBlur: {
    borderRadius: borderRadiusV2.lg,
    marginBottom: 2,
    paddingHorizontal: spacingV2.xl,
    paddingVertical: spacingV2.xs,
  },
  overallRowInner: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
  },
  overallScore: {
    fontSize: 48,
    fontWeight: '800' as const,
    color: colorsV2.accentOrange,
    fontVariant: ['tabular-nums' as const],
  },
  overallMax: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colorsV2.textMuted,
    marginLeft: spacingV2.xs,
  },
  overallLabel: {
    ...typographyV2.caption,
    color: colorsV2.textMuted,
  },

  // Stacked bar
  stackedBarContainer: {
    marginBottom: spacingV2.md,
    position: 'relative' as const,
  },
  overallBarGlow: {
    position: 'absolute' as const,
    top: -2,
    left: 0,
    height: 16,
    borderRadius: 8,
    backgroundColor: colorsV2.accentOrange,
    opacity: 0.4,
    shadowColor: colorsV2.accentOrange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 0,
  },
  barBlur: {
    borderRadius: 8,
    zIndex: 1,
  },
  stackedBarTrack: {
    height: 12,
    backgroundColor: colorsV2.surfaceLight,
    borderRadius: 6,
    overflow: 'hidden' as const,
    position: 'relative' as const,
  },
  potentialBarFill: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 6,
    overflow: 'hidden' as const,
  },
  currentBarFill: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 6,
    overflow: 'hidden' as const,
  },
  barGradientFill: {
    flex: 1,
  },

  divider: {
    height: 1,
    backgroundColor: colorsV2.border,
    marginBottom: spacingV2.md,
  },

  // Category rows
  ratingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
  },
  ratingLabel: {
    ...typographyV2.bodySmall,
    color: colorsV2.textSecondary,
    fontWeight: '600' as const,
    width: 85,
    fontSize: 13,
  },
  barAndScoreArea: {
    flex: 1,
  },
  rowBlur: {
    borderRadius: 6,
  },
  barScoreInner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 2,
  },
  barWrapper: {
    flex: 1,
    marginHorizontal: spacingV2.sm,
    position: 'relative' as const,
  },
  barGlow: {
    position: 'absolute' as const,
    top: -2,
    left: 0,
    height: 12,
    borderRadius: 6,
    opacity: 0.35,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  barTrack: {
    height: 8,
    backgroundColor: colorsV2.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden' as const,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  ratingScore: {
    ...typographyV2.bodySmall,
    fontWeight: '700' as const,
    width: 30,
    textAlign: 'right' as const,
    fontVariant: ['tabular-nums' as const],
  },

  // Sticky footer
  stickyFooter: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
  },
  footerGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  footerContent: {
    paddingHorizontal: spacingV2.lg,
    paddingTop: spacingV2.xl,
  },
  inviteLink: {
    alignItems: 'center' as const,
    paddingVertical: spacingV2.sm,
    paddingBottom: spacingV2.xs,
  },
  inviteLinkText: {
    ...typographyV2.bodySmall,
    color: colorsV2.textMuted,
  },
  inviteLinkHighlight: {
    color: colorsV2.accentPurple,
    fontWeight: '600' as const,
  },

  // Purchase button styles (AB test variant)
  pricingCard: {
    backgroundColor: colorsV2.surface,
    borderRadius: borderRadiusV2.lg,
    borderWidth: 1.5,
    borderColor: colorsV2.border,
    paddingVertical: spacingV2.md,
    paddingHorizontal: spacingV2.lg,
  },
  pricingCardAnnual: {
    borderColor: colorsV2.accentPurple,
    shadowColor: colorsV2.accentPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
    paddingTop: spacingV2.lg,
    paddingBottom: spacingV2.lg,
  },
  pricingRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  pricingTier: {
    ...typographyV2.bodySmall,
    fontWeight: '600' as const,
    color: colorsV2.textSecondary,
    letterSpacing: 0.5,
  },
  pricingTierHighlight: {
    ...typographyV2.bodySmall,
    fontWeight: '700' as const,
    color: '#D8B4FE',
    letterSpacing: 0.5,
    textShadowColor: '#A855F7',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  pricingSubDetail: {
    ...typographyV2.caption,
    color: colorsV2.textMuted,
    marginTop: 2,
  },
  pricingPriceCol: {
    alignItems: 'flex-end' as const,
  },
  pricingAmount: {
    ...typographyV2.subheading,
    color: colorsV2.textPrimary,
    fontWeight: '700' as const,
  },
  pricingAmountHighlight: {
    ...typographyV2.heading,
    color: colorsV2.textPrimary,
    fontWeight: '800' as const,
  },
  pricingPeriod: {
    ...typographyV2.caption,
    color: colorsV2.textMuted,
  },
  trialBadge: {
    position: 'absolute' as const,
    top: -1,
    right: -1,
    borderBottomLeftRadius: borderRadiusV2.sm,
    borderTopRightRadius: borderRadiusV2.lg - 1,
    overflow: 'hidden' as const,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 6,
  },
  trialBadgeGradient: {
    paddingHorizontal: spacingV2.sm + 2,
    paddingVertical: 4,
    borderBottomLeftRadius: borderRadiusV2.sm,
    borderTopRightRadius: borderRadiusV2.lg - 1,
  },
  trialBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700' as const,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  saveBadge: {
    position: 'absolute' as const,
    top: -1,
    right: -1,
    backgroundColor: colorsV2.accentOrange,
    paddingHorizontal: spacingV2.sm,
    paddingVertical: 3,
    borderBottomLeftRadius: borderRadiusV2.sm,
    borderTopRightRadius: borderRadiusV2.lg - 1,
  },
  saveBadgeText: {
    ...typographyV2.caption,
    color: '#FFFFFF',
    fontWeight: '700' as const,
    fontSize: 10,
  },
  cancelText: {
    ...typographyV2.caption,
    color: colorsV2.textMuted,
    textAlign: 'center' as const,
    marginTop: spacingV2.sm,
  },
  footerLinks: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginTop: spacingV2.sm,
  },
  footerLink: {
    ...typographyV2.caption,
    color: colorsV2.textMuted,
  },
  footerDot: {
    ...typographyV2.caption,
    color: colorsV2.textMuted,
    paddingHorizontal: spacingV2.xs,
  },
});
