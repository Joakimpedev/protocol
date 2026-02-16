import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Easing,
  Image,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { colorsV2, typographyV2, spacingV2, borderRadiusV2, gradients } from '../../constants/themeV2';
import GradientButton from '../../components/v2/GradientButton';
import BlurredOverlay from '../../components/v2/BlurredOverlay';
import RoomModal from '../../components/v2/RoomModal';
import V2ScreenWrapper from '../../components/v2/V2ScreenWrapper';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useAuth } from '../../contexts/AuthContext';
import { getUserRoom, ReferralRoom } from '../../services/referralService';
import { loadSelfiePhotos } from '../../services/faceAnalysisService';
import { useOnboardingTracking } from '../../hooks/useOnboardingTracking';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_WIDTH = (SCREEN_WIDTH - spacingV2.lg * 2 - spacingV2.md) / 2;
const PHOTO_HEIGHT = PHOTO_WIDTH * 1.35;

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

export default function ResultsPaywallScreen({ navigation }: any) {
  useOnboardingTracking('v2_results_paywall');
  const { data } = useOnboarding();
  const { user, signInAnonymous } = useAuth();

  const [roomModalVisible, setRoomModalVisible] = useState(false);
  const [userRoom, setUserRoom] = useState<ReferralRoom | null>(null);
  const [photos, setPhotos] = useState<{ frontUri: string; sideUri: string } | null>(null);

  const anims = useScreenEntrance(4);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Oscillating bar anims (each bar drifts ±20% around its base)
  const barOscillations = useRef(
    PREVIEW_CATEGORIES.map(() => new Animated.Value(0))
  ).current;

  // Overall bar oscillation
  const overallOscillation = useRef(new Animated.Value(0)).current;

  // Load selfie photos
  useEffect(() => {
    (async () => {
      const saved = await loadSelfiePhotos();
      if (saved) setPhotos(saved);
    })();
  }, []);

  // Start oscillation loops
  useEffect(() => {
    // Per-category bar oscillation
    const catLoops = barOscillations.map((anim, i) => {
      const duration = 2000 + i * 400; // stagger timing so they don't sync
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

    // Overall bar oscillation
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
  const inviteButtonLabel = `Invite ${inviteCount} Friend${inviteCount !== 1 ? 's' : ''}`;

  // Overall bar oscillation: base 67% ± 12%
  const overallPct = overallOscillation.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [55, 67, 79],
  });
  const overallBarWidth = overallOscillation.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['55%', '67%', '79%'],
  });
  // Potential gap is always +17% on top of the current bar
  const potentialGapPct = 17;
  const potentialBarWidth = Animated.add(overallPct, potentialGapPct).interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <V2ScreenWrapper showProgress={false} scrollable={true}>
      {/* Header */}
      <Animated.View
        style={[
          styles.headlineContainer,
          { opacity: anims[0].opacity, transform: anims[0].transform },
        ]}
      >
        <Text style={styles.headline}>Your Full Analysis</Text>
        <Text style={styles.subtitle}>
          Invite {inviteCount} friends or get Protocol Pro to view
        </Text>
      </Animated.View>

      {/* Photos */}
      {photos && (
        <Animated.View
          style={[
            styles.photosSection,
            { opacity: anims[1].opacity, transform: anims[1].transform },
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
              {/* Glow behind the bar */}
              <Animated.View style={[styles.overallBarGlow, { width: overallBarWidth }]} />
              <BlurredOverlay intensity={20} style={styles.barBlur}>
                <View style={styles.stackedBarTrack}>
                  {/* Potential layer — follows current bar */}
                  <Animated.View style={[styles.potentialBarFill, { width: potentialBarWidth }]}>
                    <LinearGradient
                      colors={[colorsV2.accentPurple + 'AA', colorsV2.accentPurple + '70']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.barGradientFill}
                    />
                  </Animated.View>
                  {/* Current — oscillating */}
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
              <View style={styles.potentialIndicator}>
                <View style={styles.potentialDot} />
                <Text style={styles.potentialText}>
                  Potential: <Text style={styles.potentialValue}>+?.? points</Text>
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Category breakdown — labels visible, bars+scores blurred */}
            {PREVIEW_CATEGORIES.map((cat, i) => {
              const basePct = cat.baseScore * 100;
              const swing = 12; // ±12% oscillation
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

          {/* Lock overlay */}
          <View style={styles.lockOverlay}>
            <View style={styles.lockIconCircle}>
              <Text style={styles.lockIcon}>🔒</Text>
            </View>
            <Text style={styles.lockText}>Unlock your results</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* CTA Buttons */}
      <Animated.View
        style={[
          styles.ctaContainer,
          { opacity: anims[3].opacity, transform: anims[3].transform },
        ]}
      >
        <GradientButton title="Get Protocol Pro" onPress={handleGetPro} />
        <View style={styles.buttonSpacer} />
        <GradientButton
          title={inviteButtonLabel}
          onPress={handleInviteFriends}
          variant="outline"
        />
      </Animated.View>

      <RoomModal
        visible={roomModalVisible}
        onClose={() => setRoomModalVisible(false)}
        onNavigateToReferralPaywall={handleNavigateToReferralPaywall}
      />
    </V2ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  // Header
  headlineContainer: {
    marginTop: spacingV2.xl,
    marginBottom: spacingV2.md,
  },
  headline: {
    ...typographyV2.hero,
    textAlign: 'center',
    marginBottom: spacingV2.sm,
  },
  subtitle: {
    ...typographyV2.body,
    color: colorsV2.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacingV2.md,
  },

  // Photos
  photosSection: {
    marginBottom: spacingV2.lg,
  },
  photosRow: {
    flexDirection: 'row' as const,
    gap: spacingV2.sm,
  },
  photoCard: {
    flex: 1,
    height: PHOTO_HEIGHT * 0.7,
    borderRadius: borderRadiusV2.xl,
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
    height: 48,
  },
  photoTag: {
    position: 'absolute' as const,
    bottom: 10,
    left: 12,
    ...typographyV2.label,
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1.5,
  },

  // Score card
  cardWrapper: {
    marginBottom: spacingV2.lg,
    position: 'relative' as const,
  },
  scoreCard: {
    backgroundColor: colorsV2.surface,
    borderRadius: borderRadiusV2.xl,
    borderWidth: 1,
    borderColor: colorsV2.border,
    padding: spacingV2.lg,
  },

  // Overall score
  overallSection: {
    alignItems: 'center' as const,
    marginBottom: spacingV2.md,
  },
  scoreBlur: {
    borderRadius: borderRadiusV2.lg,
    marginBottom: spacingV2.xs,
    paddingHorizontal: spacingV2.xl,
    paddingVertical: spacingV2.sm,
  },
  overallRowInner: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
  },
  overallScore: {
    fontSize: 56,
    fontWeight: '800' as const,
    color: colorsV2.accentOrange,
    fontVariant: ['tabular-nums' as const],
  },
  overallMax: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: colorsV2.textMuted,
    marginLeft: spacingV2.xs,
  },
  overallLabel: {
    ...typographyV2.bodySmall,
    color: colorsV2.textMuted,
    marginTop: spacingV2.xs,
  },

  // Stacked bar
  stackedBarContainer: {
    marginBottom: spacingV2.lg,
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
  potentialIndicator: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginTop: spacingV2.sm,
  },
  potentialDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colorsV2.accentPurple + '90',
    marginRight: spacingV2.xs,
  },
  potentialText: {
    ...typographyV2.caption,
    color: colorsV2.textMuted,
  },
  potentialValue: {
    color: colorsV2.accentPurple,
    fontWeight: '700' as const,
  },

  divider: {
    height: 1,
    backgroundColor: colorsV2.border,
    marginBottom: spacingV2.lg,
  },

  // Category rows
  ratingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 14,
  },
  ratingLabel: {
    ...typographyV2.bodySmall,
    color: colorsV2.textSecondary,
    fontWeight: '600' as const,
    width: 90,
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

  // Lock overlay
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  lockIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colorsV2.surface,
    borderWidth: 1,
    borderColor: colorsV2.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: spacingV2.sm,
  },
  lockIcon: {
    fontSize: 24,
  },
  lockText: {
    ...typographyV2.bodySmall,
    color: colorsV2.textPrimary,
    fontWeight: '600' as const,
  },

  // CTA
  ctaContainer: {
    marginTop: spacingV2.sm,
  },
  buttonSpacer: {
    height: spacingV2.sm,
  },
});
