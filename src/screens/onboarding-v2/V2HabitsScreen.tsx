import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaskedView from '@react-native-masked-view/masked-view';
import * as Haptics from 'expo-haptics';
import { colorsV2, typographyV2, spacingV2, borderRadiusV2, gradients } from '../../constants/themeV2';
import GradientButton from '../../components/v2/GradientButton';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useOnboardingTracking } from '../../hooks/useOnboardingTracking';
import { MORNING_HABITS, ANYTIME_HABITS, EVENING_HABITS, DailyHabit } from '../../data/daily_habits';

interface StepConfig {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  subtitleGradient: [string, string];
  pickRange: string;
  minPicks: number;
  maxPicks: number;
  habits: DailyHabit[];
}

const STEPS: StepConfig[] = [
  {
    key: 'morning',
    title: 'Morning',
    subtitle: 'Start your day strong.\nBuild momentum early.',
    icon: 'weather-sunset-up',
    iconColor: '#FBBF24',
    subtitleGradient: ['#FBBF24', '#F59E0B'],
    pickRange: 'Pick 1-3',
    minPicks: 1,
    maxPicks: 99,
    habits: MORNING_HABITS,
  },
  {
    key: 'evening',
    title: 'Evening',
    subtitle: 'Wind down right.\nRecover and prepare.',
    icon: 'moon-waning-crescent',
    iconColor: '#C084FC',
    subtitleGradient: ['#C084FC', '#A78BFA'],
    pickRange: 'Pick 1-3',
    minPicks: 1,
    maxPicks: 99,
    habits: EVENING_HABITS,
  },
  {
    key: 'anytime',
    title: 'Anytime',
    subtitle: 'Fill your day with real wins.\nStay sharp, stay moving.',
    icon: 'lightning-bolt',
    iconColor: '#FBBF24',
    subtitleGradient: ['#FBBF24', '#F59E0B'],
    pickRange: 'Pick 2-4',
    minPicks: 2,
    maxPicks: 99,
    habits: ANYTIME_HABITS,
  },
];

