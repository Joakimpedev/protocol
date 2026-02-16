import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Alert,
  Easing,
  Linking,
  Dimensions,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colorsV2, typographyV2, spacingV2, borderRadiusV2, gradients } from '../../constants/themeV2';
import GradientButton from '../../components/v2/GradientButton';
import V2ScreenWrapper from '../../components/v2/V2ScreenWrapper';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePremium } from '../../contexts/PremiumContext';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { clearOnboardingProgress } from '../../utils/onboardingStorage';
import { formatPrice } from '../../utils/priceUtils';
import {
  getOfferings,
  getWeeklyPackageFromOffering,
  getAnnualPackageFromOffering,
  purchasePackage,
  restorePurchases,
  logInRevenueCat,
} from '../../services/subscriptionService';
import { PurchasesPackage } from 'react-native-purchases';
import { buildOnboardingProperties, POSTHOG_EVENTS, useOnboardingTracking } from '../../hooks/useOnboardingTracking';
import { usePostHog } from 'posthog-react-native';
import { trackTrialStarted as trackTikTokTrialStarted, trackWeeklyPurchase as trackTikTokWeeklyPurchase, identifyUser as identifyTikTokUser, trackCompleteRegistration as trackTikTokRegistration } from '../../services/tiktok';
import { markFriendStartedTrial } from '../../services/referralService';
import { buildRoutineFromOnboarding } from '../../utils/buildRoutineFromOnboarding';
import { useDevMode } from '../../contexts/DevModeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.78;
const CARD_SPACING = spacingV2.md;

type PlanType = 'weekly' | 'annual';

// ─── Mini UI Preview Components ──────────────────────────────────────────────

// Pre-defined cycling states for the ratings preview (10 states)
const RATING_CYCLE_STATES = [
  { overall: 7.8, scores: [7.8, 6.2, 8.1, 5.9, 7.4] },
  { overall: 8.2, scores: [8.2, 7.1, 7.5, 6.8, 7.9] },
  { overall: 7.3, scores: [7.3, 5.9, 8.5, 5.4, 7.1] },
  { overall: 8.4, scores: [8.4, 7.4, 8.0, 7.2, 8.0] },
  { overall: 7.0, scores: [7.0, 6.5, 7.2, 5.1, 7.6] },
  { overall: 7.6, scores: [7.6, 6.8, 7.8, 6.0, 7.2] },
  { overall: 8.0, scores: [8.0, 7.2, 8.3, 6.7, 7.7] },
  { overall: 7.5, scores: [7.5, 6.0, 7.9, 5.6, 8.2] },
  { overall: 8.3, scores: [8.3, 7.3, 7.7, 7.0, 7.5] },
  { overall: 7.2, scores: [7.2, 5.7, 8.6, 5.3, 7.8] },
];

const RATING_CATEGORIES = [
  { label: 'Overall', color: colorsV2.success },
  { label: 'Jawline', color: colorsV2.warning },
  { label: 'Symmetry', color: colorsV2.success },
  { label: 'Skin', color: colorsV2.warning },
  { label: 'Cheekbones', color: colorsV2.success },
];

/** Displays an animated score that tracks an Animated.Value */
function AnimatedScoreText({ animValue, color }: { animValue: Animated.Value; color: string }) {
  const [display, setDisplay] = useState('0.0');
  useEffect(() => {
    const id = animValue.addListener(({ value }: { value: number }) => {
      setDisplay((value * 10).toFixed(1));
    });
    return () => animValue.removeListener(id);
  }, [animValue]);
  return <Text style={[fp.rowScore, { color }]}>{display}</Text>;
}

// ── Slot-machine reel ──────────────────────────────────────────────────────
const REEL_DIGIT_HEIGHT = 58;
// 3 repeats of 0-9 (30 digits) — enough headroom for shortest-path scrolling
const REEL_DIGITS = Array.from({ length: 30 }, (_, i) => i % 10);

/** Shortest distance between two digits on a 0-9 wheel (and direction) */
function reelDistance(from: number, to: number): { steps: number; direction: 1 | -1 } {
  if (from === to) return { steps: 0, direction: 1 };
  const fwd = (to - from + 10) % 10;   // steps scrolling forward (down)
  const bwd = (from - to + 10) % 10;   // steps scrolling backward (up)
  return fwd <= bwd ? { steps: fwd, direction: 1 } : { steps: bwd, direction: -1 };
}

