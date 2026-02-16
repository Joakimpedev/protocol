import React, { useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colorsV2, typographyV2, spacingV2 } from '../../constants/themeV2';
import GradientButton from '../../components/v2/GradientButton';
import SliderInput from '../../components/v2/SliderInput';
import V2ScreenWrapper from '../../components/v2/V2ScreenWrapper';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useOnboardingTracking } from '../../hooks/useOnboardingTracking';

export default function SelfRatingScreen({ navigation }: any) {
  useOnboardingTracking('v2_self_rating');
  const insets = useSafeAreaInsets();
  const { updateData } = useOnboarding();
  const [rating, setRating] = useState(5);
  const anims = useScreenEntrance(3);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateData({ selfRating: rating } as any);
    navigation.navigate('V2SocialProof');
  };

  return (
    <V2ScreenWrapper showProgress currentStep={6} totalSteps={12}>
      {/* Headline */}
      <Animated.View
        style={{
          opacity: anims[0].opacity,
          transform: anims[0].transform,
        }}
      >
        <Text style={styles.headline}>Rate yourself honestly.</Text>
      </Animated.View>

      {/* Large number display */}
      <View style={styles.numberContainer}>
        <Text style={styles.ratingNumber}>{rating}</Text>
        <Text style={styles.ratingMax}>/ 10</Text>
      </View>

      {/* Slider */}
      <Animated.View
        style={[
          styles.sliderContainer,
          {
            opacity: anims[1].opacity,
            transform: anims[1].transform,
          },
        ]}
      >
        <SliderInput
          min={1}
          max={10}
          step={1}
          value={rating}
          onValueChange={setRating}
          leftLabel="1"
          rightLabel="10"
        />
      </Animated.View>

      {/* Continue Button */}
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            opacity: anims[2].opacity,
            transform: anims[2].transform,
          },
        ]}
      >
        <GradientButton title="Continue" onPress={handleContinue} />
      </Animated.View>
    </V2ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headline: {
    ...typographyV2.hero,
    textAlign: 'center',
    marginBottom: spacingV2.xl,
  },
  numberContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: spacingV2.xl,
  },
  ratingNumber: {
    fontSize: 72,
    fontWeight: '800',
    color: colorsV2.accentOrange,
    fontVariant: ['tabular-nums'],
  },
  ratingMax: {
    ...typographyV2.heading,
    color: colorsV2.textMuted,
    marginLeft: spacingV2.sm,
  },
  sliderContainer: {
    marginBottom: spacingV2.xl,
  },
  buttonContainer: {
    marginTop: spacingV2.md,
  },
});
