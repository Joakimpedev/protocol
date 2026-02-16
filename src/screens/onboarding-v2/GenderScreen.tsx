import React, { useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import V2ScreenWrapper from '../../components/v2/V2ScreenWrapper';
import GradientButton from '../../components/v2/GradientButton';
import SelectionCard from '../../components/v2/SelectionCard';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useOnboardingTracking } from '../../hooks/useOnboardingTracking';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { colorsV2, typographyV2, spacingV2 } from '../../constants/themeV2';

const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Non-Binary', value: 'non-binary' },
];

export default function GenderScreen({ navigation }: any) {
  useOnboardingTracking('v2_gender');
  const { updateData } = useOnboarding();
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const anims = useScreenEntrance(5); // headline + 3 cards + button

  const handleSelect = (value: string) => {
    setSelectedGender(value);
  };

  const handleContinue = () => {
    if (!selectedGender) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateData({ gender: selectedGender } as any);
    navigation.navigate('V2Concerns');
  };

  return (
    <V2ScreenWrapper showProgress={true} currentStep={1} totalSteps={12}>
      <View style={styles.content}>
        <View style={styles.centerSection}>
          <Animated.View
            style={{
              opacity: anims[0].opacity,
              transform: anims[0].transform,
            }}
          >
            <Text style={styles.headline}>Select your gender</Text>
          </Animated.View>

          <View style={styles.cardsContainer}>
            {GENDER_OPTIONS.map((option, index) => (
              <Animated.View
                key={option.value}
                style={{
                  opacity: anims[index + 1].opacity,
                  transform: anims[index + 1].transform,
                }}
              >
                <SelectionCard
                  label={option.label}
                  selected={selectedGender === option.value}
                  onPress={() => handleSelect(option.value)}
                />
              </Animated.View>
            ))}
          </View>
        </View>

        <Animated.View
          style={{
            opacity: anims[4].opacity,
            transform: anims[4].transform,
          }}
        >
          <GradientButton
            title="Continue"
            onPress={handleContinue}
            disabled={!selectedGender}
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
    ...typographyV2.heading,
    textAlign: 'center',
    marginBottom: spacingV2.xl,
  },
  cardsContainer: {
    marginTop: spacingV2.md,
  },
});
