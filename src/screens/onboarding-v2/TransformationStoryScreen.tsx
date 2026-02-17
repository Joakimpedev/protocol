import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Image,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import GradientBackground from '../../components/v2/GradientBackground';
import {
  colorsV2,
  typographyV2,
  spacingV2,
  borderRadiusV2,
  gradients,
} from '../../constants/themeV2';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useOnboardingTracking } from '../../hooks/useOnboardingTracking';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_WIDTH = (SCREEN_WIDTH - spacingV2.lg * 2 - 12) / 2;
const PHOTO_HEIGHT = PHOTO_WIDTH * 1.4;

const IMAGE_MAP: Record<string, any> = {
  'ethan_acne_before.jpg': require('../../../assets/images/ethan_acne_before.jpg'),
  'ethan_acne_after.jpg': require('../../../assets/images/ethan_acne_after.jpg'),
  'saeid_jawline_before.jpg': require('../../../assets/images/saeid_jawline_before.jpg'),
  'saeid_jawline_after.jpg': require('../../../assets/images/saeid_jawline_after.jpg'),
  'alex_beard_before.jpg': require('../../../assets/images/alex_beard_before.jpg'),
  'alex_beard_after.jpg': require('../../../assets/images/alex_beard_after.jpg'),
  'markus_dry_before.jpg': require('../../../assets/images/markus_dry_before.jpg'),
  'markus_dry_after.jpg': require('../../../assets/images/markus_dry_after.jpg'),
  'jake_acne_before.jpg': require('../../../assets/images/jake_acne_before.jpg'),
  'jake_acne_after.jpg': require('../../../assets/images/jake_acne_after.jpg'),
};

interface WowUser {
  id: string;
  name: string;
  age: number;
  quote: string;
  problems: string[];
  impacts?: string[];
  before_photo: string;
  after_photo: string;
  weeks_elapsed: number;
}

function problemLabel(id: string): string {
  const map: Record<string, string> = {
    acne: 'Acne',
    jawline: 'Weak jawline',
    facial_hair: 'Patchy facial hair',
    oily_skin: 'Oily skin',
    dry_skin: 'Dry skin',
    dark_circles: 'Dark circles',
    hyperpigmentation: 'Hyperpigmentation',
    blackheads: 'Blackheads',
    skin_texture: 'Uneven skin texture',
  };
  return map[id] ?? id.replace(/_/g, ' ');
}

function goalLabel(value: string): string {
  const map: Record<string, string> = {
    get_more_dates: 'Get more dates',
    land_dream_job: 'Land his dream job',
    comfortable_in_photos: 'Feel comfortable in photos',
    stop_comparing: 'Stop comparing himself to others',
  };
  return map[value] ?? '';
}

// Skin sub-concern priority: first in list wins when multiple are selected
const SKIN_CONCERN_PRIORITY = ['acne', 'oily_skin', 'dry_skin', 'hyperpigmentation', 'dark_circles'];

