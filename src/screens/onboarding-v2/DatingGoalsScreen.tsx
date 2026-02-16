import React, { useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import V2ScreenWrapper from '../../components/v2/V2ScreenWrapper';
import GradientButton from '../../components/v2/GradientButton';
import SelectionCard from '../../components/v2/SelectionCard';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { colorsV2, typographyV2, spacingV2 } from '../../constants/themeV2';

const GOAL_OPTIONS = [
  { label: 'Build real confidence', value: 'more_confidence' },
  { label: 'Improve dating life', value: 'better_dating_life' },
  { label: 'Level up career', value: 'career_success' },
  { label: 'Reduce social anxiety', value: 'less_anxiety' },
  { label: 'Maximize my potential', value: 'feel_better' },
  { label: 'All of the above', value: 'all_of_the_above' },
];

const ALL_INDIVIDUAL_VALUES = GOAL_OPTIONS
  .filter((o) => o.value !== 'all_of_the_above')
  .map((o) => o.value);

export default function DatingGoalsScreen({ navigation }: any) {
  const { updateData } = useOnboarding();
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const anims = useScreenEntrance(GOAL_OPTIONS.length + 2); // headline + cards + button

  const handleSelect = (value: string) => {
    setSelectedGoals((prev) => {
      if (value === 'all_of_the_above') {
        // If "All" is currently selected, deselect everything
        if (prev.includes('all_of_the_above')) {
          return [];
        }
        // Otherwise select all
        return [...ALL_INDIVIDUAL_VALUES, 'all_of_the_above'];
      }

      let next: string[];
      if (prev.includes(value)) {
        // Deselecting an individual item also deselects "All"
        next = prev.filter((v) => v !== value && v !== 'all_of_the_above');
      } else {
        next = [...prev, value];
      }

      // If all individual items are now selected, also select "All"
      const allIndividualSelected = ALL_INDIVIDUAL_VALUES.every((v) =>
        next.includes(v)
      );
      if (allIndividualSelected && !next.includes('all_of_the_above')) {
        next.push('all_of_the_above');
      }

      return next;
    });
  };

  const handleContinue = () => {
    if (selectedGoals.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const impacts = selectedGoals.filter((g) => g !== 'all_of_the_above');
    updateData({ impacts });
    navigation.navigate('V2LifeImpact');
  };

  return (
    <V2ScreenWrapper showProgress={true} currentStep={8} totalSteps={12}>
      <View style={styles.content}>
        <Animated.View
          style={{
            opacity: anims[0].opacity,
            transform: anims[0].transform,
          }}
        >
          <Text style={styles.headline}>What are your goals?</Text>
        </Animated.View>

        <View style={styles.cardsContainer}>
          {GOAL_OPTIONS.map((option, index) => (
            <Animated.View
              key={option.value}
              style={{
                opacity: anims[index + 1].opacity,
                transform: anims[index + 1].transform,
              }}
            >
              <SelectionCard
                label={option.label}
                selected={selectedGoals.includes(option.value)}
                onPress={() => handleSelect(option.value)}
              />
            </Animated.View>
          ))}
        </View>

        <View style={styles.spacer} />

        <Animated.View
          style={{
            opacity: anims[GOAL_OPTIONS.length + 1].opacity,
            transform: anims[GOAL_OPTIONS.length + 1].transform,
          }}
        >
          <GradientButton
            title="Continue"
            onPress={handleContinue}
            disabled={selectedGoals.length === 0}
          />
        </Animated.View>
      </View>
    </V2ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  headline: {
    ...typographyV2.heading,
    textAlign: 'center',
    marginBottom: spacingV2.xl,
  },
  cardsContainer: {
    marginTop: spacingV2.md,
  },
  spacer: {
    flex: 1,
  },
});
