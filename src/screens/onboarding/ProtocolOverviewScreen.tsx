import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated } from 'react-native';
import { AnimatedButton } from '../../components/AnimatedButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, MONOSPACE_FONT } from '../../constants/theme';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useDevMode } from '../../contexts/DevModeContext';
import { OnboardingDevMenu } from '../../components/OnboardingDevMenu';
import { useOnboardingTracking, ONBOARDING_SCREENS } from '../../hooks/useOnboardingTracking';
import { CATEGORIES } from '../../constants/categories';

const guideBlocks = require('../../data/guide_blocks.json');

const DIVIDER = '━━━━━━━━━━━━━━━━━━━━━━━━';

function getProblemDisplayName(problemId: string | null): string {
  if (!problemId) return '';
  const c = CATEGORIES.find((cat) => cat.id === problemId);
  return c ? c.label.split(' / ')[0] : problemId.charAt(0).toUpperCase() + problemId.slice(1).replace(/_/g, ' ');
}

function getPersonalizedRoutineName(
  problemId: string,
  isPrimary: boolean,
  severityValue: string | null,
  skinType: string | null,
  followupAnswer: string | null,
  content: any
): string {
  const problem = content?.problems?.[problemId];
  if (!problem) return `${getProblemDisplayName(problemId)} routine`;

  let prefix = '';

  // Special cases - always use these labels
  if (problemId === 'acne') {
    prefix = 'Custom acne';
  } else if (problemId === 'jawline') {
    prefix = 'Moderate jawline';
  } else if (isPrimary && severityValue) {
    // For other primary problems, use detailed description
    const severityOptions = problem.severity_question?.options || [];
    const severityOption = severityOptions.find((opt: any) => opt.value === severityValue);

    if (severityOption?.label) {
      const label = severityOption.label;

      if (problemId === 'oily_skin' || problemId === 'dry_skin') {
        const severityWord = label.split(' - ')[0].trim();
        prefix = `${severityWord} ${getProblemDisplayName(problemId).toLowerCase()}`;
      } else if (problemId === 'facial_hair') {
        // "Fill in patchy areas" → "Patchy facial hair"
        if (label.includes('patchy')) prefix = 'Patchy facial hair';
        else if (label.includes('Faster growth')) prefix = 'Facial hair growth';
        else if (label.includes('Thicker')) prefix = 'Thicker facial hair';
        else if (label.includes('starting')) prefix = 'New facial hair growth';
        else prefix = getProblemDisplayName(problemId);
      } else if (problemId === 'blackheads' || problemId === 'skin_texture' || problemId === 'hyperpigmentation') {
        const severityWord = label.split(' - ')[0].trim();
        prefix = `${severityWord} ${getProblemDisplayName(problemId).toLowerCase()}`;
      } else if (problemId === 'dark_circles') {
        const severityWord = label.split(' - ')[0].trim();
        prefix = `${severityWord} ${getProblemDisplayName(problemId).toLowerCase()}`;
      } else {
        prefix = label.split(' - ')[0].trim();
      }
    } else {
      prefix = getProblemDisplayName(problemId);
    }
  } else {
    // For non-primary problems, just use the problem name
    prefix = getProblemDisplayName(problemId);
  }

  return `${prefix} routine`;
}

