import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colorsV2, typographyV2, spacingV2, borderRadiusV2 } from '../../constants/themeV2';
import GradientButton from '../../components/v2/GradientButton';
import V2ScreenWrapper from '../../components/v2/V2ScreenWrapper';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useOnboardingTracking } from '../../hooks/useOnboardingTracking';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Milestones along the curve, positioned as vertical list items
// y goes from bottom (100%) to top (0%)
const MILESTONES = [
  { label: 'Skincare Routine', progress: 0 },
  { label: 'Jawline Exercises', progress: 0.18 },
  { label: 'Haircare Routine', progress: 0.36 },
  { label: 'Mental Practices', progress: 0.55 },
  { label: 'Better Confidence', progress: 0.75 },
  { label: 'Your maximum attractiveness', progress: 1.0 },
];

// Generate smooth curve dots
function generateCurvePoints(count: number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const x = 60 + t * 30; // curve in right ~30% of screen
    const y = 92 - Math.pow(t, 0.55) * 86;
    points.push({ x, y });
  }
  return points;
}

const CURVE_POINTS = generateCurvePoints(50);
const CHART_HEIGHT = 420;
const DOT_SIZE = 3;

export default function GrowthChartScreen({ navigation }: any) {
  useOnboardingTracking('v2_growth_chart');
  const anims = useScreenEntrance(3);

  // Curve draw animation
  const curveProgress = useRef(new Animated.Value(0)).current;

  // Individual milestone animations
  const milestoneAnims = useRef(
    MILESTONES.map(() => new Animated.Value(0))
  ).current;

  // Glow pulse
  const glowPulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.timing(curveProgress, {
      toValue: 1,
      duration: 2200,
      delay: 400,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();

    Animated.stagger(
      200,
      milestoneAnims.map((anim, i) =>
        Animated.spring(anim, {
          toValue: 1,
          delay: 600 + i * 100,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        })
      )
    ).start();

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1.0,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(glowPulse, {
          toValue: 0.5,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    );
    glowLoop.start();
    return () => glowLoop.stop();
  }, []);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('V2Selfie');
  };

  return (
    <V2ScreenWrapper showProgress currentStep={12} totalSteps={14} scrollable={false}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.chartArea,
            {
              opacity: anims[0].opacity,
              transform: anims[0].transform,
            },
          ]}
        >
          {/* Orange ambient glow */}
          <Animated.View style={[styles.ambientGlow, { opacity: glowPulse }]}>
            <LinearGradient
              colors={['transparent', colorsV2.accentOrange + '40', colorsV2.accentOrange + '25', 'transparent']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
          </Animated.View>

          {/* Curve dots */}
          {CURVE_POINTS.map((point, i) => {
            const dotOpacity = curveProgress.interpolate({
              inputRange: [
                Math.max(0, (i - 1) / CURVE_POINTS.length),
                i / CURVE_POINTS.length,
                Math.min(1, (i + 1) / CURVE_POINTS.length),
              ],
              outputRange: [0, 1, 1],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={`dot-${i}`}
                style={[
                  styles.curveDot,
                  {
                    left: `${point.x}%`,
                    top: `${point.y}%`,
                    opacity: dotOpacity,
                  },
                ]}
              />
            );
          })}

          {/* Milestone dots on the curve + labels to the left */}
          {MILESTONES.map((milestone, i) => {
            const isLast = i === MILESTONES.length - 1;
            // Find the matching curve point for this milestone
            const curveIdx = Math.round(milestone.progress * CURVE_POINTS.length);
            const curvePoint = CURVE_POINTS[Math.min(curveIdx, CURVE_POINTS.length - 1)];

            return (
              <Animated.View
                key={`ms-${i}`}
                style={[
                  styles.milestoneRow,
                  {
                    top: `${curvePoint.y}%`,
                    opacity: milestoneAnims[i],
                    transform: [
                      {
                        translateX: milestoneAnims[i].interpolate({
                          inputRange: [0, 1],
                          outputRange: [-20, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {/* Label chip on the left */}
                <View style={[styles.labelChip, isLast && styles.labelChipHighlight]}>
                  <Text style={[styles.labelText, isLast && styles.labelTextHighlight]}>
                    {milestone.label}
                  </Text>
                </View>

                {/* Connecting line */}
                <View style={styles.connector} />

                {/* Dot on the curve */}
                <View
                  style={[
                    styles.milestoneDotOuter,
                    {
                      left: `${curvePoint.x}%`,
                    },
                    isLast && styles.milestoneDotOuterLast,
                  ]}
                >
                  <View style={[styles.milestoneDotInner, isLast && styles.milestoneDotInnerLast]} />
                </View>
              </Animated.View>
            );
          })}
        </Animated.View>

        {/* Bottom section */}
        <Animated.View
          style={[
            styles.bottomSection,
            {
              opacity: anims[1].opacity,
              transform: anims[1].transform,
            },
          ]}
        >
          <Text style={styles.headline}>Your Projected Growth</Text>
          <Text style={styles.subheadline}>
            Follow your personalized plan and track real improvements over time.
          </Text>
        </Animated.View>

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
  chartArea: {
    height: CHART_HEIGHT,
    position: 'relative',
    marginBottom: spacingV2.lg,
  },
  ambientGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  curveDot: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: colorsV2.accentOrange,
    marginLeft: -(DOT_SIZE / 2),
    marginTop: -(DOT_SIZE / 2),
    shadowColor: colorsV2.accentOrange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
  },
  // Milestone row: label on left, dot on right at curve position
  milestoneRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    marginTop: -18,
  },
  labelChip: {
    backgroundColor: colorsV2.surface,
    borderRadius: borderRadiusV2.pill,
    borderWidth: 1,
    borderColor: colorsV2.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxWidth: '65%',
  },
  labelChipHighlight: {
    backgroundColor: colorsV2.accentOrange,
    borderColor: colorsV2.accentOrange,
    shadowColor: colorsV2.accentOrange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  labelText: {
    color: colorsV2.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  labelTextHighlight: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  connector: {
    flex: 1,
    height: 1,
    backgroundColor: colorsV2.textMuted + '25',
    marginHorizontal: 4,
  },
  milestoneDotOuter: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colorsV2.accentOrange + '35',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  milestoneDotOuterLast: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colorsV2.accentOrange + '50',
    marginLeft: -10,
  },
  milestoneDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colorsV2.accentOrange,
    shadowColor: colorsV2.accentOrange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  milestoneDotInnerLast: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  bottomSection: {
    marginBottom: spacingV2.lg,
  },
  headline: {
    ...typographyV2.hero,
    textAlign: 'center',
    marginBottom: spacingV2.sm,
  },
  subheadline: {
    ...typographyV2.body,
    color: colorsV2.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacingV2.md,
  },
});
