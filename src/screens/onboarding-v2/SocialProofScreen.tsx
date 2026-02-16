import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import GradientBackground from '../../components/v2/GradientBackground';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { typographyV2, spacingV2, borderRadiusV2, gradients } from '../../constants/themeV2';
import { useOnboardingTracking } from '../../hooks/useOnboardingTracking';

/** Parse "78% of users with acne report..." → { percent: 78, body: "of users with acne report..." } */
function parseDataStat(stat: string): { percent: number; body: string } {
  const match = stat.match(/^(\d+)%\s*(.+)$/);
  if (match) {
    return { percent: parseInt(match[1], 10), body: match[2] };
  }
  return { percent: 89, body: 'of users see visible improvement in just 14 days' };
}

export default function SocialProofScreen({ navigation }: any) {
  useOnboardingTracking('v2_social_proof');
  const { primaryProblem, content } = useOnboarding();
  const [countValue, setCountValue] = useState(0);
  const anims = useScreenEntrance(4);

  // Pull personalized data from JSON based on primary problem
  const personalized = useMemo(() => {
    if (!primaryProblem) return null;

    const problemData = (content as any).problems?.[primaryProblem];
    if (!problemData) return null;

    const education = problemData.education_real_cause;
    const dataStat = problemData.data_stat;

    if (!education || !dataStat) return null;

    const parsed = parseDataStat(dataStat);

    return {
      headline: education.title as string,
      percent: parsed.percent,
      body: parsed.body,
    };
  }, [primaryProblem, content]);

  const targetPercent = personalized?.percent ?? 89;
  const headlineText = personalized?.headline ?? 'We get it.';
  const bodyText = personalized?.body ?? 'of users see visible improvement in just 14 days';

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  // Count up animation
  useEffect(() => {
    const duration = 1500;
    const stepTime = Math.floor(duration / targetPercent);
    let current = 0;

    const interval = setInterval(() => {
      current += 1;
      setCountValue(current);
      if (current >= targetPercent) {
        clearInterval(interval);
      }
    }, stepTime);

    return () => clearInterval(interval);
  }, [targetPercent]);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('V2LifeImpact');
  };

  return (
    <View style={styles.container}>
      <GradientBackground animated={true} colors={gradients.deepViolet} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.centerContent}>
            <Animated.View
              style={{
                opacity: anims[0].opacity,
                transform: anims[0].transform,
              }}
            >
              <Text style={styles.headline}>{headlineText}</Text>
            </Animated.View>

            <Animated.View
              style={[
                styles.statContainer,
                {
                  opacity: anims[1].opacity,
                  transform: anims[1].transform,
                },
              ]}
            >
              <Text style={styles.statText}>{countValue}%</Text>
            </Animated.View>

            <Animated.View
              style={{
                opacity: anims[2].opacity,
                transform: anims[2].transform,
              }}
            >
              <Text style={styles.bodyText}>{bodyText}</Text>
            </Animated.View>

            <Animated.View
              style={{
                opacity: anims[3].opacity,
                transform: anims[3].transform,
              }}
            >
              <Text style={styles.secondaryText}>
                Join 12,000+ users already seeing results
              </Text>
            </Animated.View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={handleContinue}
              activeOpacity={0.8}
              style={styles.glowButton}
            >
              <Text style={styles.glowButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
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
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headline: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: spacingV2.xl,
    paddingHorizontal: spacingV2.md,
  },
  statContainer: {
    marginBottom: spacingV2.lg,
  },
  statText: {
    fontSize: 84,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  bodyText: {
    ...typographyV2.body,
    color: '#FFFFFF',
    opacity: 0.85,
    textAlign: 'center',
    marginBottom: spacingV2.xl,
    paddingHorizontal: spacingV2.lg,
  },
  secondaryText: {
    ...typographyV2.bodySmall,
    color: '#FFFFFF',
    opacity: 0.7,
    textAlign: 'center',
  },
  buttonContainer: {
    paddingBottom: spacingV2.lg,
  },
  glowButton: {
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
  glowButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5B21B6',
  },
});
