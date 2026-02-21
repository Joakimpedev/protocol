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
  AppState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colorsV2, typographyV2, spacingV2, borderRadiusV2, gradients } from '../../constants/themeV2';
import V2ScreenWrapper from '../../components/v2/V2ScreenWrapper';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { CATEGORIES } from '../../constants/categories';
import { useAuth } from '../../contexts/AuthContext';
import { usePremium } from '../../contexts/PremiumContext';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { clearOnboardingProgress } from '../../utils/onboardingStorage';
import { formatPrice } from '../../utils/priceUtils';
import {
  getOfferings,
  getMonthlyPackageFromOffering,
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
import { cancelAbandonedCartNotification, clearAbandonedCartQuickAction, scheduleAbandonedCartNotification } from '../../services/notificationService';

const guideBlocks = require('../../data/guide_blocks.json');

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.78;
const CARD_SPACING = spacingV2.md;

type PlanType = 'monthly' | 'annual';

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
      <View style={fp.scoreGlow}>
        <View style={fp.header}>
          <View style={fp.slotRow}>
            <SlotReel value={intDigit} spinTrigger={spinTrigger} duration={intDur} />
            <Text style={fp.reelDot}>.</Text>
            <SlotReel value={decDigit} spinTrigger={spinTrigger} duration={decDur} delay={REEL_DEC_DELAY} />
          </View>
          <Text style={fp.bigScoreLabel}>/10</Text>
        </View>
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
            <View style={fp.barTrackWrap}>
              <Animated.View style={[fp.barGlow, { width, backgroundColor: r.color, shadowColor: r.color }]} />
              <View style={fp.barTrack}>
                <Animated.View style={[fp.barFill, { width, backgroundColor: r.color }]} />
              </View>
            </View>
            <AnimatedScoreText animValue={barAnims[i]} color={r.color} />
          </View>
        );
      })}
    </View>
  );
}

function getProblemDisplayName(problemId: string): string {
  const c = CATEGORIES.find((cat: any) => cat.id === problemId);
  return c ? c.label.split(' / ')[0] : problemId.charAt(0).toUpperCase() + problemId.slice(1).replace(/_/g, ' ');
}

// ─── Timeline data per problem ─────────────────────────────────────────────
const PROBLEM_TIMELINES: Record<string, { firstWeek: string; fullWeek: string; subtitle: string }> = {
  jawline:          { firstWeek: '3-4',  fullWeek: '10-16', subtitle: 'Muscle tone visible' },
  acne:             { firstWeek: '2-3',  fullWeek: '6-10',  subtitle: 'Fewer breakouts' },
  oily_skin:        { firstWeek: '1-2',  fullWeek: '4-6',   subtitle: 'Reduced shine' },
  dry_skin:         { firstWeek: '1-2',  fullWeek: '3-5',   subtitle: 'Hydration restored' },
  blackheads:       { firstWeek: '2-3',  fullWeek: '6-8',   subtitle: 'Pores visibly clearer' },
  dark_circles:     { firstWeek: '3-4',  fullWeek: '8-12',  subtitle: 'Under-eye brightening' },
  skin_texture:     { firstWeek: '2-4',  fullWeek: '8-12',  subtitle: 'Smoother surface' },
  hyperpigmentation: { firstWeek: '4-6', fullWeek: '12-16', subtitle: 'Spots begin to fade' },
  facial_hair:      { firstWeek: '4-8',  fullWeek: '12-24', subtitle: 'New growth visible' },
};