function getDetailedProblemDescription(
  problemId: string,
  severityValue: string | null,
  skinType: string | null,
  content: any
): string {
  const problem = content?.problems?.[problemId];
  if (!problem) return getProblemDisplayName(problemId);

  const severityOptions = problem.severity_question?.options || [];
  const severityOption = severityOptions.find((opt: any) => opt.value === severityValue);

  let description = '';

  if (severityOption?.label) {
    const label = severityOption.label;

    // Handle different problem types
    if (problemId === 'acne' || problemId === 'oily_skin' || problemId === 'dry_skin') {
      // For acne/skin: "Mild - Few breakouts" → "Mild acne"
      const severityWord = label.split(' - ')[0].trim();
      description = `${severityWord} ${getProblemDisplayName(problemId).toLowerCase()}`;
    } else if (problemId === 'jawline') {
      // For jawline: "Weak/recessed jaw" → "Weak jawline"
      if (label.includes('Weak')) description = 'Weak jawline';
      else if (label.includes('Double chin')) description = 'Double chin';
      else if (label.includes('Asymmetrical')) description = 'Asymmetrical jawline';
      else if (label.includes('definition')) description = 'Jawline definition';
      else description = label;
    } else if (problemId === 'facial_hair') {
      // For beard: "Fill in patchy areas" → "Patchy facial hair"
      if (label.includes('patchy')) description = 'Patchy facial hair';
      else if (label.includes('Faster growth')) description = 'Facial hair growth';
      else if (label.includes('Thicker')) description = 'Thicker facial hair';
      else if (label.includes('starting')) description = 'New facial hair growth';
      else description = getProblemDisplayName(problemId);
    } else if (problemId === 'blackheads' || problemId === 'skin_texture' || problemId === 'hyperpigmentation') {
      // For other skincare: extract severity
      const severityWord = label.split(' - ')[0].trim();
      description = `${severityWord} ${getProblemDisplayName(problemId).toLowerCase()}`;
    } else if (problemId === 'dark_circles') {
      const severityWord = label.split(' - ')[0].trim();
      description = `${severityWord} ${getProblemDisplayName(problemId).toLowerCase()}`;
    } else {
      // Fallback: use label or problem name
      description = label.split(' - ')[0].trim();
    }
  } else {
    description = getProblemDisplayName(problemId);
  }

  // For skincare problems (excluding oily/dry which are skin types themselves), add skin type
  const skincareProblems = ['acne', 'blackheads', 'skin_texture', 'hyperpigmentation'];
  if (skincareProblems.includes(problemId) && skinType && skinType !== 'normal') {
    const skinTypeMap: Record<string, string> = {
      oily: 'oily skin',
      dry: 'dry skin',
      combination: 'combination skin',
    };
    const skinTypeLabel = skinTypeMap[skinType] || skinType;
    description += `, ${skinTypeLabel}`;
  }

  return description;
}

function getRoutineStats(selectedProblemIds: string[]): {
  morningSteps: number;
  eveningSteps: number;
  exerciseCount: number;
  totalMinutes: number;
} {
  const problems: Array<{ problem_id: string; recommended_ingredients: string[]; recommended_exercises: string[] }> = guideBlocks.problems || [];
  const ingredients: Array<{
    ingredient_id: string;
    timing_options?: string[];
    session?: { duration_seconds?: number | null; wait_after_seconds?: number };
  }> = guideBlocks.ingredients || [];
  const exercises: Array<{
    exercise_id: string;
    session?: { duration_seconds?: number };
    default_duration?: number;
  }> = guideBlocks.exercises || [];

  const ingredientIds = new Set<string>();
  const exerciseIds = new Set<string>();
  selectedProblemIds.forEach((id) => {
    const p = problems.find((x) => x.problem_id === id);
    if (p) {
      (p.recommended_ingredients || []).forEach((ing) => ingredientIds.add(ing));
      (p.recommended_exercises || []).forEach((ex) => exerciseIds.add(ex));
    }
  });

  let morningSteps = 0;
  let eveningSteps = 0;
  let morningSeconds = 0;
  let eveningSeconds = 0;

  ingredientIds.forEach((ingId) => {
    const ing = ingredients.find((i) => i.ingredient_id === ingId);
    const opts = ing?.timing_options ?? [];
    const duration = ing?.session?.duration_seconds ?? 30;
    const wait = ing?.session?.wait_after_seconds ?? 0;
    const stepTime = (typeof duration === 'number' ? duration : 30) + wait;

    if (opts.includes('morning')) {
      morningSteps += 1;
      morningSeconds += stepTime;
    }
    if (opts.includes('evening')) {
      eveningSteps += 1;
      eveningSeconds += stepTime;
    }
  });

  // Add exercise time
  let exerciseSeconds = 0;
  exerciseIds.forEach((exId) => {
    const ex = exercises.find((e) => e.exercise_id === exId);
    if (ex?.session?.duration_seconds) {
      exerciseSeconds += ex.session.duration_seconds;
    } else if (ex?.default_duration) {
      exerciseSeconds += ex.default_duration;
    }
  });

  const totalMinutes = Math.max(1, Math.round((morningSeconds + eveningSeconds + exerciseSeconds) / 60));

  return {
    morningSteps: Math.max(1, morningSteps),
    eveningSteps: Math.max(1, eveningSteps),
    exerciseCount: exerciseIds.size,
    totalMinutes,
  };
}