export default function V2HabitsScreen({ navigation }: any) {
  useOnboardingTracking('v2_habits');
  const { data, updateData } = useOnboarding();
  const insets = useSafeAreaInsets();
  const anims = useScreenEntrance(3);

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedHabitIds, setSelectedHabitIds] = useState<Set<string>>(
    new Set(data.selectedHabits || [])
  );

  const step = STEPS[currentStep];
  const stepSelectedCount = step.habits.filter(h => selectedHabitIds.has(h.id)).length;
  const totalSelected = selectedHabitIds.size;
  const canProceed = stepSelectedCount >= step.minPicks;
  const atMax = stepSelectedCount >= step.maxPicks;

  const toggleHabit = (habitId: string) => {
    const isSelected = selectedHabitIds.has(habitId);

    // Don't allow selecting more than max
    if (!isSelected && atMax) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedHabitIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(habitId)) {
        newSet.delete(habitId);
      } else {
        newSet.add(habitId);
      }
      return newSet;
    });
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Final step — save and navigate
      updateData({ selectedHabits: Array.from(selectedHabitIds) });
      setTimeout(() => {
        navigation.navigate('V2Shopping');
      }, 0);
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      updateData({ selectedHabits: Array.from(selectedHabitIds) });
      setTimeout(() => {
        navigation.navigate('V2Shopping');
      }, 0);
    }
  };

  // Progress bar
  const progressWidth = `${((currentStep + 1) / STEPS.length) * 100}%`;

  const isLastStep = currentStep === STEPS.length - 1;
  const buttonTitle = isLastStep ? 'Lock in my tasks' : 'Next';

  const content = (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={[styles.progressContainer, { paddingTop: insets.top + spacingV2.sm }]}>
        <View style={styles.progressBar}>
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: progressWidth as any }]}
          />
        </View>
      </View>

      {/* Main content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Category header */}
        <Animated.View style={[styles.headerContainer, { opacity: anims[0].opacity, transform: anims[0].transform }]}>
          <View style={[styles.categoryIcon, { backgroundColor: step.iconColor + '20' }]}>
            <MaterialCommunityIcons name={step.icon as any} size={30} color={step.iconColor} />
          </View>
          <Text style={styles.categoryTitle}>{step.title}</Text>
          <View style={[styles.subtitleGlow, { shadowColor: step.iconColor }]}>
            <MaskedView
              maskElement={
                <Text style={[styles.categorySubtitle, { opacity: 1 }]}>{step.subtitle}</Text>
              }
            >
              <LinearGradient
                colors={step.subtitleGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={[styles.categorySubtitle, { opacity: 0 }]}>{step.subtitle}</Text>
              </LinearGradient>
            </MaskedView>
          </View>
          <View style={[styles.pickBadge, stepSelectedCount > 0 && styles.pickBadgeActive]}>
            <Text style={[styles.pickBadgeText, stepSelectedCount > 0 && styles.pickBadgeTextActive]}>{step.pickRange}</Text>
          </View>
        </Animated.View>

        {/* Habit cards */}
        <Animated.View style={[styles.habitsContainer, { opacity: anims[1].opacity, transform: anims[1].transform }]}>
          {step.habits.map((habit) => {
            const isSelected = selectedHabitIds.has(habit.id);
            const isDisabled = !isSelected && atMax;

            return (
              <TouchableOpacity
                key={habit.id}
                style={[
                  styles.habitCard,
                  isSelected && styles.habitCardSelected,
                  isDisabled && styles.habitCardDisabled,
                ]}
                onPress={() => toggleHabit(habit.id)}
                activeOpacity={0.8}
              >
                {/* Icon with theme color glow */}
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons name={habit.icon as any} size={24} color={colorsV2.accentPurple} />
                </View>

                {/* Label */}
                <Text style={[styles.habitName, isDisabled && styles.habitNameDisabled]}>
                  {habit.name}
                </Text>

                {/* Radio circle */}
                <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </ScrollView>

      {/* Bottom buttons */}
      <Animated.View style={[styles.bottomContainer, { paddingBottom: insets.bottom + spacingV2.md, opacity: anims[2].opacity, transform: anims[2].transform }]}>
        {canProceed ? (
          <GradientButton title={buttonTitle} onPress={handleNext} />
        ) : (
          <>
            <TouchableOpacity style={styles.disabledButton} disabled>
              <Text style={styles.disabledButtonText}>{buttonTitle}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>
    </View>
  );

  if (Platform.OS === 'ios') {
    return (
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        {content}
      </KeyboardAvoidingView>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colorsV2.background,
  },

  // Progress
  progressContainer: {
    paddingHorizontal: spacingV2.lg,
    paddingBottom: spacingV2.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: colorsV2.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacingV2.lg,
    paddingBottom: spacingV2.lg,
  },

  // Header
  headerContainer: {
    alignItems: 'center',
    marginTop: spacingV2.xl,
    marginBottom: spacingV2.lg,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacingV2.md,
  },
  categoryTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colorsV2.textPrimary,
    textAlign: 'center',
    marginBottom: spacingV2.sm,
  },
  subtitleGlow: {
    marginBottom: spacingV2.md,
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  categorySubtitle: {
    ...typographyV2.body,
    color: colorsV2.textPrimary,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '600',
  },
  pickBadge: {
    backgroundColor: colorsV2.surfaceLight,
    borderRadius: borderRadiusV2.pill,
    paddingHorizontal: spacingV2.md,
    paddingVertical: spacingV2.xs + 2,
  },
  pickBadgeText: {
    ...typographyV2.bodySmall,
    color: colorsV2.textMuted,
    fontWeight: '600',
  },
  pickBadgeActive: {
    backgroundColor: colorsV2.accentPurple + '18',
    borderWidth: 1,
    borderColor: colorsV2.accentPurple + '30',
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  pickBadgeTextActive: {
    color: colorsV2.accentPurple,
  },

  // Habits
  habitsContainer: {
    gap: spacingV2.sm,
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorsV2.surfaceLight + '80',
    borderWidth: 1,
    borderColor: colorsV2.border,
    borderRadius: borderRadiusV2.lg,
    paddingVertical: spacingV2.md,
    paddingHorizontal: spacingV2.md,
  },
  habitCardSelected: {
    backgroundColor: colorsV2.surfaceLight,
    borderColor: colorsV2.accentOrange + '40',
  },
  habitCardDisabled: {
    opacity: 0.4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacingV2.md,
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  habitName: {
    ...typographyV2.body,
    color: colorsV2.textSecondary,
    flex: 1,
  },
  habitNameDisabled: {
    color: colorsV2.textMuted,
  },

  // Radio button (circle, not checkbox)
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colorsV2.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: colorsV2.accentOrange,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colorsV2.accentOrange,
  },

  // Bottom
  bottomContainer: {
    paddingHorizontal: spacingV2.lg,
    paddingTop: spacingV2.md,
    gap: spacingV2.sm,
  },
  disabledButton: {
    backgroundColor: colorsV2.surfaceLight,
    borderRadius: borderRadiusV2.pill,
    paddingVertical: 18,
    alignItems: 'center',
    opacity: 0.5,
  },
  disabledButtonText: {
    ...typographyV2.body,
    fontWeight: '700',
    color: colorsV2.textMuted,
    fontSize: 18,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacingV2.sm,
  },
  skipButtonText: {
    ...typographyV2.body,
    color: colorsV2.textMuted,
    fontWeight: '600',
  },
});