function getRoutineStats(selectedProblemIds: string[]): {
  morningSteps: number;
  eveningSteps: number;
  exerciseCount: number;
  totalMinutes: number;
} {
  const problems: Array<{ problem_id: string; recommended_ingredients: string[]; recommended_exercises: string[] }> = guideBlocks.problems || [];
  const ingredients: Array<{
    ingredient_id: string;
    timing_options?: string[];
    session?: { duration_seconds?: number | null; wait_after_seconds?: number };
  }> = guideBlocks.ingredients || [];
  const exercises: Array<{
    exercise_id: string;
    session?: { duration_seconds?: number };
    default_duration?: number;
  }> = guideBlocks.exercises || [];

  const ingredientIds = new Set<string>();
  const exerciseIds = new Set<string>();
  selectedProblemIds.forEach((id) => {
    const p = problems.find((x) => x.problem_id === id);
    if (p) {
      (p.recommended_ingredients || []).forEach((ing) => ingredientIds.add(ing));
      (p.recommended_exercises || []).forEach((ex) => exerciseIds.add(ex));
    }
  });

  let morningSteps = 0;
  let eveningSteps = 0;
  let morningSeconds = 0;
  let eveningSeconds = 0;

  ingredientIds.forEach((ingId) => {
    const ing = ingredients.find((i) => i.ingredient_id === ingId);
    const opts = ing?.timing_options ?? [];
    const duration = ing?.session?.duration_seconds ?? 30;
    const wait = ing?.session?.wait_after_seconds ?? 0;
    const stepTime = (typeof duration === 'number' ? duration : 30) + wait;

    if (opts.includes('morning')) { morningSteps += 1; morningSeconds += stepTime; }
    if (opts.includes('evening')) { eveningSteps += 1; eveningSeconds += stepTime; }
  });

  let exerciseSeconds = 0;
  exerciseIds.forEach((exId) => {
    const ex = exercises.find((e) => e.exercise_id === exId);
    if (ex?.session?.duration_seconds) { exerciseSeconds += ex.session.duration_seconds; }
    else if (ex?.default_duration) { exerciseSeconds += ex.default_duration; }
  });

  return {
    morningSteps: Math.max(1, morningSteps),
    eveningSteps: Math.max(1, eveningSteps),
    exerciseCount: exerciseIds.size,
    totalMinutes: Math.max(1, Math.round((morningSeconds + eveningSeconds + exerciseSeconds) / 60)),
  };
}