/**
 * Calculate per-problem incremental time. Higher-priority problems "claim" shared
 * ingredients first. Lower-priority problems only show time for their unique additions.
 */
function getPerProblemTimes(
  enabledProblemIds: string[],
  content: any
): Record<string, number> {
  const problems: Array<{
    problem_id: string;
    recommended_ingredients: string[];
    recommended_exercises: string[];
  }> = guideBlocks.problems || [];
  const ingredients: Array<{
    ingredient_id: string;
    timing_options?: string[];
    session?: { duration_seconds?: number | null; wait_after_seconds?: number };
  }> = guideBlocks.ingredients || [];
  const exercises: Array<{
    exercise_id: string;
    session?: { duration_seconds?: number };
    default_duration?: number;
  }> = guideBlocks.exercises || [];

  // Sort by priority (lowest number = highest priority)
  const sorted = [...enabledProblemIds].sort((a, b) => {
    const pa = content?.problems?.[a]?.priority ?? 99;
    const pb = content?.problems?.[b]?.priority ?? 99;
    return pa - pb;
  });

  const claimedIngredients = new Set<string>();
  const claimedExercises = new Set<string>();
  const timeMap: Record<string, number> = {};

  for (const problemId of sorted) {
    const p = problems.find((x) => x.problem_id === problemId);
    if (!p) {
      timeMap[problemId] = 0;
      continue;
    }

    let seconds = 0;

    // Only count ingredients not already claimed by a higher-priority problem
    for (const ingId of p.recommended_ingredients || []) {
      if (claimedIngredients.has(ingId)) continue;
      claimedIngredients.add(ingId);

      const ing = ingredients.find((i) => i.ingredient_id === ingId);
      const opts = ing?.timing_options ?? [];
      const duration = ing?.session?.duration_seconds ?? 30;
      const wait = ing?.session?.wait_after_seconds ?? 0;
      const stepTime = (typeof duration === 'number' ? duration : 30) + wait;

      // Count for each routine this ingredient appears in
      if (opts.includes('morning')) seconds += stepTime;
      if (opts.includes('evening')) seconds += stepTime;
    }

    // Only count exercises not already claimed
    for (const exId of p.recommended_exercises || []) {
      if (claimedExercises.has(exId)) continue;
      claimedExercises.add(exId);

      const ex = exercises.find((e) => e.exercise_id === exId);
      if (ex?.session?.duration_seconds) {
        seconds += ex.session.duration_seconds;
      } else if (ex?.default_duration) {
        seconds += ex.default_duration;
      }
    }

    timeMap[problemId] = Math.round(seconds / 60);
  }

  return timeMap;
}

