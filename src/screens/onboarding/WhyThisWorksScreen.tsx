import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Image } from 'react-native';
import { AnimatedButton } from '../../components/AnimatedButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, MONOSPACE_FONT } from '../../constants/theme';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useDevMode } from '../../contexts/DevModeContext';
import { OnboardingDevMenu } from '../../components/OnboardingDevMenu';
import { useOnboardingTracking, ONBOARDING_SCREENS } from '../../hooks/useOnboardingTracking';
import { CATEGORIES } from '../../constants/categories';

const DIVIDER = '━━━━━━━━━━━━━━━━━━━━━━━━';
const PROTOCOL_GREEN = '#00CC00';

const ROW_STAGGER_MS = 150;
const ROW_ANIM_DURATION = 350;

interface ComparisonRow {
  typical: string;
  protocol: string;
}

function getProblemLabel(problemId: string): string {
  const category = CATEGORIES.find((c) => c.id === problemId);
  if (category) return category.label.split(' / ')[0].toLowerCase();
  return problemId.replace(/_/g, ' ');
}

function getComparisons(primaryProblem: string | null, content: any): ComparisonRow[] {
  if (!primaryProblem) {
    return [
      { typical: 'Random advice online', protocol: 'Custom plan for your goals' },
      { typical: 'No structure or timing', protocol: 'Morning + evening routines' },
      { typical: 'Don\'t track consistency', protocol: 'Analytics show gaps' },
      { typical: 'Can\'t measure progress', protocol: 'Weekly photo tracking' },
    ];
  }

  const problem = content.problems[primaryProblem];
  if (!problem || !problem.why_protocol_works) {
    return [
      { typical: 'Random advice online', protocol: 'Custom plan for your goals' },
      { typical: 'No structure or timing', protocol: 'Morning + evening routines' },
      { typical: 'Don\'t track consistency', protocol: 'Analytics show gaps' },
      { typical: 'Can\'t measure progress', protocol: 'Weekly photo tracking' },
    ];
  }

  return problem.why_protocol_works.comparisons || [];
}

export default function WhyThisWorksScreen({ navigation }: any) {
  useOnboardingTracking(ONBOARDING_SCREENS.WHY_THIS_WORKS);
  const { primaryProblem, content, reset } = useOnboarding();
  const { isDevModeEnabled } = useDevMode();
  const insets = useSafeAreaInsets();

  const comparisons = getComparisons(primaryProblem, content);
  const problemLabel = primaryProblem ? getProblemLabel(primaryProblem) : 'their issue';

  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const rowAnims = useRef(comparisons.map(() => new Animated.Value(0))).current;
  const closingFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Reset all animations
    headerFadeAnim.setValue(0);
    rowAnims.forEach((anim) => anim.setValue(0));
    closingFadeAnim.setValue(0);

    // Fade in header first
    Animated.timing(headerFadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Then stagger row animations
    comparisons.forEach((_, index) => {
      Animated.sequence([
        Animated.delay(300 + index * ROW_STAGGER_MS),
        Animated.timing(rowAnims[index], {
          toValue: 1,
          duration: ROW_ANIM_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    });

    // Fade in closing
    Animated.sequence([
      Animated.delay(300 + comparisons.length * ROW_STAGGER_MS + ROW_ANIM_DURATION),
      Animated.timing(closingFadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [comparisons.length]);

  const handleContinue = () => {
    navigation.navigate('WOWMoment');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: spacing.xl + insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Why 84% of users see success with Protocol:</Text>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{DIVIDER}</Text>

        <Animated.View style={[styles.contextSection, { opacity: headerFadeAnim }]}>
          <Text style={styles.contextText}>Most guys with {problemLabel} try:</Text>
        </Animated.View>

        <View style={styles.comparisonTable}>
          {/* Table Header */}
          <Animated.View style={[styles.tableHeader, { opacity: headerFadeAnim }]}>
            <View style={styles.leftColumn}>
              <Text style={styles.columnHeaderText}>❌ Typical Approach</Text>
            </View>
            <View style={styles.rightColumn}>
              <View style={styles.protocolHeader}>
                <Image
                  source={require('../../../assets/images/icon.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
                <Text style={styles.protocolHeaderText}>Protocol</Text>
              </View>
            </View>
          </Animated.View>

          {/* Separator */}
          <Animated.View style={[styles.headerSeparator, { opacity: headerFadeAnim }]} />

          {/* Comparison Rows */}
          {comparisons.map((row, index) => {
            const anim = rowAnims[index];
            return (
              <Animated.View
                key={index}
                style={[
                  styles.tableRow,
                  {
                    opacity: anim,
                    transform: [
                      {
                        scale: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.95, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.leftColumn}>
                  <Text style={styles.typicalText}>{row.typical}</Text>
                </View>
                <View style={styles.rightColumn}>
                  <Text style={styles.protocolText}>{row.protocol}</Text>
                </View>
              </Animated.View>
            );
          })}
        </View>

        <Animated.View style={[styles.closingSection, { opacity: closingFadeAnim }]}>
          <Text style={styles.closing}>Not random advice. A system built for you.</Text>
        </Animated.View>
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
  heading: {
    ...typography.headingSmall,
    marginBottom: spacing.md,
    textAlign: 'center',
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
    marginBottom: spacing.lg,
  },
  contextSection: {
    marginBottom: spacing.md,
  },
  contextText: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  comparisonTable: {
    marginBottom: spacing.xl,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  leftColumn: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  rightColumn: {
    flex: 1,
    paddingLeft: spacing.sm,
  },
  columnHeaderText: {
    ...typography.bodySmall,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  protocolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  logo: {
    width: 20,
    height: 20,
  },
  protocolHeaderText: {
    ...typography.bodySmall,
    fontSize: 13,
    fontWeight: '700',
    color: PROTOCOL_GREEN,
    letterSpacing: 0.3,
  },
  headerSeparator: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 56,
    alignItems: 'center',
  },
  typicalText: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  protocolText: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: PROTOCOL_GREEN,
    fontWeight: '600',
  },
  closingSection: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  closing: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomSection: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