/** Protocol preview — consolidated morning/evening/exercise card */
function ProtocolPreview() {
  const { data } = useOnboarding();
  const selectedProblems = data.selectedProblems?.length ? data.selectedProblems : data.selectedCategories ?? [];
  const { morningSteps, eveningSteps, exerciseCount, totalMinutes } = getRoutineStats(selectedProblems);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rowAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    // Pulse on time badge
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 1500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    );
    loop.start();

    // Staggered fade-in for rows
    const stagger = Animated.stagger(100,
      rowAnims.map(anim =>
        Animated.timing(anim, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true, easing: Easing.out(Easing.cubic) })
      )
    );
    stagger.start();

    return () => loop.stop();
  }, []);

  const routineRows = [
    { section: 'MORNING', label: 'Skincare routine', value: `${morningSteps} steps`, color: '#F59E0B' },
    { section: 'EVENING', label: 'Skincare routine', value: `${eveningSteps} steps`, color: '#818CF8' },
    ...(exerciseCount > 0 ? [{ section: 'EXERCISES', label: 'Face & jaw training', value: `${exerciseCount} exercises`, color: '#34D399' }] : []),
  ];

  return (
    <View style={proto.container}>
      {/* Time badge */}
      <Animated.View style={[proto.timeBadgeRow, { transform: [{ scale: pulseAnim }] }]}>
        <View style={proto.timeBadgeGlow}>
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={proto.timeBadge}
          >
            <Text style={proto.timeBadgeText}>{totalMinutes} min/day</Text>
          </LinearGradient>
        </View>
      </Animated.View>

      {/* Routine rows */}
      {routineRows.map((item, i) => (
        <Animated.View key={item.section} style={{ opacity: rowAnims[i] }}>
          <Text style={proto.sectionLabel}>{item.section}</Text>
          <View style={[proto.routineRow, { borderLeftColor: item.color }]}>
            <Text style={proto.routineLabel}>{item.label}</Text>
            <View style={[proto.routineValueBadge, { backgroundColor: item.color + '15', borderColor: item.color + '30' }]}>
              <Text style={[proto.routineValue, { color: item.color }]}>{item.value}</Text>
            </View>
          </View>
        </Animated.View>
      ))}

      {/* Based on tags */}
      {selectedProblems.length > 0 && (
        <Animated.View style={[proto.basedOn, { opacity: rowAnims[routineRows.length] || rowAnims[routineRows.length - 1] }]}>
          <Text style={proto.basedOnLabel}>Based on</Text>
          <View style={proto.basedOnTags}>
            {selectedProblems.slice(0, 4).map((id: string) => (
              <View key={id} style={proto.tag}>
                <Text style={proto.tagText}>{getProblemDisplayName(id)}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

/** Timeline preview — personalized results timeline */
function TimelinePreview() {
  const { data } = useOnboarding();
  const selectedProblems = data.selectedProblems?.length ? data.selectedProblems : data.selectedCategories ?? [];

  // Build timeline nodes sorted by firstWeek ascending (fastest results first)
  const timelineNodes = selectedProblems
    .filter((id: string) => PROBLEM_TIMELINES[id])
    .map((id: string) => ({
      id,
      name: getProblemDisplayName(id),
      ...PROBLEM_TIMELINES[id],
      firstWeekNum: parseInt(PROBLEM_TIMELINES[id].firstWeek.split('-')[0], 10),
    }))
    .sort((a: any, b: any) => a.firstWeekNum - b.firstWeekNum)
    .slice(0, 4);

  // Find the longest full timeline for the final node
  const longestFull = timelineNodes.length > 0
    ? timelineNodes.reduce((max: any, n: any) => {
        const end = parseInt(n.fullWeek.split('-')[1], 10);
        return end > max ? end : max;
      }, 0)
    : 12;

  // Animations: stagger each node 150ms
  const nodeAnims = useRef(timelineNodes.map(() => new Animated.Value(0))).current;
  const finalNodeAnim = useRef(new Animated.Value(0)).current;
  const progressAnims = useRef(timelineNodes.map(() => new Animated.Value(0))).current;
  const finalProgressAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Stagger node fade-ins
    const nodeStagger = Animated.stagger(150, [
      ...nodeAnims.map(anim =>
        Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: false, easing: Easing.out(Easing.cubic) })
      ),
      Animated.timing(finalNodeAnim, { toValue: 1, duration: 400, useNativeDriver: false, easing: Easing.out(Easing.cubic) }),
    ]);

    // After nodes appear, fill progress bars
    nodeStagger.start(() => {
      Animated.stagger(100, [
        ...progressAnims.map(anim =>
          Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: false, easing: Easing.out(Easing.cubic) })
        ),
        Animated.timing(finalProgressAnim, { toValue: 1, duration: 800, useNativeDriver: false, easing: Easing.out(Easing.cubic) }),
      ]).start();
    });

    // Glow pulse on final dot
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.8, duration: 1500, useNativeDriver: false, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1500, useNativeDriver: false, easing: Easing.inOut(Easing.ease) }),
      ])
    );
    glow.start();
    return () => glow.stop();
  }, []);

  // Calculate progress percentage for each node relative to longest timeline
  const maxWeek = Math.max(longestFull, 12);

  return (
    <View style={tl.container}>
      {timelineNodes.map((node: any, i: number) => {
        const endWeek = parseInt(node.firstWeek.split('-')[1], 10);
        const progressPct = Math.min(endWeek / maxWeek, 1);
        const barWidth = progressAnims[i]?.interpolate({
          inputRange: [0, 1],
          outputRange: ['0%', `${Math.round(progressPct * 100)}%`],
        });

        return (
          <Animated.View key={node.id} style={[tl.nodeWrap, { opacity: nodeAnims[i], transform: [{ translateX: nodeAnims[i].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
            <View style={tl.nodeRow}>
              <View style={tl.dotCol}>
                <View style={tl.dot} />
                <View style={tl.line} />
              </View>
              <View style={tl.nodeContent}>
                <View style={tl.nodeHeader}>
                  <Text style={tl.nodeName}>{node.name}</Text>
                  <View style={tl.weekBadge}>
                    <Text style={tl.weekText}>Week {node.firstWeek}</Text>
                  </View>
                </View>
                <Text style={tl.nodeSubtitle}>{node.subtitle}</Text>
                <View style={tl.barTrack}>
                  <Animated.View style={[tl.barFill, { width: barWidth }]}>
                    <LinearGradient
                      colors={gradients.primary}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={tl.barGradient}
                    />
                  </Animated.View>
                </View>
              </View>
            </View>
          </Animated.View>
        );
      })}

      {/* Final transformation node */}
      <Animated.View style={[tl.nodeWrap, { opacity: finalNodeAnim, transform: [{ translateX: finalNodeAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
        <View style={tl.nodeRow}>
          <View style={tl.dotCol}>
            <Animated.View style={[tl.dotFinal, { shadowOpacity: glowAnim }]} />
          </View>
          <View style={tl.nodeContent}>
            <View style={tl.nodeHeader}>
              <Text style={tl.nodeName}>Full transformation</Text>
              <LinearGradient
                colors={gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={tl.weekBadgeFinal}
              >
                <Text style={tl.weekTextFinal}>Week 8-{longestFull > 12 ? longestFull : 12}</Text>
              </LinearGradient>
            </View>
            <View style={tl.barTrack}>
              <Animated.View style={[tl.barFill, { width: finalProgressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}>
                <LinearGradient
                  colors={gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={tl.barGradient}
                />
              </Animated.View>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Feature card data ───────────────────────────────────────────────────────

const FEATURE_CARDS = [
  { key: 'ratings',  step: 1, title: 'We analyze your face',          subtitle: 'Scored across 5 categories by AI',      Component: RatingsPreview },
  { key: 'protocol', step: 2, title: 'You get a personalized routine', subtitle: 'Morning, evening & exercises built for you', Component: ProtocolPreview },
  { key: 'timeline', step: 3, title: 'You start seeing results',       subtitle: 'Week-by-week based on your concerns',    Component: TimelinePreview },
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
  const [finishing, setFinishing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [annualPackage, setAnnualPackage] = useState<PurchasesPackage | null>(null);
  const anims = useScreenEntrance(4);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const offering = await getOfferings();
        if (cancelled) return;
        const monthly = getMonthlyPackageFromOffering(offering);
        const annual = getAnnualPackageFromOffering(offering);
        setMonthlyPackage(monthly ?? null);
        setAnnualPackage(annual ?? null);
        console.log('[ProPaywall] Loaded packages:', {
          referralOnly,
          monthlyId: monthly?.identifier,
          monthlyProductId: monthly?.product?.identifier,
          monthlyPrice: monthly?.product?.priceString,
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

  // Schedule abandoned cart notification when user backgrounds from this paywall
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        scheduleAbandonedCartNotification();
      }
    });
    return () => subscription.remove();
  }, []);

  const handlePurchase = async (plan: PlanType = 'annual') => {
    const purchasePlan = plan;
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
      const pkg = purchasePlan === 'monthly' ? monthlyPackage : annualPackage;
      if (!pkg) { Alert.alert('Not Ready', 'Subscription options are still loading.'); setFinishing(false); return; }
      const result = await purchasePackage(pkg);
      if (result.success) {
        cancelAbandonedCartNotification(); clearAbandonedCartQuickAction();
        const existing = await getDoc(userRef);
        if (existing.exists()) { await updateDoc(userRef, routinePayload); }
        else { await setDoc(userRef, routinePayload); }
        if (posthog) {
          const baseProps = buildOnboardingProperties(data) as Record<string, string | number | boolean | null | string[]>;
          posthog.capture(POSTHOG_EVENTS.WEEKLY_PURCHASE, { ...baseProps, plan_type: purchasePlan });
        }
        // TikTok: identify user, track correct event per plan, send value
        try { await identifyTikTokUser(uid!); } catch {}
        try { await trackTikTokRegistration('apple', uid); } catch {}
        const price = pkg.product?.price;
        const currency = pkg.product?.currencyCode;
        if (purchasePlan === 'monthly') {
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

  const monthlyPrice = monthlyPackage?.product?.priceString || '$9.99';
  const annualPrice = annualPackage?.product?.priceString || '$29.99';

  // Calculate actual savings percentage when both packages are loaded
  const monthlyRaw = monthlyPackage?.product?.price;
  const annualRaw = annualPackage?.product?.price;
  let savePct = 75; // fallback until both load
  if (monthlyRaw && annualRaw && monthlyRaw > 0) {
    const yearlyCostAtMonthly = monthlyRaw * 12;
    savePct = Math.round(((yearlyCostAtMonthly - annualRaw) / yearlyCostAtMonthly) * 100);
  }

  return (
    <V2ScreenWrapper showProgress={false} scrollable>
      {/* Header */}
      <Animated.View style={[styles.headerContainer, { opacity: anims[0].opacity, transform: anims[0].transform }]}>
        <Text style={styles.headline}>{referralOnly ? 'Your Free Trial Offer' : <>Your Next <Text style={styles.headlineAccent}>12 Weeks</Text></>}</Text>
        {!referralOnly && <Text style={styles.headlineSubtitle}>This is how you will change</Text>}
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
          scrollEventThrottle={16}
          contentContainerStyle={styles.carouselContent}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <View style={styles.featureCard}>
              <View style={styles.cardHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>{item.step}</Text>
                </View>
                <View style={styles.cardTitleCol}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
              <View style={styles.cardDivider} />
              <View style={styles.cardContent}>
                <item.Component />
              </View>
            </View>
          )}
        />
      </Animated.View>

      {/* Pricing Section — tap to purchase directly */}
      <Animated.View style={[styles.pricingContainer, { opacity: anims[2].opacity, transform: anims[2].transform }]}>
        {/* Monthly — hidden in referral-only mode */}
        {!referralOnly && (
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

        {/* Yearly (with SAVE badge) */}
        <TouchableOpacity activeOpacity={0.8} onPress={() => handlePurchase('annual')} disabled={finishing}>
          <View style={[styles.pricingCard, styles.pricingCardAnnual, styles.pricingCardGlow]}>
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
                  {annualPackage?.product?.price && annualPackage?.product?.currencyCode
                    ? formatPrice(annualPackage.product.price / 52, annualPackage.product.currencyCode)
                    : '$0.58'}
                </Text>
                <Text style={styles.pricingPeriod}>per week</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        <Text style={styles.cancelText}>cancel anytime</Text>
      </Animated.View>

      {/* Footer */}
      <Animated.View style={[styles.ctaSection, { opacity: anims[3].opacity, transform: anims[3].transform }]}>
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
  container: { padding: spacingV2.lg, paddingTop: spacingV2.sm },
  scoreGlow: {
    shadowColor: colorsV2.accentOrange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 6,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  // Slot reel styles
  slotRow: { flexDirection: 'row', alignItems: 'center' },
  reelWindow: { height: REEL_DIGIT_HEIGHT, overflow: 'hidden' },
  reelCell: { height: REEL_DIGIT_HEIGHT, justifyContent: 'center' },
  reelDigit: { fontSize: 48, fontWeight: '800', color: colorsV2.accentOrange, lineHeight: REEL_DIGIT_HEIGHT, fontVariant: ['tabular-nums'], includeFontPadding: false },
  reelDot: { fontSize: 48, fontWeight: '800', color: colorsV2.accentOrange, lineHeight: REEL_DIGIT_HEIGHT, includeFontPadding: false, marginHorizontal: -2 },
  bigScoreLabel: { fontSize: 20, fontWeight: '600', color: colorsV2.textMuted, marginLeft: 4 },
  headerSubtext: { ...typographyV2.caption, color: colorsV2.textMuted, marginBottom: spacingV2.md },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  rowLabel: { ...typographyV2.bodySmall, color: colorsV2.textSecondary, width: 95, fontWeight: '600' },
  barTrackWrap: { flex: 1, marginHorizontal: spacingV2.sm, position: 'relative', height: 6 },
  barGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  barTrack: { flex: 1, height: 6, backgroundColor: colorsV2.surfaceLight, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  rowScore: { ...typographyV2.bodySmall, fontWeight: '700', width: 28, textAlign: 'right', fontVariant: ['tabular-nums'] },
});

const proto = StyleSheet.create({
  container: { padding: spacingV2.lg, paddingTop: spacingV2.sm },
  timeBadgeRow: { alignItems: 'center', marginBottom: spacingV2.md },
  timeBadgeGlow: {
    borderRadius: borderRadiusV2.pill,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  timeBadge: { borderRadius: borderRadiusV2.pill, paddingHorizontal: spacingV2.lg, paddingVertical: spacingV2.xs + 3 },
  timeBadgeText: { ...typographyV2.body, fontWeight: '700', color: '#FFFFFF', fontSize: 16 },
  sectionLabel: {
    ...typographyV2.label,
    color: colorsV2.textMuted,
    marginBottom: spacingV2.xs,
    marginTop: spacingV2.sm,
  },
  routineRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, marginBottom: 2,
    borderRadius: borderRadiusV2.md,
    paddingHorizontal: spacingV2.sm,
    borderLeftWidth: 3,
    backgroundColor: colorsV2.surfaceLight,
  },
  routineLabel: { ...typographyV2.body, color: colorsV2.textSecondary, fontSize: 13, flex: 1 },
  routineValueBadge: { borderRadius: borderRadiusV2.sm, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  routineValue: { fontSize: 11, fontWeight: '700' },
  basedOn: { marginTop: spacingV2.md },
  basedOnLabel: { ...typographyV2.caption, color: colorsV2.textMuted, marginBottom: spacingV2.xs },
  basedOnTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: colorsV2.accentPurple + '20',
    borderRadius: borderRadiusV2.sm,
    borderWidth: 1,
    borderColor: colorsV2.accentPurple + '30',
    paddingHorizontal: 8, paddingVertical: 3,
  },
  tagText: { ...typographyV2.caption, color: '#C084FC', fontWeight: '600', fontSize: 11 },
});

const tl = StyleSheet.create({
  container: { padding: spacingV2.lg, paddingTop: spacingV2.sm },
  nodeWrap: { marginBottom: 2 },
  nodeRow: { flexDirection: 'row' },
  dotCol: { width: 20, alignItems: 'center', paddingTop: 2 },
  dot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#C084FC',
  },
  line: {
    width: 2, flex: 1,
    backgroundColor: colorsV2.border,
    marginVertical: 2,
  },
  dotFinal: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#C084FC',
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    elevation: 4,
  },
  nodeContent: { flex: 1, marginLeft: spacingV2.sm, paddingBottom: spacingV2.sm },
  nodeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  nodeName: { ...typographyV2.bodySmall, color: colorsV2.textPrimary, fontWeight: '600' },
  nodeSubtitle: { ...typographyV2.caption, color: colorsV2.textMuted, marginBottom: spacingV2.xs },
  weekBadge: {
    backgroundColor: '#C084FC15',
    borderRadius: borderRadiusV2.sm,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  weekText: { ...typographyV2.caption, color: '#C084FC', fontWeight: '600', fontSize: 10 },
  weekBadgeFinal: {
    borderRadius: borderRadiusV2.sm,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  weekTextFinal: { ...typographyV2.caption, color: '#FFFFFF', fontWeight: '600', fontSize: 10 },
  barTrack: {
    height: 3, backgroundColor: colorsV2.surfaceLight,
    borderRadius: 2, overflow: 'hidden',
    marginTop: 4,
  },
  barFill: { height: '100%', borderRadius: 2, overflow: 'hidden' },
  barGradient: { flex: 1 },
});

// ─── Main Screen Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  headerContainer: { marginTop: spacingV2.xl + spacingV2.md, marginBottom: spacingV2.lg },
  headline: { ...typographyV2.hero, textAlign: 'center' },
  headlineAccent: {
    color: colorsV2.accentPurple,
    textShadowColor: colorsV2.accentOrange,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  headlineSubtitle: { ...typographyV2.body, color: colorsV2.textSecondary, textAlign: 'center', marginTop: spacingV2.xs },

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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingV2.md,
    paddingTop: spacingV2.md,
    paddingBottom: spacingV2.sm,
    gap: spacingV2.sm + 2,
  },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colorsV2.accentPurple,
    shadowColor: colorsV2.accentPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 4,
  },
  stepBadgeText: {
    color: colorsV2.accentPurple,
    fontSize: 14,
    fontWeight: '800',
  },
  cardTitleCol: {
    flex: 1,
  },
  cardTitle: {
    ...typographyV2.body,
    fontSize: 15,
    fontWeight: '700',
    color: colorsV2.textPrimary,
  },
  cardSubtitle: {
    ...typographyV2.caption,
    color: colorsV2.textMuted,
    marginTop: 1,
  },
  cardDivider: {
    height: 1.5,
    backgroundColor: '#7C3AED30',
    marginHorizontal: spacingV2.md,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },

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