export default function ProtocolOverviewScreen({ navigation }: any) {
  useOnboardingTracking(ONBOARDING_SCREENS.PROTOCOL_OVERVIEW);
  const { data, updateData, totalRoutineTime, primaryProblem, content, reset } = useOnboarding();
  const { isDevModeEnabled } = useDevMode();
  const insets = useSafeAreaInsets();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const selectedProblems = data.selectedProblems?.length ? data.selectedProblems : data.selectedCategories ?? [];

  // State to track which problems are enabled (all enabled by default)
  const [enabledProblems, setEnabledProblems] = useState<Set<string>>(
    new Set(selectedProblems)
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Calculate totals based on enabled problems (ingredients are deduplicated)
  const enabledProblemsArray = Array.from(enabledProblems);
  const { morningSteps, eveningSteps, exerciseCount, totalMinutes: calculatedTotalTime } = getRoutineStats(enabledProblemsArray);
  // Calculate per-problem incremental times. Problems with 0 extra time
  // (all ingredients covered by higher-priority problems) are "absorbed" —
  // mentioned in "Based on:" but not shown as toggleable checkboxes.
  const allProblemTimes = getPerProblemTimes(selectedProblems, content);
  const toggleableProblems = selectedProblems.filter((id) => (allProblemTimes[id] ?? 0) > 0);
  const absorbedProblems = selectedProblems.filter((id) => (allProblemTimes[id] ?? 0) === 0);

  // Get detailed description for primary problem (if enabled)
  const primaryDetailedName = primaryProblem && enabledProblems.has(primaryProblem)
    ? getDetailedProblemDescription(primaryProblem, data.severityLevel, data.skinType, content)
    : '';

  // Build "Based on:" from all enabled problems (toggleable + absorbed)
  const allEnabledNames = enabledProblemsArray
    .filter((id) => id !== primaryProblem)
    .map(getProblemDisplayName)
    .filter(Boolean);
  // Also include absorbed problems that are still enabled
  const absorbedNames = absorbedProblems
    .filter((id) => enabledProblems.has(id) && id !== primaryProblem && !allEnabledNames.includes(getProblemDisplayName(id)))
    .map(getProblemDisplayName);
  const additionalNames = [...allEnabledNames, ...absorbedNames].filter(Boolean);

  const basedOnText = primaryDetailedName
    ? (additionalNames.length > 0
        ? `${primaryDetailedName}, ${additionalNames.join(', ')}`
        : primaryDetailedName)
    : additionalNames.join(', ');

  // Toggle problem enabled/disabled
  const toggleProblem = (problemId: string) => {
    setEnabledProblems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(problemId)) {
        newSet.delete(problemId);
      } else {
        newSet.add(problemId);
      }
      return newSet;
    });
  };

  const handleContinue = () => {
    // Save enabled problems back to context so downstream screens use the updated list.
    const enabledProblemsArray = Array.from(enabledProblems);
    console.log('[ProtocolOverview] Updating selectedProblems:', enabledProblemsArray);
    updateData({ selectedProblems: enabledProblemsArray });

    // CRITICAL: Use setTimeout to ensure context update propagates before navigation
    // This prevents race condition where downstream screens read stale context
    setTimeout(() => {
      navigation.navigate('ReassuranceBeforeShopping');
    }, 0);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: spacing.xl + insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topDivider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{DIVIDER}</Text>
        </View>

        <Animated.View
          style={[
            styles.protocolCard,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>YOUR PROTOCOL</Text>
            <Text style={styles.timeTag}>{calculatedTotalTime} min/day</Text>
          </View>

          <View style={styles.cardDivider} />

          <Text style={styles.basedOn}>Based on: {basedOnText}</Text>

          <View style={styles.routinesList}>
            <View style={styles.routineItem}>
              <Text style={styles.routineLabel}>Morning routine</Text>
              <Text style={styles.routineValue}>{morningSteps} steps</Text>
            </View>
            <View style={styles.routineItem}>
              <Text style={styles.routineLabel}>Evening routine</Text>
              <Text style={styles.routineValue}>{eveningSteps} steps</Text>
            </View>
            {exerciseCount > 0 && (
              <View style={styles.routineItem}>
                <Text style={styles.routineLabel}>Daily exercises</Text>
                <Text style={styles.routineValue}>{exerciseCount} exercises</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {toggleableProblems.length > 0 && (
          <View style={styles.problemsSection}>
            {toggleableProblems.map((problemId) => {
              const isEnabled = enabledProblems.has(problemId);
              const problemTime = allProblemTimes[problemId] ?? 0;
              const isPrimary = problemId === primaryProblem;
              const routineName = getPersonalizedRoutineName(
                problemId,
                isPrimary,
                data.severityLevel,
                data.skinType,
                data.followupAnswer,
                content
              );

              return (
                <TouchableOpacity
                  key={problemId}
                  style={styles.problemItem}
                  onPress={() => toggleProblem(problemId)}
                  activeOpacity={0.7}
                >
                  <View style={styles.checkboxContainer}>
                    <View style={[styles.checkbox, isEnabled && styles.checkboxChecked]}>
                      {isEnabled && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={[styles.problemLabel, !isEnabled && styles.problemLabelDisabled]}>
                      {routineName}
                    </Text>
                  </View>
                  <Text style={[styles.problemTime, !isEnabled && styles.problemTimeDisabled]}>
                    {problemTime} min/day
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
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
  topDivider: {
    marginBottom: spacing.xl,
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
  protocolCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: 8,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1,
  },
  timeTag: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  basedOn: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  routinesList: {
    marginTop: spacing.sm,
  },
  routineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  routineLabel: {
    ...typography.body,
    fontSize: 16,
    color: colors.text,
  },
  routineValue: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent,
  },
  problemsSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  problemItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkmark: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '700',
  },
  problemLabel: {
    ...typography.body,
    fontSize: 16,
    color: colors.text,
  },
  problemLabelDisabled: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  problemTime: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  problemTimeDisabled: {
    color: colors.textMuted,
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
