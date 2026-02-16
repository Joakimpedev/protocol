import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import V2ScreenWrapper from '../../components/v2/V2ScreenWrapper';
import GradientButton from '../../components/v2/GradientButton';
import RatingCard from '../../components/v2/RatingCard';
import BlurredOverlay from '../../components/v2/BlurredOverlay';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useOnboardingTracking } from '../../hooks/useOnboardingTracking';
import { colorsV2, typographyV2, spacingV2 } from '../../constants/themeV2';

export default function FeaturePreviewScreen({ navigation }: any) {
  useOnboardingTracking('v2_feature_preview');
  const insets = useSafeAreaInsets();
  const anims = useScreenEntrance(5); // headline + 3 cards + blurred + button

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('V2Gender');
  };

  return (
    <V2ScreenWrapper showProgress={true} currentStep={3} totalSteps={12}>
      <View style={styles.content}>
        <Animated.View
          style={{
            opacity: anims[0].opacity,
            transform: anims[0].transform,
          }}
        >
          <Text style={styles.headline}>Your Analysis Preview</Text>
        </Animated.View>

        <View style={styles.cardsContainer}>
          <Animated.View
            style={{
              opacity: anims[1].opacity,
              transform: anims[1].transform,
            }}
          >
            <RatingCard
              category="Skin Quality"
              score={8}
              maxScore={10}
              delay={200}
            />
          </Animated.View>

          <Animated.View
            style={{
              opacity: anims[2].opacity,
              transform: anims[2].transform,
            }}
          >
            <RatingCard
              category="Jawline"
              score={6}
              maxScore={10}
              delay={400}
            />
          </Animated.View>

          <Animated.View
            style={{
              opacity: anims[3].opacity,
              transform: anims[3].transform,
            }}
          >
            <RatingCard
              category="Facial Symmetry"
              score={7}
              maxScore={10}
              delay={600}
            />
          </Animated.View>

          {/* Blurred hint cards */}
          <Animated.View
            style={{
              opacity: anims[4].opacity,
              transform: anims[4].transform,
            }}
          >
            <BlurredOverlay intensity={20}>
              <RatingCard
                category="Hair Quality"
                score={7}
                maxScore={10}
                delay={0}
              />
              <RatingCard
                category="Skin Texture"
                score={5}
                maxScore={10}
                delay={0}
              />
            </BlurredOverlay>
          </Animated.View>
        </View>

        <View style={styles.spacer} />

        <Animated.View
          style={{
            opacity: anims[4].opacity,
            transform: anims[4].transform,
          }}
        >
          <GradientButton
            title="See Your Results"
            onPress={handleContinue}
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
