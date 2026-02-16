import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import V2ScreenWrapper from '../../components/v2/V2ScreenWrapper';
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

const RATINGS = [
  { label: 'Overall', score: 7.8, color: colorsV2.success },
  { label: 'Jawline', score: 6.2, color: colorsV2.warning },
  { label: 'Symmetry', score: 8.1, color: colorsV2.success },
  { label: 'Skin', score: 5.9, color: colorsV2.warning },
  { label: 'Cheekbones', score: 7.4, color: colorsV2.success },
];

export default function GetRatingScreen({ navigation }: any) {
  useOnboardingTracking('v2_get_rating');
  const anims = useScreenEntrance(3); // header + card + button

  const barAnims = useRef(RATINGS.map(() => new Animated.Value(0))).current;
  const overallAnim = useRef(new Animated.Value(0)).current;
  const [displayOverall, setDisplayOverall] = React.useState('0.0');

  useEffect(() => {
    // Animate the overall score counter
    const listener = overallAnim.addListener(({ value }) => {
      setDisplayOverall(value.toFixed(1));
    });

    Animated.timing(overallAnim, {
      toValue: 7.8,
      duration: 1200,
      delay: 400,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();

    // Animate each bar
    Animated.stagger(
      120,
      barAnims.map((anim, i) =>
        Animated.timing(anim, {
          toValue: RATINGS[i].score / 10,
          duration: 800,
          delay: 500,
          useNativeDriver: false,
          easing: Easing.out(Easing.cubic),
        })
      )
    ).start();

    return () => {
      overallAnim.removeListener(listener);
    };
  }, []);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('V2PersonalizedRoutine');
  };

  return (
    <V2ScreenWrapper showProgress={true} currentStep={2} totalSteps={14} scrollable={false}>
      <View style={styles.content}>
        <Animated.View
          style={{
            opacity: anims[0].opacity,
            transform: anims[0].transform,
          }}
        >
          <Text style={styles.headline}>Get Your Rating</Text>
          <Text style={styles.subheadline}>
            Detailed scores across each category so you know exactly where you stand
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            {
              opacity: anims[1].opacity,
              transform: anims[1].transform,
            },
          ]}
        >
          {/* Overall score header */}
          <View style={styles.overallSection}>
            <View style={styles.overallRow}>
              <Text style={styles.overallScore}>{displayOverall}</Text>
              <Text style={styles.overallMax}>/10</Text>
            </View>
            <Text style={styles.overallLabel}>Overall Rating</Text>
          </View>

          <View style={styles.divider} />

          {/* Individual category bars */}
          {RATINGS.map((r, i) => {
            const width = barAnims[i].interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            });
            return (
              <View key={r.label} style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>{r.label}</Text>
                <View style={styles.barTrack}>
                  <Animated.View
                    style={[
                      styles.barFill,
                      { width, backgroundColor: r.color },
                    ]}
                  />
                </View>
                <Text style={[styles.ratingScore, { color: r.color }]}>
                  {r.score}
                </Text>
              </View>
            );
          })}
        </Animated.View>

        <View style={styles.spacer} />

        <Animated.View
          style={{
            opacity: anims[2].opacity,
            transform: anims[2].transform,
          }}
        >
          <GradientButton title="Continue" onPress={handleContinue} />
        </Animated.View>
      </View>
    </V2ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
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
  card: {
    backgroundColor: colorsV2.surface,
    borderRadius: borderRadiusV2.xl,
    borderWidth: 1,
    borderColor: colorsV2.border,
    padding: spacingV2.lg,
  },
  overallSection: {
    alignItems: 'center',
    marginBottom: spacingV2.md,
  },
  overallRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  overallScore: {
    fontSize: 56,
    fontWeight: '800',
    color: colorsV2.accentOrange,
    fontVariant: ['tabular-nums'],
    ...shadows.glow,
  },
  overallMax: {
    fontSize: 22,
    fontWeight: '600',
    color: colorsV2.textMuted,
    marginLeft: spacingV2.xs,
  },
  overallLabel: {
    ...typographyV2.bodySmall,
    color: colorsV2.textMuted,
    marginTop: spacingV2.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colorsV2.border,
    marginBottom: spacingV2.lg,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  ratingLabel: {
    ...typographyV2.bodySmall,
    color: colorsV2.textSecondary,
    fontWeight: '600',
    width: 90,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colorsV2.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginHorizontal: spacingV2.sm,
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  ratingScore: {
    ...typographyV2.bodySmall,
    fontWeight: '700',
    width: 30,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  spacer: {
    flex: 1,
  },
});
