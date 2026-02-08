import { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated } from 'react-native';
import { AnimatedButton } from '../../components/AnimatedButton';
import { colors, typography, spacing, MONOSPACE_FONT } from '../../constants/theme';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useDevMode } from '../../contexts/DevModeContext';
import { OnboardingDevMenu } from '../../components/OnboardingDevMenu';
import { useOnboardingTracking, ONBOARDING_SCREENS } from '../../hooks/useOnboardingTracking';
import { CATEGORIES } from '../../constants/categories';

const DIVIDER = '━━━━━━━━━━━━━━━━━━━━━━━━';
const STAGGER_MS = 380;
const ANIM_DURATION = 450;

interface Milestone {
  week: number;
  description: string;
}

function getProblemDisplayName(problemId: string | null): string {
  if (!problemId) return '';
  const category = CATEGORIES.find((c) => c.id === problemId);
  if (category) {
    return category.label.split(' / ')[0];
  }
  return problemId.charAt(0).toUpperCase() + problemId.slice(1).replace(/_/g, ' ');
}

export default function MiniTimelinePreviewScreen({ navigation }: any) {
  useOnboardingTracking(ONBOARDING_SCREENS.MINI_TIMELINE_PREVIEW);
  const { data, primaryProblem, content, reset } = useOnboarding();
  const { isDevModeEnabled } = useDevMode();

  const problem = primaryProblem ? content.problems[primaryProblem] : null;
  const severityLevel = data.severityLevel ?? null;
  const timelineStats = problem?.timeline_stats as Record<string, { intro: string; milestones: Milestone[] }> | undefined;
  const variant = severityLevel && timelineStats ? timelineStats[severityLevel] : null;
  const rawMilestones = variant?.milestones ?? [];
  // For jawline/facial_hair (4 milestones), show 1st, 2nd, and last (4th) instead of 3rd
  const isFourMilestone = primaryProblem === 'jawline' || primaryProblem === 'facial_hair';
  const displayMilestones =
    isFourMilestone && rawMilestones.length === 4
      ? [rawMilestones[0], rawMilestones[1], rawMilestones[3]]
      : rawMilestones.slice(0, 3);
  const firstThree = displayMilestones;

  const startAnim = useRef(new Animated.Value(0)).current;
  const milestoneAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const lineAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const closingTextAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    startAnim.setValue(0);
    milestoneAnims.forEach((a) => a.setValue(0));
    lineAnims.forEach((a) => a.setValue(0));
    closingTextAnim.setValue(0);
    buttonAnim.setValue(0);

    Animated.timing(startAnim, { toValue: 1, duration: ANIM_DURATION, useNativeDriver: true }).start(() => {
      firstThree.forEach((_, index) => {
        const anim = milestoneAnims[index];
        const lineAnim = lineAnims[index];
        if (!anim || !lineAnim) return;
        Animated.sequence([
          Animated.delay(index * STAGGER_MS),
          Animated.parallel([
            Animated.timing(anim, { toValue: 1, duration: ANIM_DURATION, useNativeDriver: true }),
            Animated.timing(lineAnim, { toValue: 1, duration: ANIM_DURATION, useNativeDriver: true }),
          ]),
        ]).start(() => {
          // After last milestone, fade in closing text
          if (index === firstThree.length - 1) {
            Animated.sequence([
              Animated.delay(200),
              Animated.timing(closingTextAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            ]).start(() => {
              // After preparation text, fade in button
              Animated.sequence([
                Animated.delay(600),
                Animated.timing(buttonAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
              ]).start();
            });
          }
        });
      });
    });
  }, [firstThree.length]);

  const handleContinue = () => {
    navigation.navigate('ProtocolLoading');
  };

  if (!primaryProblem || !variant || firstThree.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Here is your timeline.</Text>

        {/* Day 1 - Starting point (fades in first) */}
        <Animated.View
          style={[
            styles.timelineItem,
            {
              opacity: startAnim,
              transform: [{ translateY: startAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
            },
          ]}
        >
          <View style={styles.timelineLeft}>
            <View style={styles.dotCurrent} />
            <Animated.View style={[styles.timelineLine, { opacity: startAnim }]} />
          </View>
          <View style={styles.timelineContent}>
            <View style={styles.startCard}>
              <Text style={styles.dayHeader}>DAY 1</Text>
              <Text style={styles.startText}>You are here</Text>
            </View>
          </View>
        </Animated.View>

        {/* Milestones (fade in with side lines animating) */}
        {firstThree.map((m: Milestone, index: number) => {
          const anim = milestoneAnims[index];
          const lineAnim = lineAnims[index];
          return (
            <Animated.View
              key={index}
              style={[
                styles.timelineItem,
                anim && {
                  opacity: anim,
                  transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
                },
              ]}
            >
              <View style={styles.timelineLeft}>
                <Animated.View
                  style={[
                    styles.dotFuture,
                    lineAnim && {
                      opacity: lineAnim,
                      transform: [{ scale: lineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }],
                    },
                  ]}
                />
                {index < firstThree.length - 1 && (
                  <Animated.View style={[styles.timelineLine, lineAnim && { opacity: lineAnim }]} />
                )}
              </View>
              <View style={styles.timelineContent}>
                <View style={styles.milestoneCard}>
                  <Text style={styles.weekHeader}>WEEK {m.week}</Text>
                  <Text style={styles.milestoneDescription}>{m.description}</Text>
                </View>
              </View>
            </Animated.View>
          );
        })}

        <Animated.Text style={[styles.closingLine, { opacity: closingTextAnim }]}>
          Consistency is everything.
        </Animated.Text>

        <Animated.View style={[styles.preparationSection, { opacity: closingTextAnim }]}>
          <Text style={styles.preparationText}>
            Ready to see your full personalized protocol?
          </Text>
        </Animated.View>
      </ScrollView>

      <View style={styles.bottomSection}>
        <OnboardingDevMenu />
        <Animated.View style={{ opacity: buttonAnim }}>
          <AnimatedButton style={styles.button} onPress={handleContinue}>
            <Text style={styles.buttonText}>Generate Protocol</Text>
          </AnimatedButton>
        </Animated.View>
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
    paddingTop: spacing.xl * 3,
    paddingBottom: spacing.xl,
  },
  heading: {
    ...typography.headingSmall,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  timelineLeft: {
    width: 32,
    alignItems: 'center',
    marginRight: spacing.md,
  },
  dotCurrent: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.text,
    borderWidth: 2,
    borderColor: colors.background,
  },
  dotFuture: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  startCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  dayHeader: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  startText: {
    ...typography.body,
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  milestoneCard: {
    backgroundColor: colors.surface,
    borderRadius: 4,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  weekHeader: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  milestoneDescription: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  closingLine: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  preparationSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  preparationText: {
    ...typography.body,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 26,
    paddingTop: spacing.lg,
  },
  bottomSection: {
    paddingTop: spacing.md,
  },
  button: {
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 4,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  buttonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.background,
  },
});