export default function TransformationStoryScreen({ navigation }: any) {
  useOnboardingTracking('v2_transformation_story');
  const { data, primaryProblem, content } = useOnboarding();

  const wowUsers: WowUser[] = (content as any).wow_users ?? [];
  const selectedProblems = data.selectedProblems ?? [];

  // Find the highest-priority skin sub-concern the user selected
  const topSkinConcern = SKIN_CONCERN_PRIORITY.find((c) => selectedProblems.includes(c)) ?? null;

  // Match a wow_user: prefer skin concern match, then primaryProblem, then any overlap
  const matchedUser =
    (topSkinConcern
      ? wowUsers.find((u) => u.problems.includes(topSkinConcern))
      : null) ??
    (primaryProblem
      ? wowUsers.find((u) => u.problems.includes(primaryProblem))
      : null) ??
    wowUsers.find((u) =>
      u.problems.some((p) => selectedProblems.includes(p))
    ) ??
    null;

  // -- Animations --
  const labelAnim = useRef(new Animated.Value(0)).current;
  const photoOpacity = useRef(new Animated.Value(0)).current;
  const beforeSlide = useRef(new Animated.Value(-20)).current;
  const afterSlide = useRef(new Animated.Value(20)).current;
  const dealtWithAnim = useRef(new Animated.Value(0)).current;
  const dealtWithSlide = useRef(new Animated.Value(14)).current;
  const wantedToAnim = useRef(new Animated.Value(0)).current;
  const wantedToSlide = useRef(new Animated.Value(14)).current;
  const connectionAnim = useRef(new Animated.Value(0)).current;
  const connectionSlide = useRef(new Animated.Value(10)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;
  const btnAnim = useRef(new Animated.Value(0)).current;

  // Fallback anims
  const fallbackFade = useRef(new Animated.Value(0)).current;
  const fallbackCards = useRef(
    [0, 1, 2].map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    if (matchedUser) {
      runMatchedAnimation();
    } else {
      runFallbackAnimation();
    }
  }, []);

  const runMatchedAnimation = () => {
    const ease = Easing.out(Easing.cubic);
    Animated.sequence([
      // 1) Label
      Animated.timing(labelAnim, {
        toValue: 1,
        duration: 200,
        easing: ease,
        useNativeDriver: true,
      }),
      // 2) Photos slide in
      Animated.parallel([
        Animated.timing(photoOpacity, {
          toValue: 1,
          duration: 300,
          easing: ease,
          useNativeDriver: true,
        }),
        Animated.spring(beforeSlide, {
          toValue: 0,
          tension: 100,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.spring(afterSlide, {
          toValue: 0,
          tension: 100,
          friction: 12,
          useNativeDriver: true,
        }),
      ]),
      // 3) "Dealt with" card
      Animated.parallel([
        Animated.timing(dealtWithAnim, {
          toValue: 1,
          duration: 250,
          easing: ease,
          useNativeDriver: true,
        }),
        Animated.spring(dealtWithSlide, {
          toValue: 0,
          tension: 100,
          friction: 14,
          useNativeDriver: true,
        }),
      ]),
      // 4) "Wanted to" card
      Animated.parallel([
        Animated.timing(wantedToAnim, {
          toValue: 1,
          duration: 250,
          easing: ease,
          useNativeDriver: true,
        }),
        Animated.spring(wantedToSlide, {
          toValue: 0,
          tension: 100,
          friction: 14,
          useNativeDriver: true,
        }),
      ]),
      // 5) "Just like you" connection
      Animated.parallel([
        Animated.timing(connectionAnim, {
          toValue: 1,
          duration: 250,
          easing: ease,
          useNativeDriver: true,
        }),
        Animated.spring(connectionSlide, {
          toValue: 0,
          tension: 100,
          friction: 14,
          useNativeDriver: true,
        }),
      ]),
      // 6) Result + button
      Animated.parallel([
        Animated.timing(resultAnim, {
          toValue: 1,
          duration: 200,
          easing: ease,
          useNativeDriver: true,
        }),
        Animated.timing(btnAnim, {
          toValue: 1,
          duration: 200,
          delay: 60,
          easing: ease,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const runFallbackAnimation = () => {
    const ease = Easing.out(Easing.cubic);
    Animated.sequence([
      Animated.timing(labelAnim, {
        toValue: 1,
        duration: 200,
        easing: ease,
        useNativeDriver: true,
      }),
      Animated.timing(fallbackFade, {
        toValue: 1,
        duration: 250,
        easing: ease,
        useNativeDriver: true,
      }),
      Animated.stagger(
        80,
        fallbackCards.map((anim) =>
          Animated.timing(anim, {
            toValue: 1,
            duration: 250,
            easing: ease,
            useNativeDriver: true,
          })
        )
      ),
      Animated.timing(btnAnim, {
        toValue: 1,
        duration: 200,
        easing: ease,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('V2Journey');
  };

  // ─── Matched user layout ───
  if (matchedUser) {
    const beforeSrc = IMAGE_MAP[matchedUser.before_photo];
    const afterSrc = IMAGE_MAP[matchedUser.after_photo];
    // Show the user's top skin concern as the "dealt with" label
    const sharedProblem = topSkinConcern ??
      matchedUser.problems.find((p) => selectedProblems.includes(p));

    const userGoals = (data.goalSetting ?? '').split(',').filter(Boolean);
    const goalText = userGoals
      .map((g) => goalLabel(g))
      .find((label) => label.length > 0) ?? '';

    return (
      <View style={styles.container}>
        <GradientBackground animated colors={gradients.deepViolet} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            {/* Title */}
            <Animated.View style={[styles.titleRow, { opacity: labelAnim }]}>
              <Text style={styles.titleText}>
                Meet {matchedUser.name}.
              </Text>
            </Animated.View>

            {/* Photos — side by side */}
            <View style={styles.photosRow}>
              <Animated.View
                style={[
                  styles.photoWrap,
                  {
                    opacity: photoOpacity,
                    transform: [{ translateX: beforeSlide }],
                  },
                ]}
              >
                <Image
                  source={beforeSrc}
                  style={styles.photo}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.65)']}
                  style={styles.photoGradient}
                />
                <View style={[styles.weekBadge, styles.weekBefore]}>
                  <Text style={styles.weekText}>Week 0</Text>
                </View>
              </Animated.View>

              <Animated.View
                style={[
                  styles.photoWrap,
                  {
                    opacity: photoOpacity,
                    transform: [{ translateX: afterSlide }],
                  },
                ]}
              >
                <Image
                  source={afterSrc}
                  style={styles.photo}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.65)']}
                  style={styles.photoGradient}
                />
                <View style={[styles.weekBadge, styles.weekAfter]}>
                  <Text style={styles.weekText}>
                    Week {matchedUser.weeks_elapsed}
                  </Text>
                </View>
              </Animated.View>
            </View>

            {/* "Dealt with" card — prominent */}
            {sharedProblem && (
              <Animated.View
                style={[
                  styles.infoCard,
                  {
                    opacity: dealtWithAnim,
                    transform: [{ translateY: dealtWithSlide }],
                  },
                ]}
              >
                <Text style={styles.infoCardLabel}>
                  {matchedUser.name} dealt with
                </Text>
                <Text style={styles.infoCardValue}>
                  {problemLabel(sharedProblem)}
                </Text>
              </Animated.View>
            )}

            {/* "Wanted to" card — prominent */}
            {goalText.length > 0 && (
              <Animated.View
                style={[
                  styles.infoCard,
                  {
                    opacity: wantedToAnim,
                    transform: [{ translateY: wantedToSlide }],
                  },
                ]}
              >
                <Text style={styles.infoCardLabel}>
                  {matchedUser.name} wanted to
                </Text>
                <Text style={styles.infoCardValue}>{goalText}</Text>
              </Animated.View>
            )}

            {/* Result — weeks on Protocol */}
            <Animated.View
              style={[styles.resultCard, { opacity: resultAnim }]}
            >
              <Text style={styles.resultWeeks}>
                {matchedUser.weeks_elapsed}
              </Text>
              <Text style={styles.resultLabel}>
                weeks on Protocol. Look at the difference.
              </Text>
            </Animated.View>

            <View style={styles.spacer} />

            {/* Button */}
            <Animated.View style={{ opacity: btnAnim }}>
              <TouchableOpacity
                onPress={handleContinue}
                activeOpacity={0.8}
                style={styles.invertedButton}
              >
                <Text style={styles.invertedButtonText}>Continue</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ─── Fallback: no matched user ───
  const FALLBACK_USERS = [
    {
      name: 'Ethan',
      age: 22,
      label: 'Acne',
      weeks: 10,
      before: 'ethan_acne_before.jpg',
      after: 'ethan_acne_after.jpg',
    },
    {
      name: 'Saeid',
      age: 19,
      label: 'Jawline',
      weeks: 32,
      before: 'saeid_jawline_before.jpg',
      after: 'saeid_jawline_after.jpg',
    },
    {
      name: 'Alex',
      age: 20,
      label: 'Beard',
      weeks: 44,
      before: 'alex_beard_before.jpg',
      after: 'alex_beard_after.jpg',
    },
  ];

  return (
    <View style={styles.container}>
      <GradientBackground animated colors={gradients.deepViolet} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Title */}
          <Animated.View style={[styles.titleRow, { opacity: labelAnim }]}>
            <Text style={styles.titleText}>Real Results.</Text>
          </Animated.View>

          <Animated.View style={{ opacity: fallbackFade }}>
            <Text style={styles.fallbackHeadline}>
              Protocol delivers.{'\n'}Every time.
            </Text>
          </Animated.View>

          {/* Cards */}
          {FALLBACK_USERS.map((user, i) => (
            <Animated.View
              key={user.name}
              style={[
                styles.fallbackCard,
                {
                  opacity: fallbackCards[i],
                  transform: [
                    {
                      translateY: fallbackCards[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [12, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.fallbackImagesRow}>
                <View style={styles.fallbackImgWrap}>
                  <Image
                    source={IMAGE_MAP[user.before]}
                    style={styles.fallbackImg}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.5)']}
                    style={styles.fallbackImgGradient}
                  />
                </View>
                <View style={styles.fallbackImgWrap}>
                  <Image
                    source={IMAGE_MAP[user.after]}
                    style={styles.fallbackImg}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.5)']}
                    style={styles.fallbackImgGradient}
                  />
                </View>
              </View>
              <View style={styles.fallbackInfo}>
                <Text style={styles.fallbackName}>
                  {user.name}, {user.age}
                </Text>
                <Text style={styles.fallbackDetail}>
                  {user.label} — {user.weeks} weeks
                </Text>
              </View>
            </Animated.View>
          ))}

          <View style={styles.spacer} />

          <Animated.View style={{ opacity: btnAnim }}>
            <TouchableOpacity
              onPress={handleContinue}
              activeOpacity={0.8}
              style={styles.invertedButton}
            >
              <Text style={styles.invertedButtonText}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacingV2.lg,
    paddingBottom: spacingV2.lg,
  },

  // ── Title ──
  titleRow: {
    alignItems: 'center',
    marginTop: spacingV2.lg,
    marginBottom: spacingV2.md,
  },
  titleText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },

  // ── Photos ──
  photosRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: spacingV2.md,
  },
  photoWrap: {
    flex: 1,
    height: PHOTO_HEIGHT,
    borderRadius: borderRadiusV2.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoGradient: {
    ...StyleSheet.absoluteFillObject,
    top: '50%',
  },
  weekBadge: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadiusV2.pill,
  },
  weekBefore: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  weekAfter: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  weekText: {
    ...typographyV2.label,
    color: '#FFFFFF',
    fontSize: 10,
    letterSpacing: 1.5,
  },

  // ── Info cards (dealt with / wanted to) — prominent, separate ──
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadiusV2.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(255,255,255,0.7)',
    paddingVertical: spacingV2.md,
    paddingHorizontal: spacingV2.lg,
    marginBottom: spacingV2.sm,
  },
  infoCardLabel: {
    ...typographyV2.bodySmall,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  infoCardValue: {
    ...typographyV2.subheading,
    color: '#FFFFFF',
  },

  // ── "Just like you." ──
  connectionBlock: {
    alignItems: 'center',
    marginTop: spacingV2.sm,
    marginBottom: spacingV2.md,
  },
  connectionHeadline: {
    ...typographyV2.heading,
    fontSize: 28,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },

  // ── Result line — UNDER "Just like you" ──
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadiusV2.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingVertical: spacingV2.md,
    paddingHorizontal: spacingV2.lg,
    marginBottom: spacingV2.md,
  },
  resultWeeks: {
    ...typographyV2.heading,
    fontSize: 28,
    color: '#FFFFFF',
    marginRight: spacingV2.md,
  },
  resultLabel: {
    ...typographyV2.bodySmall,
    color: 'rgba(255,255,255,0.7)',
    flex: 1,
  },

  spacer: {
    flex: 1,
    minHeight: spacingV2.sm,
  },

  // ── Button — white with glow on violet bg ──
  invertedButton: {
    paddingVertical: 18,
    paddingHorizontal: spacingV2.xl,
    borderRadius: borderRadiusV2.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  invertedButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5B21B6',
  },

  // ── Fallback ──
  fallbackHeadline: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: spacingV2.lg,
    letterSpacing: -0.3,
  },
  fallbackCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadiusV2.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    marginBottom: spacingV2.sm,
  },
  fallbackImagesRow: {
    flexDirection: 'row',
  },
  fallbackImgWrap: {
    flex: 1,
    height: 110,
  },
  fallbackImg: {
    width: '100%',
    height: '100%',
  },
  fallbackImgGradient: {
    ...StyleSheet.absoluteFillObject,
    top: '40%',
  },
  fallbackInfo: {
    paddingHorizontal: spacingV2.md,
    paddingVertical: spacingV2.sm,
  },
  fallbackName: {
    ...typographyV2.body,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  fallbackDetail: {
    ...typographyV2.bodySmall,
    color: 'rgba(255,255,255,0.7)',
  },
});
