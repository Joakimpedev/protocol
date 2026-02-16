import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colorsV2, typographyV2, spacingV2, borderRadiusV2, gradients, shadows } from '../../constants/themeV2';
import GradientButton from '../../components/v2/GradientButton';
import V2ScreenWrapper from '../../components/v2/V2ScreenWrapper';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { CATEGORIES } from '../../constants/categories';
import { useOnboardingTracking } from '../../hooks/useOnboardingTracking';

const guideBlocks = require('../../data/guide_blocks.json');

function getProblemDisplayName(problemId: string | null): string {
  if (!problemId) return '';
  const c = CATEGORIES.find((cat: any) => cat.id === problemId);
  return c ? c.label.split(' / ')[0] : problemId.charAt(0).toUpperCase() + problemId.slice(1).replace(/_/g, ' ');
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

    for (const ingId of p.recommended_ingredients || []) {
      if (claimedIngredients.has(ingId)) continue;
      claimedIngredients.add(ingId);

      const ing = ingredients.find((i) => i.ingredient_id === ingId);
      const opts = ing?.timing_options ?? [];
      const duration = ing?.session?.duration_seconds ?? 30;
      const wait = ing?.session?.wait_after_seconds ?? 0;
      const stepTime = (typeof duration === 'number' ? duration : 30) + wait;

      if (opts.includes('morning')) seconds += stepTime;
      if (opts.includes('evening')) seconds += stepTime;
    }

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

export default function V2ProtocolOverviewScreen({ navigation }: any) {
  useOnboardingTracking('v2_protocol_overview');
  const { data, updateData, content } = useOnboarding();
  const anims = useScreenEntrance(5);

  const selectedProblems = data.selectedProblems?.length ? data.selectedProblems : data.selectedCategories ?? [];
  const [enabledProblems, setEnabledProblems] = useState<Set<string>>(
    new Set(selectedProblems)
  );

  const enabledProblemsArray = Array.from(enabledProblems);
  const { morningSteps, eveningSteps, exerciseCount, totalMinutes } = getRoutineStats(enabledProblemsArray);
  const allProblemTimes = getPerProblemTimes(selectedProblems, content);
  const toggleableProblems = selectedProblems.filter((id: string) => (allProblemTimes[id] ?? 0) > 0);

  const toggleProblem = (problemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = Array.from(enabledProblems);
    updateData({ selectedProblems: updated });

    setTimeout(() => {
      navigation.navigate('V2Shopping');
    }, 0);
  };

  const routineItems = [
    { label: 'Morning routine', value: `${morningSteps} steps`, icon: 'sunrise' },
    { label: 'Evening routine', value: `${eveningSteps} steps`, icon: 'moon' },
    ...(exerciseCount > 0 ? [{ label: 'Daily exercises', value: `${exerciseCount} exercises`, icon: 'activity' }] : []),
  ];

  return (
    <V2ScreenWrapper showProgress={false} scrollable>
      {/* Header */}
      <Animated.View style={[styles.headerContainer, { opacity: anims[0].opacity, transform: anims[0].transform }]}>
        <Text style={styles.label}>PERSONALIZED FOR YOU</Text>
        <Text style={styles.headline}>Your Protocol</Text>
      </Animated.View>

      {/* Protocol Card */}
      <Animated.View style={[styles.protocolCard, { opacity: anims[1].opacity, transform: anims[1].transform }]}>
        <LinearGradient
          colors={[colorsV2.surface, colorsV2.surfaceLight]}
          style={styles.cardGradient}
        >
          {/* Time badge */}
          <View style={styles.timeBadgeRow}>
            <View style={styles.timeBadge}>
              <LinearGradient
                colors={gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.timeBadgeGradient}
              >
                <Text style={styles.timeBadgeText}>{totalMinutes} min/day</Text>
              </LinearGradient>
            </View>
          </View>

          {/* Routine breakdown */}
          <View style={styles.routineList}>
            {routineItems.map((item, i) => (
              <View key={item.label} style={styles.routineRow}>
                <Text style={styles.routineLabel}>{item.label}</Text>
                <Text style={styles.routineValue}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* Based on */}
          {enabledProblemsArray.length > 0 && (
            <View style={styles.basedOnContainer}>
              <Text style={styles.basedOnLabel}>Based on</Text>
              <View style={styles.basedOnTags}>
                {enabledProblemsArray.map((id) => (
                  <View key={id} style={styles.tag}>
                    <Text style={styles.tagText}>{getProblemDisplayName(id)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </LinearGradient>
      </Animated.View>

      {/* Toggleable problems */}
      {toggleableProblems.length > 0 && (
        <Animated.View style={[styles.toggleSection, { opacity: anims[2].opacity, transform: anims[2].transform }]}>
          <Text style={styles.toggleTitle}>Customize your routine</Text>
          {toggleableProblems.map((problemId: string) => {
            const isEnabled = enabledProblems.has(problemId);
            const problemTime = allProblemTimes[problemId] ?? 0;

            return (
              <TouchableOpacity
                key={problemId}
                style={[styles.toggleCard, isEnabled && styles.toggleCardActive]}
                onPress={() => toggleProblem(problemId)}
                activeOpacity={0.8}
              >
                <View style={styles.toggleLeft}>
                  <View style={[styles.checkbox, isEnabled && styles.checkboxActive]}>
                    {isEnabled && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.toggleLabel, !isEnabled && styles.toggleLabelDisabled]}>
                    {getProblemDisplayName(problemId)} routine
                  </Text>
                </View>
                <Text style={[styles.toggleTime, !isEnabled && styles.toggleTimeDisabled]}>
                  +{problemTime} min
                </Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      )}

      {/* Info note */}
      <Animated.View style={[styles.noteContainer, { opacity: anims[3].opacity, transform: anims[3].transform }]}>
        <Text style={styles.noteText}>
          Next, we'll help you find the right products for your routine.
        </Text>
      </Animated.View>

      {/* Continue button */}
      <Animated.View style={[styles.buttonContainer, { opacity: anims[4].opacity, transform: anims[4].transform }]}>
        <GradientButton
          title="Continue"
          onPress={handleContinue}
          disabled={enabledProblemsArray.length === 0}
        />
      </Animated.View>
    </V2ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  // Header
  headerContainer: {
    marginTop: spacingV2.xl,
    marginBottom: spacingV2.lg,
  },
  label: {
    ...typographyV2.label,
    color: colorsV2.accentOrange,
    textAlign: 'center',
    marginBottom: spacingV2.sm,
    letterSpacing: 1.5,
  },
  headline: {
    ...typographyV2.hero,
    textAlign: 'center',
  },

  // Protocol Card
  protocolCard: {
    borderRadius: borderRadiusV2.xl,
    borderWidth: 1,
    borderColor: colorsV2.border,
    overflow: 'hidden',
    marginBottom: spacingV2.lg,
    ...shadows.card,
  },
  cardGradient: {
    padding: spacingV2.lg,
  },
  timeBadgeRow: {
    alignItems: 'center',
    marginBottom: spacingV2.lg,
  },
  timeBadge: {
    borderRadius: borderRadiusV2.pill,
    overflow: 'hidden',
    ...shadows.glow,
  },
  timeBadgeGradient: {
    paddingHorizontal: spacingV2.lg,
    paddingVertical: spacingV2.sm + 2,
    borderRadius: borderRadiusV2.pill,
  },
  timeBadgeText: {
    ...typographyV2.body,
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: 18,
  },

  // Routine rows
  routineList: {
    marginBottom: spacingV2.lg,
  },
  routineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacingV2.md - 2,
    borderBottomWidth: 1,
    borderBottomColor: colorsV2.border,
  },
  routineLabel: {
    ...typographyV2.body,
    color: colorsV2.textSecondary,
  },
  routineValue: {
    ...typographyV2.body,
    fontWeight: '600',
    color: colorsV2.accentPurple,
  },

  // Based on tags
  basedOnContainer: {
    marginTop: spacingV2.sm,
  },
  basedOnLabel: {
    ...typographyV2.label,
    color: colorsV2.textMuted,
    marginBottom: spacingV2.sm,
  },
  basedOnTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacingV2.sm,
  },
  tag: {
    backgroundColor: colorsV2.accentOrange + '18',
    borderWidth: 1,
    borderColor: colorsV2.accentOrange + '30',
    borderRadius: borderRadiusV2.pill,
    paddingHorizontal: spacingV2.md,
    paddingVertical: spacingV2.xs + 2,
  },
  tagText: {
    ...typographyV2.bodySmall,
    color: colorsV2.accentPurple,
    fontWeight: '600',
  },

  // Toggle section
  toggleSection: {
    marginBottom: spacingV2.lg,
  },
  toggleTitle: {
    ...typographyV2.subheading,
    marginBottom: spacingV2.md,
  },
  toggleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colorsV2.surface,
    borderWidth: 1,
    borderColor: colorsV2.border,
    borderRadius: borderRadiusV2.lg,
    paddingVertical: spacingV2.md,
    paddingHorizontal: spacingV2.lg,
    marginBottom: spacingV2.sm,
  },
  toggleCardActive: {
    borderColor: colorsV2.accentOrange + '40',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: colorsV2.textMuted,
    borderRadius: 6,
    marginRight: spacingV2.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: colorsV2.accentOrange,
    borderColor: colorsV2.accentOrange,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  toggleLabel: {
    ...typographyV2.body,
    color: colorsV2.textPrimary,
    flex: 1,
  },
  toggleLabelDisabled: {
    color: colorsV2.textMuted,
    textDecorationLine: 'line-through',
  },
  toggleTime: {
    ...typographyV2.bodySmall,
    fontWeight: '600',
    color: colorsV2.accentPurple,
  },
  toggleTimeDisabled: {
    color: colorsV2.textMuted,
  },

  // Note
  noteContainer: {
    backgroundColor: colorsV2.surface,
    borderRadius: borderRadiusV2.lg,
    borderWidth: 1,
    borderColor: colorsV2.border,
    padding: spacingV2.md,
    marginBottom: spacingV2.lg,
  },
  noteText: {
    ...typographyV2.bodySmall,
    color: colorsV2.textSecondary,
    textAlign: 'center',
  },

  // Button
  buttonContainer: {
    marginBottom: spacingV2.lg,
  },
});
