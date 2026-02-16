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

const CONCERNS = [
  { label: 'Skin Quality' },
  { label: 'Facial Structure' },
  { label: 'Hair & Hairline' },
  { label: 'Body Composition' },
  { label: 'Style & Grooming' },
  { label: 'Confidence' },
];

export default function ConcernsScreen({ navigation }: any) {
  useOnboardingTracking('v2_concerns');
  const insets = useSafeAreaInsets();
  const { updateData } = useOnboarding();
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);

  // 1 for headline + 6 for cards + 1 for counter + 1 for button = 9
  const anims = useScreenEntrance(CONCERNS.length + 3);

  const toggleConcern = (label: string) => {
    setSelectedConcerns((prev) => {
      if (prev.includes(label)) {
        return prev.filter((c) => c !== label);
      }
      return [...prev, label];
    });
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Store broad V2 concerns
    updateData({ selectedConcerns: selectedConcerns });

    // If Skin Quality is selected, show follow-up for specific skin issues
    if (selectedConcerns.includes('Skin Quality')) {
      navigation.navigate('V2SkinConcerns');
      return;
    }

    // No skin follow-up needed — map non-skin protocol concerns directly to selectedProblems
    const mappedProblems: string[] = [];
    if (selectedConcerns.includes('Facial Structure')) mappedProblems.push('jawline');
    if (selectedConcerns.includes('Hair & Hairline')) mappedProblems.push('facial_hair');

    updateData({
      selectedProblems: mappedProblems,
      skinSubConcerns: [],
    });

    navigation.navigate('V2SelfRating');
  };

  return (
    <V2ScreenWrapper showProgress currentStep={5} totalSteps={12}>
      <View style={styles.content}>
        <View style={styles.centerSection}>
          {/* Headline */}
          <Animated.View
            style={{
              opacity: anims[0].opacity,
              transform: anims[0].transform,
            }}
          >
            <Text style={styles.headline}>What would you like to improve?</Text>
          </Animated.View>

          {/* Selection Cards */}
          <View style={styles.cardsContainer}>
            {CONCERNS.map((concern, index) => (
              <Animated.View
                key={concern.label}
                style={{
                  opacity: anims[index + 1].opacity,
                  transform: anims[index + 1].transform,
                }}
              >
                <SelectionCard
                  label={concern.label}
                  selected={selectedConcerns.includes(concern.label)}
                  onPress={() => toggleConcern(concern.label)}
                />
              </Animated.View>
            ))}
          </View>

          {/* Counter */}
          <Animated.View
            style={[
              styles.counterContainer,
              {
                opacity: anims[CONCERNS.length + 1].opacity,
                transform: anims[CONCERNS.length + 1].transform,
              },
            ]}
          >
            <Text style={styles.counterText}>
              {selectedConcerns.length} selected
            </Text>
          </Animated.View>
        </View>

        {/* Continue Button */}
        <Animated.View
          style={{
            opacity: anims[CONCERNS.length + 2].opacity,
            transform: anims[CONCERNS.length + 2].transform,
          }}
        >
          <GradientButton
            title="Continue"
            onPress={handleContinue}
            disabled={selectedConcerns.length === 0}
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
