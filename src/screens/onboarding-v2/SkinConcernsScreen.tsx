import React, { useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colorsV2, typographyV2, spacingV2 } from '../../constants/themeV2';
import GradientButton from '../../components/v2/GradientButton';
import SelectionCard from '../../components/v2/SelectionCard';
import V2ScreenWrapper from '../../components/v2/V2ScreenWrapper';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useOnboardingTracking } from '../../hooks/useOnboardingTracking';

const SKIN_SUB_CONCERNS = [
  { id: 'acne', label: 'Acne / Breakouts' },
  { id: 'oily_skin', label: 'Oily Skin' },
  { id: 'dry_skin', label: 'Dry Skin' },
  { id: 'hyperpigmentation', label: 'Hyperpigmentation' },
  { id: 'dark_circles', label: 'Dark Circles' },
];

/** Maps V2 broad concerns to old problem IDs for downstream personalization */
const CONCERN_TO_PROBLEM_MAP: Record<string, string[]> = {
  'Facial Structure': ['jawline'],
  'Hair & Hairline': ['facial_hair'],
};

export default function SkinConcernsScreen({ navigation }: any) {
  useOnboardingTracking('v2_skin_concerns');
  const { data, updateData } = useOnboarding();
  const [selected, setSelected] = useState<string[]>([]);

  // 1 headline + 5 cards + 1 counter + 1 button = 8
  const anims = useScreenEntrance(SKIN_SUB_CONCERNS.length + 3);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Build selectedProblems from skin sub-concerns + other mapped concerns
    const concerns = data.selectedConcerns ?? [];
    const mappedProblems: string[] = [];

    // Add skin sub-concern IDs directly (they match old problem IDs)
    mappedProblems.push(...selected);

    // Add mapped problems from other protocol-triggering concerns
    for (const concern of concerns) {
      const mapped = CONCERN_TO_PROBLEM_MAP[concern];
      if (mapped) {
        mappedProblems.push(...mapped);
      }
    }

    updateData({
      skinSubConcerns: selected,
      selectedProblems: mappedProblems,
    });

    navigation.navigate('V2SelfRating');
  };

  return (
    <V2ScreenWrapper showProgress currentStep={6} totalSteps={12}>
      <View style={styles.content}>
        <View style={styles.centerSection}>
          {/* Headline */}
          <Animated.View
            style={{
              opacity: anims[0].opacity,
              transform: anims[0].transform,
            }}
          >
            <Text style={styles.headline}>What skin issues bother you most?</Text>
          </Animated.View>

          {/* Selection Cards */}
          <View style={styles.cardsContainer}>
            {SKIN_SUB_CONCERNS.map((concern, index) => (
              <Animated.View
                key={concern.id}
                style={{
                  opacity: anims[index + 1].opacity,
                  transform: anims[index + 1].transform,
                }}
              >
                <SelectionCard
                  label={concern.label}
                  selected={selected.includes(concern.id)}
                  onPress={() => toggle(concern.id)}
                />
              </Animated.View>
            ))}
          </View>

          {/* Counter */}
          <Animated.View
            style={[
              styles.counterContainer,
              {
                opacity: anims[SKIN_SUB_CONCERNS.length + 1].opacity,
                transform: anims[SKIN_SUB_CONCERNS.length + 1].transform,
              },
            ]}
          >
            <Text style={styles.counterText}>
              {selected.length} selected
            </Text>
          </Animated.View>
        </View>

        {/* Continue Button */}
        <Animated.View
          style={{
            opacity: anims[SKIN_SUB_CONCERNS.length + 2].opacity,
            transform: anims[SKIN_SUB_CONCERNS.length + 2].transform,
          }}
        >
          <GradientButton
            title="Continue"
            onPress={handleContinue}
            disabled={selected.length === 0}
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
  counterContainer: {
    alignItems: 'center',
    marginBottom: spacingV2.lg,
  },
  counterText: {
    ...typographyV2.bodySmall,
    color: colorsV2.textSecondary,
  },
});
