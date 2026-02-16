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
import * as Haptics from 'expo-haptics';
import { colorsV2, typographyV2, spacingV2, borderRadiusV2 } from '../../constants/themeV2';
import GradientButton from '../../components/v2/GradientButton';
import V2ScreenWrapper from '../../components/v2/V2ScreenWrapper';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useOnboardingTracking } from '../../hooks/useOnboardingTracking';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - spacingV2.lg * 2;
const CHART_HEIGHT = 280;

// Generate filled area curve points for rendering rows of "bars"
// The curves represent attractiveness (taller) and confidence (shorter)
const BAR_COUNT = 30;

function generateCurveHeight(t: number, maxH: number): number {
  // Ease-in curve that accelerates upward
  return Math.pow(t, 1.8) * maxH;
}

// Callout labels positioned on the chart.
// Pixel positions are pre-calculated to avoid layout issues with absolute positioning.
const CALLOUTS = [
  { label: 'Start of your\nimprovement journey', xPx: 30, yFromBottom: 25 },
  { label: 'Confidence', xPx: CHART_WIDTH * 0.55, yFromBottom: 55 },
  { label: 'Attractiveness', xPx: CHART_WIDTH * 0.72 - 100, yFromBottom: 80 },
];

export default function JourneyScreen({ navigation }: any) {
  useOnboardingTracking('v2_journey');
  const anims = useScreenEntrance(3);

  // Chart reveal animation
  const chartReveal = useRef(new Animated.Value(0)).current;
  // Callout animations
  const calloutAnims = useRef(CALLOUTS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Reveal chart bars left to right
    Animated.timing(chartReveal, {
      toValue: 1,
      duration: 1800,
      delay: 400,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();

    // Stagger callout labels
    Animated.stagger(
      400,
      calloutAnims.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          delay: 1000,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        })
      )
    ).start();
  }, []);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('V2GrowthChart');
  };

  const barWidth = (CHART_WIDTH - 20) / BAR_COUNT;

  return (
    <V2ScreenWrapper showProgress currentStep={11} totalSteps={14} scrollable={false}>
      <View style={styles.content}>
        {/* Chart subtitle */}
        <Animated.View
          style={{
            opacity: anims[0].opacity,
            transform: anims[0].transform,
          }}
        >
          <Text style={styles.chartSubtitle}>Following your personal improvement plan</Text>
        </Animated.View>

        {/* Area chart */}
        <Animated.View
          style={[
            styles.chartContainer,
            {
              opacity: anims[0].opacity,
              transform: anims[0].transform,
            },
          ]}
        >
          {/* Y-axis ticks */}
          <View style={styles.yAxis}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.yTick} />
            ))}
          </View>

          {/* Chart area */}
          <View style={styles.chart}>
            {/* Horizontal grid lines */}
            {[25, 50, 75].map((pct) => (
              <View key={pct} style={[styles.gridLine, { bottom: `${pct}%` }]} />
            ))}

            {/* Filled area bars - "Attractiveness" (taller, blue-green) */}
            {Array.from({ length: BAR_COUNT }).map((_, i) => {
              const t = i / (BAR_COUNT - 1);
              const height = generateCurveHeight(t, CHART_HEIGHT * 0.85);

              const barOpacity = chartReveal.interpolate({
                inputRange: [
                  Math.max(0, (i - 2) / BAR_COUNT),
                  i / BAR_COUNT,
                  Math.min(1, (i + 1) / BAR_COUNT),
                ],
                outputRange: [0, 1, 1],
                extrapolate: 'clamp',
              });

              return (
                <Animated.View
                  key={`attract-${i}`}
                  style={[
                    styles.bar,
                    {
                      left: 10 + i * barWidth,
                      width: barWidth - 1,
                      height,
                      opacity: barOpacity,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={['#22C55E', '#059669']}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                  />
                </Animated.View>
              );
            })}

            {/* Filled area bars - "Confidence" (shorter, blue) */}
            {Array.from({ length: BAR_COUNT }).map((_, i) => {
              const t = i / (BAR_COUNT - 1);
              const height = generateCurveHeight(t, CHART_HEIGHT * 0.6);

              const barOpacity = chartReveal.interpolate({
                inputRange: [
                  Math.max(0, (i - 2) / BAR_COUNT),
                  i / BAR_COUNT,
                  Math.min(1, (i + 1) / BAR_COUNT),
                ],
                outputRange: [0, 1, 1],
                extrapolate: 'clamp',
              });

              return (
                <Animated.View
                  key={`conf-${i}`}
                  style={[
                    styles.bar,
                    {
                      left: 10 + i * barWidth,
                      width: barWidth - 1,
                      height,
                      opacity: barOpacity,
                      zIndex: 2,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={['#C084FC', '#7C3AED']}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                  />
                </Animated.View>
              );
            })}

          </View>

          {/* Callout labels — rendered as overlay outside overflow:hidden chart */}
          {CALLOUTS.map((callout, i) => (
            <Animated.View
              key={`callout-${i}`}
              style={[
                styles.callout,
                {
                  left: callout.xPx,
                  bottom: (callout.yFromBottom / 100) * CHART_HEIGHT + 30, // +30 for x-axis area
                  opacity: calloutAnims[i],
                  transform: [
                    {
                      translateY: calloutAnims[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [15, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.calloutChip}>
                <View style={styles.calloutDot} />
                <Text style={styles.calloutText}>{callout.label}</Text>
              </View>
            </Animated.View>
          ))}

          {/* X-axis labels */}
          <View style={styles.xAxis}>
            <Text style={styles.xLabel}>Now</Text>
            <Text style={styles.xLabel}>in 3 months</Text>
          </View>
        </Animated.View>

        {/* Headline section */}
        <Animated.View
          style={[
            styles.textSection,
            {
              opacity: anims[1].opacity,
              transform: anims[1].transform,
            },
          ]}
        >
          <Text style={styles.headline}>Small Steps,{'\n'}Big Changes</Text>
          <Text style={styles.subheadline}>
            The journey to a better you starts now. Protocol will guide you every step of the way.
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
  chartSubtitle: {
    ...typographyV2.caption,
    color: colorsV2.accentOrange,
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: spacingV2.sm,
    textTransform: 'uppercase',
  },
  chartContainer: {
    marginBottom: spacingV2.xl,
    position: 'relative',
  },
  yAxis: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 30,
    width: 10,
    justifyContent: 'space-between',
    paddingVertical: spacingV2.sm,
  },
  yTick: {
    width: 6,
    height: 1,
    backgroundColor: colorsV2.textMuted + '30',
  },
  chart: {
    height: CHART_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: borderRadiusV2.md,
  },
  gridLine: {
    position: 'absolute',
    left: 10,
    right: 0,
    height: 1,
    backgroundColor: colorsV2.textMuted + '10',
  },
  bar: {
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    overflow: 'hidden',
    opacity: 0.85,
  },
  // Callout labels (positioned in chartContainer, outside overflow:hidden chart)
  callout: {
    position: 'absolute',
    zIndex: 10,
  },
  calloutChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorsV2.surface,
    borderRadius: borderRadiusV2.sm,
    borderWidth: 1,
    borderColor: colorsV2.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  calloutDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  calloutText: {
    color: colorsV2.textPrimary,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  // X axis
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: spacingV2.sm,
  },
  xLabel: {
    ...typographyV2.caption,
    color: colorsV2.textMuted,
    fontSize: 12,
  },
  // Text section
  textSection: {
    marginBottom: spacingV2.lg,
  },
  headline: {
    ...typographyV2.display,
    textAlign: 'center',
    marginBottom: spacingV2.md,
  },
  subheadline: {
    ...typographyV2.body,
    color: colorsV2.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacingV2.md,
  },
});