/** Duration for a reel spin based on how many digits it needs to travel */
function reelDuration(steps: number): number {
  if (steps === 0) return 0;
  return 180 + steps * 90; // 1 step ≈ 270ms, 5 steps ≈ 630ms
}

/** A single spinning digit reel — scrolls the shortest path between digits */
function SlotReel({ value, spinTrigger, duration, delay: delayMs = 0 }: {
  value: number;
  spinTrigger: number;
  duration: number;
  delay?: number;
}) {
  const prevRef = useRef(value);
  const scrollY = useRef(new Animated.Value(-(10 + value) * REEL_DIGIT_HEIGHT)).current;

  useEffect(() => {
    if (spinTrigger === 0) return; // don't spin on mount

    const prev = prevRef.current;
    if (prev === value) return; // same digit — nothing to do

    const { steps, direction } = reelDistance(prev, value);
    const startIdx = 10 + prev;
    const endIdx = startIdx + steps * direction; // positive = scroll down, negative = scroll up

    scrollY.setValue(-startIdx * REEL_DIGIT_HEIGHT);

    Animated.timing(scrollY, {
      toValue: -endIdx * REEL_DIGIT_HEIGHT,
      duration,
      delay: delayMs,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      // Snap to canonical position in middle set
      scrollY.setValue(-(10 + value) * REEL_DIGIT_HEIGHT);
      prevRef.current = value;
    });
  }, [spinTrigger]);

  return (
    <View style={fp.reelWindow}>
      <Animated.View style={{ transform: [{ translateY: scrollY }] }}>
        {REEL_DIGITS.map((d, i) => (
          <View key={i} style={fp.reelCell}>
            <Text style={fp.reelDigit}>{d}</Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

/** Facial Ratings preview card content — cycles through pre-defined states */
function RatingsPreview() {
  const initialState = RATING_CYCLE_STATES[0];
  const barAnims = useRef(
    RATING_CATEGORIES.map((_, i) => new Animated.Value(initialState.scores[i] / 10))
  ).current;

  // Slot reel state
  const [intDigit, setIntDigit] = useState(Math.floor(initialState.overall));
  const [decDigit, setDecDigit] = useState(Math.round((initialState.overall % 1) * 10));
  const [spinTrigger, setSpinTrigger] = useState(0);
  const [intDur, setIntDur] = useState(0);
  const [decDur, setDecDur] = useState(0);

  // Track current digits so cycle can compute shortest-path distance
  const intDigitRef = useRef(intDigit);
  const decDigitRef = useRef(decDigit);
  const stateIndexRef = useRef(0);
  const activeRef = useRef(true);

  const REEL_DEC_DELAY = 80;

  useEffect(() => {
    activeRef.current = true;

    const cycle = () => {
      if (!activeRef.current) return;
      stateIndexRef.current = (stateIndexRef.current + 1) % RATING_CYCLE_STATES.length;
      const nextState = RATING_CYCLE_STATES[stateIndexRef.current];

      // 1. Animate bars to new positions (numbers track via listeners)
      Animated.parallel(
        barAnims.map((anim, i) =>
          Animated.timing(anim, {
            toValue: nextState.scores[i] / 10,
            duration: 800,
            useNativeDriver: false,
            easing: Easing.inOut(Easing.cubic),
          })
        )
      ).start(() => {
        if (!activeRef.current) return;
        // 2. Small beat after bars settle
        setTimeout(() => {
          if (!activeRef.current) return;

          // 3. Compute shortest-path durations for each reel
          const newInt = Math.floor(nextState.overall);
          const newDec = Math.round((nextState.overall % 1) * 10);
          const intSteps = reelDistance(intDigitRef.current, newInt).steps;
          const decSteps = reelDistance(decDigitRef.current, newDec).steps;
          const iDur = reelDuration(intSteps);
          const dDur = reelDuration(decSteps);

          // 4. Trigger slot reels with computed durations
          setIntDur(iDur);
          setDecDur(dDur);
          setIntDigit(newInt);
          setDecDigit(newDec);
          setSpinTrigger((prev) => prev + 1);

          intDigitRef.current = newInt;
          decDigitRef.current = newDec;

          // 5. Total reel time = whichever reel finishes last, then 1s hold
          const totalReelTime = Math.max(iDur, REEL_DEC_DELAY + dDur);
          setTimeout(cycle, totalReelTime + 1000);
        }, 300);
      });
    };

    // Start cycling immediately — the first cycle IS the entrance animation
    cycle();

    return () => {
      activeRef.current = false;
    };
  }, []);

  return (
    <View style={fp.container}>
      <Text style={fp.title}>Facial Ratings</Text>
      <Text style={fp.subtitle}>AI-powered analysis</Text>
      <View style={fp.divider} />
      <View style={fp.header}>
        <View style={fp.slotRow}>
          <SlotReel value={intDigit} spinTrigger={spinTrigger} duration={intDur} />
          <Text style={fp.reelDot}>.</Text>
          <SlotReel value={decDigit} spinTrigger={spinTrigger} duration={decDur} delay={REEL_DEC_DELAY} />
        </View>
        <Text style={fp.bigScoreLabel}>/10</Text>
      </View>
      <Text style={fp.headerSubtext}>Overall Rating</Text>
      {RATING_CATEGORIES.map((r, i) => {
        const width = barAnims[i].interpolate({
          inputRange: [0, 1],
          outputRange: ['0%', '100%'],
        });
        return (
          <View key={r.label} style={fp.row}>
            <Text style={fp.rowLabel}>{r.label}</Text>
            <View style={fp.barTrack}>
              <Animated.View style={[fp.barFill, { width, backgroundColor: r.color }]} />
            </View>
            <AnimatedScoreText animValue={barAnims[i]} color={r.color} />
          </View>
        );
      })}
    </View>
  );
}

/** Custom Protocol preview card content */
function ProtocolPreview() {
  const items = [
    { name: 'Niacinamide', status: 'Active', statusColor: colorsV2.success, desc: 'Skin brightening serum' },
    { name: 'Retinol', status: 'Evening', statusColor: colorsV2.accentPurple, desc: 'Anti-aging treatment' },
    { name: 'Mewing', status: 'Daily', statusColor: colorsV2.accentCyan, desc: 'Jawline exercise' },
  ];

  const slideAnims = useRef(items.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      150,
      slideAnims.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          delay: 400,
          useNativeDriver: true,
          tension: 120,
          friction: 10,
        })
      )
    ).start();
  }, []);

  return (
    <View style={pp.container}>
      <Text style={pp.title}>Your Protocol</Text>
      <Text style={pp.subtitle}>Personalized for your goals</Text>
      <View style={pp.divider} />
      {items.map((item, i) => (
        <Animated.View
          key={item.name}
          style={[
            pp.itemCard,
            {
              opacity: slideAnims[i],
              transform: [{
                translateX: slideAnims[i].interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              }],
            },
          ]}
        >
          <View style={pp.itemLeft}>
            <Text style={pp.itemName}>{item.name.toUpperCase()}</Text>
            <Text style={pp.itemDesc}>{item.desc}</Text>
          </View>
          <View style={[pp.statusBadge, { borderColor: item.statusColor }]}>
            <Text style={[pp.statusText, { color: item.statusColor }]}>{item.status}</Text>
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

/** Daily Routines preview card content */
function RoutinesPreview() {
  const routines = [
    { name: 'Morning Routine', steps: 4, mins: 8, done: true },
    { name: 'Evening Routine', steps: 3, mins: 5, done: false },
    { name: 'Exercises', tasks: 5, mins: 12, done: false },
  ];

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(scoreAnim, {
      toValue: 1,
      duration: 1000,
      delay: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={rp.container}>
      <Text style={rp.title}>Daily Routines</Text>
      <Text style={rp.subtitle}>Track your daily progress</Text>
      <View style={rp.divider} />

      {/* Score row — compact inline */}
      <Animated.View style={[rp.scoreSection, { opacity: scoreAnim, transform: [{ scale: pulseAnim }] }]}>
        <View style={rp.scoreRow}>
          <View style={rp.scoreItem}>
            <Text style={rp.scoreValue}>8.2</Text>
            <Text style={rp.scoreLabel}>today</Text>
          </View>
          <View style={rp.scoreDivider} />
          <View style={rp.scoreItem}>
            <Text style={rp.scoreValue}>7.6</Text>
            <Text style={rp.scoreLabel}>this week</Text>
          </View>
        </View>
      </Animated.View>

      {/* Routine cards */}
      {routines.map((r) => (
        <View key={r.name} style={[rp.routineCard, r.done && rp.routineCardDone]}>
          <View style={rp.routineLeft}>
            <Text style={rp.routineName}>{r.name}</Text>
            <Text style={rp.routineMeta}>
              {'steps' in r ? `${r.steps} steps` : `${r.tasks} tasks`} · {r.mins} min
            </Text>
          </View>
          {r.done ? (
            <View style={rp.checkBadge}>
              <Text style={rp.checkMark}>✓</Text>
            </View>
          ) : (
            <View style={rp.startBadge}>
              <Text style={rp.startText}>Start</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

// ─── Feature card data ───────────────────────────────────────────────────────

const FEATURE_CARDS = [
  { key: 'ratings', title: 'Facial Ratings', Component: RatingsPreview },
  { key: 'protocol', title: 'Custom Protocol', Component: ProtocolPreview },
  { key: 'routines', title: 'Daily Routines', Component: RoutinesPreview },
];

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ProPaywallScreen({ navigation, route }: any) {
  useOnboardingTracking('v2_pro_paywall');
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const { isDevModeEnabled, clearForceFlags } = useDevMode();
  const { data, setOnboardingComplete } = useOnboarding();
  const { user, signInAnonymous } = useAuth();
  const { refreshSubscriptionStatus } = usePremium();

  const referralOnly = route?.params?.referralOnly === true;
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(referralOnly ? 'annual' : 'annual');
  const [finishing, setFinishing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [weeklyPackage, setWeeklyPackage] = useState<PurchasesPackage | null>(null);
  const [annualPackage, setAnnualPackage] = useState<PurchasesPackage | null>(null);
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);

  const anims = useScreenEntrance(4);
  const weeklyScale = useRef(new Animated.Value(1)).current;
  const annualScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const offering = await getOfferings();
        if (cancelled) return;
        const weekly = getWeeklyPackageFromOffering(offering, false);
        const annual = getAnnualPackageFromOffering(offering);
        setWeeklyPackage(weekly ?? null);
        setAnnualPackage(annual ?? null);
        console.log('[ProPaywall] Loaded packages:', {
          referralOnly,
          weeklyId: weekly?.identifier,
          weeklyProductId: weekly?.product?.identifier,
          weeklyPrice: weekly?.product?.priceString,
          annualId: annual?.identifier,
          annualProductId: annual?.product?.identifier,
          annualPrice: annual?.product?.priceString,
        });
      } catch (error) {
        console.warn('[ProPaywall] Failed to load offerings:', error);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSelectPlan = (plan: PlanType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlan(plan);
    const targetScale = plan === 'weekly' ? weeklyScale : annualScale;
    const otherScale = plan === 'weekly' ? annualScale : weeklyScale;
    Animated.parallel([
      Animated.sequence([
        Animated.spring(targetScale, { toValue: 1.03, useNativeDriver: true, tension: 300, friction: 10 }),
        Animated.spring(targetScale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }),
      ]),
      Animated.spring(otherScale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }),
    ]).start();
  };

  const handlePurchase = async () => {
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
        navigation.navigate('V2FaceRating'); setFinishing(false); return;
      }
      const pkg = selectedPlan === 'weekly' ? weeklyPackage : annualPackage;
      if (!pkg) { Alert.alert('Not Ready', 'Subscription options are still loading.'); setFinishing(false); return; }
      const result = await purchasePackage(pkg);
      if (result.success) {
        const existing = await getDoc(userRef);
        if (existing.exists()) { await updateDoc(userRef, routinePayload); }
        else { await setDoc(userRef, routinePayload); }
        if (posthog) {
          const baseProps = buildOnboardingProperties(data) as Record<string, string | number | boolean | null | string[]>;
          posthog.capture(selectedPlan === 'weekly' ? POSTHOG_EVENTS.WEEKLY_PURCHASE : POSTHOG_EVENTS.WEEKLY_PURCHASE, { ...baseProps, plan_type: selectedPlan });
        }
        // TikTok: identify user, track correct event per plan, send value
        try { await identifyTikTokUser(uid!); } catch {}
        try { await trackTikTokRegistration('apple', uid); } catch {}
        const price = pkg.product?.price;
        const currency = pkg.product?.currencyCode;
        if (selectedPlan === 'weekly') {
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

  const onFeatureScroll = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_SPACING));
    setActiveFeatureIndex(Math.max(0, Math.min(index, FEATURE_CARDS.length - 1)));
  };

  const weeklyPrice = weeklyPackage?.product?.priceString || '$3.99';
  const annualPrice = annualPackage?.product?.priceString || '$29.99';

  // Calculate actual savings percentage when both packages are loaded
  const weeklyRaw = weeklyPackage?.product?.price;
  const annualRaw = annualPackage?.product?.price;
  let savePct = 85; // fallback until both load
  if (weeklyRaw && annualRaw && weeklyRaw > 0) {
    const yearlyCostAtWeekly = weeklyRaw * 52;
    savePct = Math.round(((yearlyCostAtWeekly - annualRaw) / yearlyCostAtWeekly) * 100);
  }

  return (
    <V2ScreenWrapper showProgress={false} scrollable>
      {/* Header */}
      <Animated.View style={[styles.headerContainer, { opacity: anims[0].opacity, transform: anims[0].transform }]}>
        <Text style={styles.headline}>{referralOnly ? 'Your Free Trial Offer' : 'Protocol Pro'}</Text>
        <Text style={styles.subtitle}>{referralOnly ? 'Your room is complete — claim your free trial' : 'Unlock your full potential'}</Text>
      </Animated.View>

      {/* Feature Carousel - actual rendered UI cards */}
      <Animated.View style={[styles.carouselContainer, { opacity: anims[1].opacity, transform: anims[1].transform }]}>
        <FlatList
          data={FEATURE_CARDS}
          horizontal
          pagingEnabled={false}
          snapToInterval={CARD_WIDTH + CARD_SPACING}
          snapToAlignment="start"
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          onScroll={onFeatureScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.carouselContent}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <View style={styles.featureCard}>
              <item.Component />
            </View>
          )}
        />
        {/* Page dots */}
        <View style={styles.dotsContainer}>
          {FEATURE_CARDS.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeFeatureIndex && styles.dotActive]} />
          ))}
        </View>
      </Animated.View>

      {/* Pricing Section - screenshot-inspired layout */}
      <Animated.View style={[styles.pricingContainer, { opacity: anims[2].opacity, transform: anims[2].transform }]}>
        {/* Weekly (top, not selected by default) - hidden in referral-only mode */}
        {!referralOnly && (
          <TouchableOpacity activeOpacity={0.8} onPress={() => handleSelectPlan('weekly')}>
            <Animated.View style={[styles.pricingCard, selectedPlan === 'weekly' && styles.pricingCardSelected, { transform: [{ scale: weeklyScale }] }]}>
              <View style={styles.pricingRow}>
                <Text style={styles.pricingTier}>WEEKLY ACCESS</Text>
                <View style={styles.pricingPriceCol}>
                  <Text style={styles.pricingAmount}>{weeklyPrice}</Text>
                  <Text style={styles.pricingPeriod}>per week</Text>
                </View>
              </View>
            </Animated.View>
          </TouchableOpacity>
        )}

        {/* Yearly (bottom, selected by default, with SAVE badge) */}
        <TouchableOpacity activeOpacity={0.8} onPress={() => handleSelectPlan('annual')}>
          <Animated.View style={[styles.pricingCard, styles.pricingCardAnnual, selectedPlan === 'annual' && styles.pricingCardSelected, styles.pricingCardGlow, { transform: [{ scale: annualScale }] }]}>
            {/* Badge */}
            <View style={[styles.saveBadge, referralOnly && styles.saveBadgeGlow]}>
              <Text style={styles.saveBadgeText}>{referralOnly ? 'SPECIAL OFFER' : `SAVE ${savePct}%`}</Text>
            </View>
            <View style={styles.pricingRow}>
              <View>
                <Text style={[styles.pricingTierHighlight, referralOnly && styles.pricingTierGlow]}>{referralOnly ? '3 DAYS FREE' : 'YEARLY ACCESS'}</Text>
                <Text style={styles.pricingSubDetail}>{referralOnly ? `Then ${annualPrice}/year` : `Just ${annualPrice} per year`}</Text>
              </View>
              <View style={styles.pricingPriceCol}>
                <Text style={styles.pricingAmountHighlight}>
                  {/* Calculate approximate weekly from annual */}
                  {annualPackage?.product?.price && annualPackage?.product?.currencyCode
                    ? formatPrice(annualPackage.product.price / 52, annualPackage.product.currencyCode)
                    : '$0.58'}
                </Text>
                <Text style={styles.pricingPeriod}>per week</Text>
              </View>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>

      {/* CTA + Footer */}
      <Animated.View style={[styles.ctaSection, { opacity: anims[3].opacity, transform: anims[3].transform }]}>
        <GradientButton
          title={finishing ? '...' : referralOnly ? 'Start Your Free Trial' : 'Get your results'}
          onPress={handlePurchase}
          disabled={finishing}
        />
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
      </Animated.View>
    </V2ScreenWrapper>
  );
}

// ─── Feature Preview Styles ──────────────────────────────────────────────────

const fp = StyleSheet.create({
  container: { padding: spacingV2.lg },
  title: { ...typographyV2.heading, fontSize: 20, marginBottom: 2 },
  subtitle: { ...typographyV2.caption, color: colorsV2.textMuted, marginBottom: spacingV2.md },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  // Slot reel styles
  slotRow: { flexDirection: 'row', alignItems: 'center' },
  reelWindow: { height: REEL_DIGIT_HEIGHT, overflow: 'hidden' },
  reelCell: { height: REEL_DIGIT_HEIGHT, justifyContent: 'center' },
  reelDigit: { fontSize: 48, fontWeight: '800', color: colorsV2.accentOrange, lineHeight: REEL_DIGIT_HEIGHT, fontVariant: ['tabular-nums'], includeFontPadding: false },
  reelDot: { fontSize: 48, fontWeight: '800', color: colorsV2.accentOrange, lineHeight: REEL_DIGIT_HEIGHT, includeFontPadding: false, marginHorizontal: -2 },
  bigScoreLabel: { fontSize: 20, fontWeight: '600', color: colorsV2.textMuted, marginLeft: 4 },
  headerSubtext: { ...typographyV2.caption, color: colorsV2.textMuted, marginBottom: spacingV2.md },
  divider: { height: 1, backgroundColor: colorsV2.border, marginBottom: spacingV2.md },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  rowLabel: { ...typographyV2.bodySmall, color: colorsV2.textSecondary, width: 95, fontWeight: '600' },
  barTrack: { flex: 1, height: 6, backgroundColor: colorsV2.surfaceLight, borderRadius: 3, overflow: 'hidden', marginHorizontal: spacingV2.sm },
  barFill: { height: '100%', borderRadius: 3 },
  rowScore: { ...typographyV2.bodySmall, fontWeight: '700', width: 28, textAlign: 'right', fontVariant: ['tabular-nums'] },
});

const pp = StyleSheet.create({
  container: { padding: spacingV2.lg },
  title: { ...typographyV2.heading, fontSize: 20, marginBottom: 2 },
  subtitle: { ...typographyV2.caption, color: colorsV2.textMuted, marginBottom: spacingV2.md },
  divider: { height: 1, backgroundColor: colorsV2.border, marginBottom: spacingV2.md },
  itemCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colorsV2.surfaceLight, borderRadius: borderRadiusV2.md,
    borderWidth: 1, borderColor: colorsV2.border, padding: spacingV2.md, marginBottom: spacingV2.sm,
  },
  itemLeft: { flex: 1 },
  itemName: { ...typographyV2.bodySmall, fontWeight: '700', color: colorsV2.textPrimary, letterSpacing: 1, marginBottom: 2 },
  itemDesc: { ...typographyV2.caption, color: colorsV2.textMuted },
  statusBadge: { borderWidth: 1.5, borderRadius: borderRadiusV2.sm, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
});

const rp = StyleSheet.create({
  container: { padding: spacingV2.lg },
  title: { ...typographyV2.heading, fontSize: 20, marginBottom: 2 },
  subtitle: { ...typographyV2.caption, color: colorsV2.textMuted, marginBottom: spacingV2.md },
  scoreSection: { alignItems: 'center', marginBottom: spacingV2.sm },
  scoreRow: { flexDirection: 'row', alignItems: 'center' },
  scoreItem: { alignItems: 'center', paddingHorizontal: spacingV2.lg },
  scoreValue: { fontSize: 26, fontWeight: '800', color: colorsV2.textPrimary, fontVariant: ['tabular-nums'] },
  scoreLabel: { ...typographyV2.caption, color: colorsV2.textMuted, marginTop: 1 },
  scoreDivider: { width: 1, height: 26, backgroundColor: colorsV2.border },
  divider: { height: 1, backgroundColor: colorsV2.border, marginBottom: spacingV2.sm },
  routineCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colorsV2.surfaceLight, borderRadius: borderRadiusV2.md,
    borderWidth: 1, borderColor: colorsV2.border, paddingVertical: 10, paddingHorizontal: spacingV2.md, marginBottom: 6,
  },
  routineCardDone: { opacity: 0.6 },
  routineLeft: { flex: 1 },
  routineName: { ...typographyV2.body, fontWeight: '600', fontSize: 13, marginBottom: 1 },
  routineMeta: { ...typographyV2.caption, color: colorsV2.textMuted, fontSize: 10 },
  checkBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: colorsV2.success, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  startBadge: { backgroundColor: colorsV2.surfaceLight, borderWidth: 1, borderColor: colorsV2.textMuted, borderRadius: borderRadiusV2.sm, paddingHorizontal: 10, paddingVertical: 3 },
  startText: { ...typographyV2.caption, color: colorsV2.textSecondary, fontWeight: '600', fontSize: 10 },
});

// ─── Main Screen Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  headerContainer: { marginTop: spacingV2.xl + spacingV2.md, marginBottom: spacingV2.lg },
  headline: { ...typographyV2.hero, textAlign: 'center', marginBottom: spacingV2.xs },
  subtitle: { ...typographyV2.body, color: colorsV2.textSecondary, textAlign: 'center' },

  // Carousel
  carouselContainer: { marginBottom: spacingV2.xl, marginHorizontal: -spacingV2.lg },
  carouselContent: { paddingHorizontal: spacingV2.lg },
  featureCard: {
    width: CARD_WIDTH,
    borderRadius: borderRadiusV2.xl,
    overflow: 'hidden',
    marginRight: CARD_SPACING,
    backgroundColor: colorsV2.surface,
    borderWidth: 1,
    borderColor: colorsV2.border,
  },
  dotsContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacingV2.md, gap: spacingV2.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colorsV2.textMuted + '40' },
  dotActive: { backgroundColor: colorsV2.accentOrange, width: 24 },

  // Pricing - screenshot-inspired
  pricingContainer: { marginBottom: spacingV2.lg, gap: spacingV2.sm },
  pricingCard: {
    backgroundColor: colorsV2.surface,
    borderRadius: borderRadiusV2.lg,
    borderWidth: 1.5,
    borderColor: colorsV2.border,
    paddingVertical: spacingV2.md,
    paddingHorizontal: spacingV2.lg,
  },
  pricingCardAnnual: {
    borderColor: colorsV2.accentPurple + '60',
  },
  pricingCardSelected: {
    borderColor: colorsV2.accentOrange,
  },
  pricingCardGlow: {
    borderColor: colorsV2.accentPurple,
    shadowColor: colorsV2.accentPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pricingTier: {
    ...typographyV2.bodySmall,
    fontWeight: '600',
    color: colorsV2.textSecondary,
    letterSpacing: 0.5,
  },
  pricingTierHighlight: {
    ...typographyV2.bodySmall,
    fontWeight: '700',
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
    alignItems: 'flex-end',
  },
  pricingAmount: {
    ...typographyV2.subheading,
    color: colorsV2.textPrimary,
    fontWeight: '700',
  },
  pricingAmountHighlight: {
    ...typographyV2.heading,
    color: colorsV2.textPrimary,
    fontWeight: '800',
  },
  pricingPeriod: {
    ...typographyV2.caption,
    color: colorsV2.textMuted,
  },
  saveBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    backgroundColor: colorsV2.accentOrange,
    paddingHorizontal: spacingV2.sm,
    paddingVertical: 3,
    borderBottomLeftRadius: borderRadiusV2.sm,
    borderTopRightRadius: borderRadiusV2.lg - 1,
  },
  saveBadgeGlow: {
    shadowColor: colorsV2.accentOrange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 6,
  },
  saveBadgeText: {
    ...typographyV2.caption,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 10,
  },
  pricingTierGlow: {
    color: '#D8B4FE',
    textShadowColor: '#A855F7',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },

  // CTA
  ctaSection: { marginBottom: spacingV2.md },
  cancelText: { ...typographyV2.caption, color: colorsV2.textMuted, textAlign: 'center', marginTop: spacingV2.sm },

  // Footer
  footerLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacingV2.lg, marginBottom: spacingV2.md },
  footerLink: { ...typographyV2.caption, color: colorsV2.textMuted },
  footerDot: { ...typographyV2.caption, color: colorsV2.textMuted, paddingHorizontal: spacingV2.xs },
});
