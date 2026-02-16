import React, { useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colorsV2, typographyV2, spacingV2 } from '../../constants/themeV2';
import GradientButton from '../../components/v2/GradientButton';
import SelectionCard from '../../components/v2/SelectionCard';
import V2ScreenWrapper from '../../components/v2/V2ScreenWrapper';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useOnboardingTracking } from '../../hooks/useOnboardingTracking';

const GOALS = [
  { label: 'Get more dates', value: 'get_more_dates' },
  { label: 'Land my dream job', value: 'land_dream_job' },
  { label: 'Feel comfortable in photos', value: 'comfortable_in_photos' },
  { label: 'Stop comparing myself to others', value: 'stop_comparing' },
  { label: 'All of the above', value: 'all_of_the_above' },
];

const ALL_GOAL_VALUES = GOALS.filter((g) => g.value !== 'all_of_the_above').map((g) => g.value);

export default function LifeImpactScreen({ navigation }: any) {
  useOnboardingTracking('v2_life_impact');
  const insets = useSafeAreaInsets();
  const { updateData } = useOnboarding();
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  // 1 headline + 5 cards + 1 button = 7
  const anims = useScreenEntrance(GOALS.length + 2);

  const toggleGoal = (value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setSelectedGoals((prev) => {
      if (value === 'all_of_the_above') {
        // If "All of the above" is currently selected, deselect everything
        if (prev.includes('all_of_the_above')) {
          return [];
        }
        // Otherwise select all
        return [...ALL_GOAL_VALUES, 'all_of_the_above'];
      }

      // Toggling an individual goal
      let next: string[];
      if (prev.includes(value)) {
        next = prev.filter((v) => v !== value && v !== 'all_of_the_above');
      } else {
        next = [...prev.filter((v) => v !== 'all_of_the_above'), value];
      }

      // If all individual goals are now selected, add "all_of_the_above"
      if (ALL_GOAL_VALUES.every((g) => next.includes(g))) {
        next = [...next, 'all_of_the_above'];
      }

      return next;
    });
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const filtered = selectedGoals.filter((g) => g !== 'all_of_the_above');
    updateData({ goalSetting: filtered.join(','), impacts: filtered });
    navigation.navigate('V2BeforeAfter');
  };

  return (
    <V2ScreenWrapper showProgress currentStep={9} totalSteps={12}>
      <View style={styles.content}>
        <View style={styles.centerSection}>
          {/* Headline */}
          <Animated.View
            style={{
              opacity: anims[0].opacity,
              transform: anims[0].transform,
            }}
          >
            <Text style={styles.headline}>How will this change your life?</Text>
          </Animated.View>

          {/* Selection Cards */}
          <View style={styles.cardsContainer}>
            {GOALS.map((goal, index) => (
              <Animated.View
                key={goal.value}
                style={{
                  opacity: anims[index + 1].opacity,
                  transform: anims[index + 1].transform,
                }}
              >
                <SelectionCard
                  label={goal.label}
                  selected={selectedGoals.includes(goal.value)}
                  onPress={() => toggleGoal(goal.value)}
                />
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Continue Button */}
        <Animated.View
          style={{
            opacity: anims[GOALS.length + 1].opacity,
            transform: anims[GOALS.length + 1].transform,
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
  centerSection: {
    flex: 1,
    justifyContent: 'center',
  },
  headline: {
    ...typographyV2.hero,
    textAlign: 'center',
    marginBottom: spacingV2.lg,
  },
  cardsContainer: {
    marginBottom: spacingV2.md,
  },
});
