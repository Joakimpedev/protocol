import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import V2ScreenWrapper from '../../components/v2/V2ScreenWrapper';
import GradientButton from '../../components/v2/GradientButton';
import FaceScanOverlay from '../../components/v2/FaceScanOverlay';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useOnboardingTracking } from '../../hooks/useOnboardingTracking';
import {
  colorsV2,
  typographyV2,
  spacingV2,
  borderRadiusV2,
} from '../../constants/themeV2';

export default function AnalyzeFaceScreen({ navigation }: any) {
  useOnboardingTracking('v2_analyze_face');
  const anims = useScreenEntrance(4); // title + body + image + button

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('V2GetRating');
  };

  return (
    <V2ScreenWrapper showProgress={true} currentStep={2} totalSteps={14}>
      <View style={styles.content}>
        <Animated.View
          style={{
            opacity: anims[0].opacity,
            transform: anims[0].transform,
          }}
        >
          <Text style={styles.title}>Analyze Your Face</Text>
        </Animated.View>

        <Animated.View
          style={{
            opacity: anims[1].opacity,
            transform: anims[1].transform,
          }}
        >
          <Text style={styles.body}>
            Our AI scans and evaluates your face across multiple categories
            for a comprehensive analysis.
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.imageSection,
            {
              opacity: anims[2].opacity,
              transform: anims[2].transform,
            },
          ]}
        >
          <View style={styles.scanImageContainer}>
            <Image
              source={require('../../../assets/images/side.png')}
              style={styles.scanImage}
              resizeMode="cover"
            />
            <FaceScanOverlay animated />
          </View>
        </Animated.View>

        <View style={styles.spacer} />

        <Animated.View
          style={{
            opacity: anims[3].opacity,
            transform: anims[3].transform,
          }}
        >
          <GradientButton title="Continue" onPress={handleContinue} />
        </Animated.View>
      </View>
    </V2ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  title: {
    ...typographyV2.heading,
    textAlign: 'center',
    marginBottom: spacingV2.sm,
  },
  body: {
    ...typographyV2.body,
    color: colorsV2.textSecondary,
    textAlign: 'center',
    marginBottom: spacingV2.xl,
    paddingHorizontal: spacingV2.sm,
  },
  imageSection: {
    alignItems: 'center',
  },
  scanImageContainer: {
    width: 200,
    height: 240,
    borderRadius: borderRadiusV2.lg,
    overflow: 'hidden',
  },
  scanImage: {
    width: '100%',
    height: '100%',
  },
  spacer: {
    flex: 1,
  },
});
