/**
 * V2VillageIntroScreen
 * Onboarding screen showing the village concept.
 * Displays level 1 village, user taps "Build my base" →
 * level 1 shrinks then level 2 image scales in.
 */

import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import GradientButton from '../../components/v2/GradientButton';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useOnboardingTracking } from '../../hooks/useOnboardingTracking';
import {
  colorsV2,
  typographyV2,
  spacingV2,
} from '../../constants/themeV2';
import { getVillageImageForLevel } from '../../services/villageService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_SIZE = Math.min(SCREEN_WIDTH - 48, SCREEN_HEIGHT * 0.4);

const level1Image = getVillageImageForLevel(1, []);
// Level 2, image variant 2 (power choice = 1)
const level2Image = getVillageImageForLevel(2, [1]);

export default function V2VillageIntroScreen({ navigation }: any) {
  useOnboardingTracking('v2_village_intro');
  const insets = useSafeAreaInsets();
  const anims = useScreenEntrance(3);
  const [transitioned, setTransitioned] = useState(false);

  // Level 1 image animations
  const img1Scale = useRef(new Animated.Value(1)).current;
  const img1Opacity = useRef(new Animated.Value(1)).current;

  // Level 2 image animations
  const img2Scale = useRef(new Animated.Value(0.3)).current;
  const img2Opacity = useRef(new Animated.Value(0)).current;

  // White flash for transition
  const flashOpacity = useRef(new Animated.Value(0)).current;

  // Button for after transition
  const nextBtnOpacity = useRef(new Animated.Value(0)).current;
  const nextBtnSlide = useRef(new Animated.Value(20)).current;

  const handleBuild = useCallback(() => {
    if (transitioned) {
      navigation.navigate('V2VillageChoice');
      return;
    }
    setTransitioned(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});

    Animated.sequence([
      // Bounce up
      Animated.timing(img1Scale, {
        toValue: 1.08,
        duration: 120,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      // Shrink down + fade out + white flash
      Animated.parallel([
        Animated.timing(img1Scale, {
          toValue: 0.4,
          duration: 250,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(img1Opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(150),
          Animated.timing(flashOpacity, {
            toValue: 0.6,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
      ]),
      // Fade flash, bring in level 2 image
      Animated.parallel([
        Animated.timing(flashOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(img2Opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(img2Scale, {
          toValue: 1.06,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // Settle to normal scale
      Animated.spring(img2Scale, {
        toValue: 1,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Animated.parallel([
        Animated.timing(nextBtnOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(nextBtnSlide, {
          toValue: 0,
          tension: 60,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [transitioned, navigation]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + spacingV2.md }]}>
      {/* Everything centered vertically */}
      <View style={styles.centerSection}>
        {/* Image */}
        <Animated.View style={[styles.imageWrap, { opacity: anims[0].opacity, transform: anims[0].transform }]}>
          <View style={styles.imageContainer}>
            <Animated.View style={[styles.imageLayer, { opacity: img1Opacity, transform: [{ scale: img1Scale }] }]}>
              <Image source={level1Image} style={styles.villageImage} resizeMode="contain" />
            </Animated.View>

            <Animated.View style={[styles.flashCircle, { opacity: flashOpacity }]} />

            <Animated.View style={[styles.imageLayer, { opacity: img2Opacity, transform: [{ scale: img2Scale }] }]}>
              <Image source={level2Image} style={styles.villageImage} resizeMode="contain" />
            </Animated.View>
          </View>
        </Animated.View>

        {/* Text below image */}
        <Animated.View style={[styles.textSection, { opacity: anims[1].opacity, transform: anims[1].transform }]}>
          <Text style={styles.title}>Build With Habits</Text>
          <Text style={styles.subtitle}>
            Complete daily tasks to level up.{'\n'}Watch your foundation grow stronger.
          </Text>
        </Animated.View>

        {/* Button directly below text */}
        <Animated.View style={[styles.buttonSection, { opacity: anims[2].opacity, transform: anims[2].transform }]}>
          {!transitioned ? (
            <GradientButton title="Build my base" onPress={handleBuild} />
          ) : (
            <Animated.View style={{ opacity: nextBtnOpacity, transform: [{ translateY: nextBtnSlide }] }}>
              <GradientButton title="Continue" onPress={() => navigation.navigate('V2VillageChoice')} />
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorsV2.background,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacingV2.lg,
  },
  imageWrap: {
    alignItems: 'center',
  },
  imageContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageLayer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  villageImage: {
    width: '100%',
    height: '100%',
  },
  flashCircle: {
    position: 'absolute',
    width: IMAGE_SIZE * 0.6,
    height: IMAGE_SIZE * 0.6,
    borderRadius: IMAGE_SIZE * 0.3,
    backgroundColor: '#FFFFFF',
  },
  textSection: {
    alignItems: 'center',
    marginTop: spacingV2.lg,
    marginBottom: spacingV2.lg,
  },
  title: {
    ...typographyV2.hero,
    textAlign: 'center',
    marginBottom: spacingV2.sm,
  },
  subtitle: {
    ...typographyV2.body,
    color: colorsV2.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonSection: {
    width: '100%',
  },
});
