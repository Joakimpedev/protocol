import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colorsV2, typographyV2, spacingV2, borderRadiusV2, gradients, shadows } from '../../constants/themeV2';
import GradientButton from '../../components/v2/GradientButton';
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
  totalMinutes: number;
  productCount: number;
  exerciseCount: number;
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

  let totalSeconds = 0;

  ingredientIds.forEach((ingId) => {
    const ing = ingredients.find((i) => i.ingredient_id === ingId);
    const opts = ing?.timing_options ?? [];
    const duration = ing?.session?.duration_seconds ?? 30;
    const wait = ing?.session?.wait_after_seconds ?? 0;
    const stepTime = (typeof duration === 'number' ? duration : 30) + wait;

    if (opts.includes('morning')) totalSeconds += stepTime;
    if (opts.includes('evening')) totalSeconds += stepTime;
  });

  exerciseIds.forEach((exId) => {
    const ex = exercises.find((e) => e.exercise_id === exId);
    if (ex?.session?.duration_seconds) {
      totalSeconds += ex.session.duration_seconds;
    } else if (ex?.default_duration) {
      totalSeconds += ex.default_duration;
    }
  });

  const totalMinutes = selectedProblemIds.length === 0 ? 0 : Math.max(1, Math.round(totalSeconds / 60));

  return {
    totalMinutes,
    productCount: ingredientIds.size,
    exerciseCount: exerciseIds.size,
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

function getIncrementalTime(
  problemId: string,
  enabledProblemIds: string[],
  content: any
): number {
  const withTimes = getPerProblemTimes([...enabledProblemIds, problemId], content);
  return withTimes[problemId] ?? 0;
}

export default function V2ProtocolOverviewScreen({ navigation }: any) {
  useOnboardingTracking('v2_protocol_overview');
  const { data, updateData, content } = useOnboarding();
  const insets = useSafeAreaInsets();
  const anims = useScreenEntrance(5);

  const selectedProblems = data.selectedProblems?.length ? data.selectedProblems : data.selectedCategories ?? [];
  const [enabledProblems, setEnabledProblems] = useState<Set<string>>(
    new Set(selectedProblems)
  );

  const enabledProblemsArray = Array.from(enabledProblems);
  const { totalMinutes, productCount, exerciseCount } = getRoutineStats(enabledProblemsArray);

  // Problems the user did NOT select — candidates for "Add more routines"
  const allProblemIds = CATEGORIES.map(c => c.id);
  const unselectedProblems = allProblemIds.filter(id => !selectedProblems.includes(id));

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
    updateData({
      selectedProblems: updated,
    });

    setTimeout(() => {
      navigation.navigate('V2Habits');
    }, 0);
  };

  const screen = (
    <View style={styles.container}>
      {/* ─── Sticky top: header + summary card ─── */}
      <View style={[styles.stickyTop, { paddingTop: insets.top + spacingV2.lg }]}>
        <Animated.View style={[styles.headerContainer, { opacity: anims[0].opacity, transform: anims[0].transform }]}>
          <Text style={styles.label}>PERSONALIZED FOR YOU</Text>
          <Text style={styles.headline}>Your Protocol</Text>
        </Animated.View>

        <Animated.View style={[styles.summaryCard, { opacity: anims[1].opacity, transform: anims[1].transform }]}>
          <LinearGradient
            colors={[colorsV2.surface, colorsV2.surfaceLight]}
            style={styles.summaryGradient}
          >
            {/* Time badge */}
            <View style={styles.timeBadge}>
              <LinearGradient
                colors={gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.timeBadgeGradient}
              >
                <Text style={styles.timeBadgeText}>{totalMinutes} min / day</Text>
              </LinearGradient>
            </View>

            {/* Products + exercises */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{productCount}</Text>
                <Text style={styles.statLabel}>products</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{exerciseCount}</Text>
                <Text style={styles.statLabel}>exercises</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>

      {/* ─── Scrollable: routine toggles + button ─── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacingV2.lg }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Toggleable problems (selected concerns) */}
        {selectedProblems.length > 0 && (
          <Animated.View style={[styles.toggleSection, { opacity: anims[2].opacity, transform: anims[2].transform }]}>
            <Text style={styles.toggleTitle}>Customize your routine</Text>
            {selectedProblems.map((problemId: string) => {
              const isEnabled = enabledProblems.has(problemId);
              const baseProblems = isEnabled
                ? enabledProblemsArray.filter(id => id !== problemId)
                : enabledProblemsArray;
              const incrementalTime = getIncrementalTime(problemId, baseProblems, content);

              return (
                <TouchableOpacity
                  key={problemId}
                  style={[styles.toggleCard, isEnabled && styles.toggleCardActive]}
                  onPress={() => toggleProblem(problemId)}
                  activeOpacity={0.8}
                >
                  <View style={styles.toggleLeft}>
                    <View style={[styles.checkbox, isEnabled && styles.checkboxActive]}>
                      {isEnabled && <Text style={styles.checkmark}>{'\u2713'}</Text>}
                    </View>
                    <Text style={[styles.toggleLabel, !isEnabled && styles.toggleLabelDisabled]}>
                      {getProblemDisplayName(problemId)} routine
                    </Text>
                  </View>
                  {incrementalTime > 0 && (
                    <Text style={[styles.toggleTime, !isEnabled && styles.toggleTimeDisabled]}>
                      +{incrementalTime} min
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        )}

        {/* Add more routines (unselected concerns) */}
        {unselectedProblems.length > 0 && (
          <Animated.View style={[styles.toggleSection, { opacity: anims[3].opacity, transform: anims[3].transform }]}>
            <Text style={styles.toggleTitle}>Add more routines</Text>
            <Text style={styles.addMoreSubtitle}>
              Expand your protocol with additional routines
            </Text>
            {unselectedProblems.map((problemId: string) => {
              const isEnabled = enabledProblems.has(problemId);
              const baseProblems = isEnabled
                ? enabledProblemsArray.filter(id => id !== problemId)
                : enabledProblemsArray;
              const incrementalTime = getIncrementalTime(problemId, baseProblems, content);

              return (
                <TouchableOpacity
                  key={problemId}
                  style={[styles.toggleCard, isEnabled && styles.toggleCardActive]}
                  onPress={() => toggleProblem(problemId)}
                  activeOpacity={0.8}
                >
                  <View style={styles.toggleLeft}>
                    <View style={[styles.checkbox, isEnabled && styles.checkboxActive]}>
                      {isEnabled && <Text style={styles.checkmark}>{'\u2713'}</Text>}
                    </View>
                    <Text style={[styles.toggleLabel, !isEnabled && styles.toggleLabelDisabled]}>
                      {getProblemDisplayName(problemId)} routine
                    </Text>
                  </View>
                  {incrementalTime > 0 && (
                    <Text style={[styles.toggleTime, !isEnabled && styles.toggleTimeDisabled]}>
                      +{incrementalTime} min
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        )}

        {/* Info note */}
        <Animated.View style={[styles.noteContainer, { opacity: anims[4].opacity, transform: anims[4].transform }]}>
          <Text style={styles.noteText}>
            Next, we'll show you some free habits you can add, then the products for your skincare routine.
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
      </ScrollView>
    </View>
  );

  if (Platform.OS === 'ios') {
    return (
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        {screen}
      </KeyboardAvoidingView>
    );
  }

  return screen;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colorsV2.background,
  },

  // ─── Sticky top ───
  stickyTop: {
    backgroundColor: colorsV2.background,
    paddingHorizontal: spacingV2.lg,
    borderBottomWidth: 1,
    borderBottomColor: colorsV2.border,
    paddingBottom: spacingV2.md,
  },
  headerContainer: {
    marginBottom: spacingV2.md,
  },
  label: {
    ...typographyV2.label,
    color: colorsV2.accentOrange,
    textAlign: 'center',
    marginBottom: spacingV2.xs,
    letterSpacing: 1.5,
  },
  headline: {
    ...typographyV2.hero,
    textAlign: 'center',
    fontSize: 28,
  },

  // ─── Summary card ───
  summaryCard: {
    borderRadius: borderRadiusV2.xl,
    borderWidth: 1,
    borderColor: colorsV2.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  summaryGradient: {
    padding: spacingV2.md,
    alignItems: 'center',
  },
  timeBadge: {
    borderRadius: borderRadiusV2.pill,
    overflow: 'hidden',
    marginBottom: spacingV2.md,
    ...shadows.glow,
  },
  timeBadgeGradient: {
    paddingHorizontal: spacingV2.lg,
    paddingVertical: spacingV2.sm,
    borderRadius: borderRadiusV2.pill,
  },
  timeBadgeText: {
    ...typographyV2.body,
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: 18,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: spacingV2.md,
  },
  statValue: {
    ...typographyV2.body,
    fontWeight: '700',
    color: colorsV2.accentPurple,
    fontSize: 20,
  },
  statLabel: {
    ...typographyV2.caption,
    color: colorsV2.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colorsV2.border,
  },

  // ─── Scrollable content ───
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacingV2.lg,
    paddingTop: spacingV2.lg,
  },

  // Toggle section
  toggleSection: {
    marginBottom: spacingV2.lg,
  },
  toggleTitle: {
    ...typographyV2.subheading,
    marginBottom: spacingV2.md,
  },
  addMoreSubtitle: {
    ...typographyV2.bodySmall,
    color: colorsV2.textSecondary,
    marginBottom: spacingV2.md,
    marginTop: -spacingV2.sm,
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
    marginLeft: spacingV2.md,
  },
  toggleLabelDisabled: {
    color: colorsV2.textMuted,
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
