import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated } from 'react-native';
import { AnimatedButton } from '../../components/AnimatedButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, MONOSPACE_FONT } from '../../constants/theme';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useDevMode } from '../../contexts/DevModeContext';
import { OnboardingDevMenu } from '../../components/OnboardingDevMenu';

const SECOND_STAT = '92% say it\'s easier than expected to stay consistent.';
const SOURCE_LINE = 'Source: 12,847 active users that answered';

const DIVIDER = '━━━━━━━━━━━━━━━━━━━━━━━━';

export default function TheDataScreen({ navigation }: any) {
  const { primaryProblem, content, reset } = useOnboarding();
  const { isDevModeEnabled } = useDevMode();
  const insets = useSafeAreaInsets();

  const problem = primaryProblem ? content.problems[primaryProblem] : null;
  const dataStat = (problem as any)?.data_stat ?? '78% of users see visible improvements by week 6.';

  // Extract percentage from dataStat (e.g., "78% of users...")
  const percentMatch = dataStat.match(/(\d+)%/);
  const targetPercent = percentMatch ? parseInt(percentMatch[1], 10) : 78;
  const remainingText = dataStat.replace(/\d+%/, '').trim();

  const percentAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [displayPercent, setDisplayPercent] = React.useState(0);

  useEffect(() => {
    // Animate percentage count-up
    Animated.timing(percentAnim, {
      toValue: targetPercent,
      duration: 1500,
      useNativeDriver: false,
    }).start();

    // Fade in supporting text after percentage starts
    Animated.sequence([
      Animated.delay(500),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Update displayed percentage
    const listener = percentAnim.addListener(({ value }) => {
      setDisplayPercent(Math.round(value));
    });

    return () => {
      percentAnim.removeListener(listener);
    };
  }, [targetPercent]);

  const handleContinue = () => {
    navigation.navigate('WhyThisWorks');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: spacing.xl + insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headingContainer}>
          <Text style={styles.heading}></Text>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{DIVIDER}</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.percentContainer}>
            <Text style={styles.percentNumber}>{displayPercent}%</Text>
          </View>

          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.stat1Text}>{remainingText}</Text>
            <Text style={styles.stat2}>{SECOND_STAT}</Text>
            <Text style={styles.source}>{SOURCE_LINE}</Text>
          </Animated.View>
        </View>
      </ScrollView>

      <View style={styles.bottomSection}>
        <OnboardingDevMenu />
        <AnimatedButton style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Continue</Text>
        </AnimatedButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  headingContainer: {
    marginBottom: spacing.xl,
  },
  heading: {
    ...typography.headingSmall,
    marginBottom: spacing.md,
  },
  dividerLine: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  dividerText: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 12,
    color: colors.textMuted,
  },
  statsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentContainer: {
    marginBottom: spacing.xl,
  },
  percentNumber: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 96,
    fontWeight: '700',
    color: colors.accent,
    textAlign: 'center',
    lineHeight: 96,
  },
  stat1Text: {
    ...typography.body,
    fontSize: 18,
    lineHeight: 28,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  stat2: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  source: {
    ...typography.bodySmall,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  bottomSection: {
    paddingTop: spacing.md,
  },
  button: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  buttonText: {
    ...typography.body,
    fontWeight: '600',
  },
});
