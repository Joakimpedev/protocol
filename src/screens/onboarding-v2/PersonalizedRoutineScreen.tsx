import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import V2ProgressBar from '../../components/v2/V2ProgressBar';
import GradientButton from '../../components/v2/GradientButton';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useOnboardingTracking } from '../../hooks/useOnboardingTracking';
import {
  colorsV2,
  typographyV2,
  spacingV2,
  borderRadiusV2,
  shadows,
} from '../../constants/themeV2';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PROTOCOL_ITEMS = [
  { name: 'Niacinamide', status: 'Active', statusColor: colorsV2.success, desc: 'Skin brightening serum' },
  { name: 'Retinol', status: 'Evening', statusColor: colorsV2.accentPurple, desc: 'Anti-aging treatment' },
  { name: 'Mewing', status: 'Daily', statusColor: colorsV2.accentCyan, desc: 'Jawline exercise' },
];

const ROUTINES = [
  { name: 'Morning Routine', steps: 4, mins: 8, done: true },
  { name: 'Evening Routine', steps: 3, mins: 5, done: false },
  { name: 'Exercises', tasks: 5, mins: 12, done: false },
];

// More overlap initially
const CARD_OVERLAP = -70;
const MAX_SEPARATION = 80;

export default function PersonalizedRoutineScreen({ navigation }: any) {
  useOnboardingTracking('v2_personalized_routine');
  const insets = useSafeAreaInsets();
  const anims = useScreenEntrance(4);

  const slideAnims = useRef(PROTOCOL_ITEMS.map(() => new Animated.Value(0))).current;

  // 3D card entrance animations
  const card1Anim = useRef(new Animated.Value(0)).current;
  const card2Anim = useRef(new Animated.Value(0)).current;

  // Scroll-driven separation
  const scrollY = useRef(new Animated.Value(0)).current;

  // Glow pulse between cards
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Stagger protocol item slide-ins
    Animated.stagger(
      150,
      slideAnims.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          delay: 600,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        })
      )
    ).start();

    // Slow, eased 3D card entrance
    Animated.sequence([
      Animated.delay(300),
      Animated.stagger(300, [
        Animated.timing(card1Anim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        }),
        Animated.timing(card2Anim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        }),
      ]),
    ]).start();

    // Subtle pulsing glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    ).start();
  }, []);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('V2NotificationsAsk');
  };

  const progressBarHeight = insets.top + 24;

  // Scroll-driven separation for Protocol card
  const scrollSeparation = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0, MAX_SEPARATION],
    extrapolate: 'clamp',
  });

  // Glow opacity driven by scroll — more visible as cards separate
  const glowOpacityFromScroll = scrollY.interpolate({
    inputRange: [0, 80, 150],
    outputRange: [0.3, 0.7, 0.4],
    extrapolate: 'clamp',
  });

  // Daily Routines (top, in front) — top-left corner closest to viewer
  const card1Style = {
    opacity: card1Anim,
    transform: [
      { perspective: 500 },
      {
        translateX: card1Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [100, 10],
        }),
      },
      {
        translateY: card1Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [80, 0],
        }),
      },
      {
        rotateX: card1Anim.interpolate({
          inputRange: [0, 1],
          outputRange: ['-20deg', '-4deg'],
        }),
      },
      {
        rotateY: card1Anim.interpolate({
          inputRange: [0, 1],
          outputRange: ['30deg', '10deg'],
        }),
      },
      {
        rotateZ: card1Anim.interpolate({
          inputRange: [0, 1],
          outputRange: ['10deg', '2deg'],
        }),
      },
      {
        scale: card1Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.7, 0.95],
        }),
      },
    ],
  };

  // Your Protocol (bottom, behind) — gentler skew, pushed forward more
  const card2Style = {
    opacity: card2Anim,
    transform: [
      { perspective: 700 },
      {
        translateX: card2Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [-80, -4],
        }),
      },
      {
        translateY: Animated.add(
          card2Anim.interpolate({
            inputRange: [0, 1],
            outputRange: [60, CARD_OVERLAP],
          }),
          scrollSeparation,
        ),
      },
      {
        rotateX: card2Anim.interpolate({
          inputRange: [0, 1],
          outputRange: ['15deg', '3deg'],
        }),
      },
      {
        rotateY: card2Anim.interpolate({
          inputRange: [0, 1],
          outputRange: ['-18deg', '-4deg'],
        }),
      },
      {
        rotateZ: card2Anim.interpolate({
          inputRange: [0, 1],
          outputRange: ['-8deg', '-1deg'],
        }),
      },
      {
        scale: card2Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.75, 0.97],
        }),
      },
    ],
  };

  return (
    <View style={styles.container}>
      <V2ProgressBar currentStep={4} totalSteps={14} />

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: progressBarHeight + spacingV2.lg, paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <Animated.View style={{ opacity: anims[0].opacity, transform: anims[0].transform }}>
          <Text style={styles.headline}>Personalized Plan</Text>
          <Text style={styles.subheadline}>
            A step-by-step protocol tailored to you
          </Text>
        </Animated.View>

        {/* Cards container */}
        <View style={styles.cardsContainer}>
          {/* Daily Routines card — on top, in front */}
          <Animated.View style={[styles.card, styles.card1, card1Style]}>
            <Text style={styles.cardTitle}>Daily Routines</Text>
            <View style={styles.divider} />
            {ROUTINES.map((r) => (
              <View key={r.name} style={[styles.routineItem, r.done && styles.routineItemDone]}>
                <View style={styles.routineLeft}>
                  <Text style={styles.routineName}>{r.name}</Text>
                  <Text style={styles.routineMeta}>
                    {'steps' in r ? `${r.steps} steps` : `${r.tasks} tasks`} · {r.mins} min
                  </Text>
                </View>
                {r.done ? (
                  <View style={styles.checkBadge}>
                    <Text style={styles.checkMark}>✓</Text>
                  </View>
                ) : (
                  <View style={styles.startBadge}>
                    <Text style={styles.startText}>Start</Text>
                  </View>
                )}
              </View>
            ))}
          </Animated.View>

          {/* Glow separator between cards */}
          <Animated.View
            style={[
              styles.glowSeparator,
              {
                opacity: Animated.multiply(glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.4, 0.9],
                }), glowOpacityFromScroll),
                transform: [{
                  translateY: Animated.add(
                    new Animated.Value(-35),
                    scrollSeparation.interpolate({
                      inputRange: [0, MAX_SEPARATION],
                      outputRange: [0, MAX_SEPARATION * 0.4],
                      extrapolate: 'clamp',
                    }),
                  ),
                }],
              },
            ]}
          >
            <LinearGradient
              colors={['transparent', 'rgba(168, 85, 247, 0.35)', 'rgba(192, 132, 252, 0.2)', 'transparent']}
              locations={[0, 0.35, 0.65, 1]}
              style={styles.glowGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </Animated.View>

          {/* Your Protocol card — behind, overlapping, separates on scroll */}
          <Animated.View style={[styles.card, styles.card2, card2Style]}>
            <Text style={styles.cardTitle}>Your Protocol</Text>
            <Text style={styles.cardSubtitle}>Personalized for your goals</Text>
            <View style={styles.divider} />
            {PROTOCOL_ITEMS.map((item, i) => (
              <Animated.View
                key={item.name}
                style={[
                  styles.protocolItem,
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
                <View style={styles.protocolItemLeft}>
                  <Text style={styles.protocolName}>{item.name.toUpperCase()}</Text>
                  <Text style={styles.protocolDesc}>{item.desc}</Text>
                </View>
                <View style={[styles.statusBadge, { borderColor: item.statusColor }]}>
                  <Text style={[styles.statusText, { color: item.statusColor }]}>
                    {item.status}
                  </Text>
                </View>
              </Animated.View>
            ))}
          </Animated.View>
        </View>
      </Animated.ScrollView>

      {/* Fixed bottom button */}
      <View style={[styles.fixedBottom, { paddingBottom: insets.bottom + spacingV2.sm }]}>
        <LinearGradient
          colors={['transparent', colorsV2.background]}
          locations={[0, 0.35]}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={{ opacity: anims[3].opacity, transform: anims[3].transform }}>
          <GradientButton title="Continue" onPress={handleContinue} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorsV2.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacingV2.lg,
  },
  headline: {
    ...typographyV2.hero,
    textAlign: 'center',
    marginTop: spacingV2.xl,
    marginBottom: spacingV2.sm,
  },
  subheadline: {
    ...typographyV2.body,
    color: colorsV2.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacingV2.md,
    marginBottom: spacingV2.xl,
  },
  cardsContainer: {
    paddingHorizontal: spacingV2.xs,
  },
  card: {
    backgroundColor: colorsV2.surface,
    borderRadius: borderRadiusV2.xl,
    borderWidth: 1,
    borderColor: colorsV2.border,
    padding: spacingV2.lg,
    ...shadows.glass,
  },
  card1: {
    zIndex: 3,
  },
  card2: {
    zIndex: 1,
  },
  glowSeparator: {
    zIndex: 2,
    height: 30,
    marginHorizontal: spacingV2.xl,
  },
  glowGradient: {
    flex: 1,
    borderRadius: 15,
  },
  cardTitle: {
    ...typographyV2.heading,
    fontSize: 20,
    marginBottom: 2,
  },
  cardSubtitle: {
    ...typographyV2.caption,
    color: colorsV2.textMuted,
    marginBottom: spacingV2.md,
  },
  divider: {
    height: 1,
    backgroundColor: colorsV2.border,
    marginBottom: spacingV2.md,
  },
  protocolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colorsV2.surfaceLight,
    borderRadius: borderRadiusV2.md,
    borderWidth: 1,
    borderColor: colorsV2.border,
    padding: spacingV2.md,
    marginBottom: spacingV2.sm,
  },
  protocolItemLeft: {
    flex: 1,
  },
  protocolName: {
    ...typographyV2.bodySmall,
    fontWeight: '700',
    color: colorsV2.textPrimary,
    letterSpacing: 1,
    marginBottom: 2,
  },
  protocolDesc: {
    ...typographyV2.caption,
    color: colorsV2.textMuted,
  },
  statusBadge: {
    borderWidth: 1.5,
    borderRadius: borderRadiusV2.sm,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  routineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colorsV2.surfaceLight,
    borderRadius: borderRadiusV2.md,
    borderWidth: 1,
    borderColor: colorsV2.border,
    padding: spacingV2.md,
    marginBottom: spacingV2.sm,
  },
  routineItemDone: {
    opacity: 0.6,
  },
  routineLeft: {
    flex: 1,
  },
  routineName: {
    ...typographyV2.body,
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 2,
  },
  routineMeta: {
    ...typographyV2.caption,
    color: colorsV2.textMuted,
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colorsV2.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  startBadge: {
    backgroundColor: colorsV2.surfaceLight,
    borderWidth: 1,
    borderColor: colorsV2.textMuted,
    borderRadius: borderRadiusV2.sm,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  startText: {
    ...typographyV2.caption,
    color: colorsV2.textSecondary,
    fontWeight: '600',
  },
  fixedBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacingV2.lg,
    paddingTop: spacingV2.lg,
  },
});
