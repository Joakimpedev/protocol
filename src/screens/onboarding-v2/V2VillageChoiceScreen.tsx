/**
 * V2VillageChoiceScreen
 * Onboarding screen showing the "Choose your path" concept.
 * Displays level 3 balanced village image with power/wisdom choice cards.
 * On choice → flash + reveal chosen level 3 variant.
 */

import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import GradientButton from '../../components/v2/GradientButton';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useOnboardingTracking } from '../../hooks/useOnboardingTracking';
import {
  colorsV2,
  typographyV2,
  spacingV2,
  borderRadiusV2,
} from '../../constants/themeV2';
import { getVillageImageForLevel } from '../../services/villageService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_SIZE = Math.min(SCREEN_WIDTH - 48, SCREEN_HEIGHT * 0.35);

// Level 3 images: power = [1,1] choices, wisdom = [0,0] choices
const baseImage = getVillageImageForLevel(3, [1]); // balanced-ish
const powerImage = getVillageImageForLevel(3, [1, 1]); // position 3
const wisdomImage = getVillageImageForLevel(3, [0, 0]); // position 1

export default function V2VillageChoiceScreen({ navigation }: any) {
  useOnboardingTracking('v2_village_choice');
  const insets = useSafeAreaInsets();
  const anims = useScreenEntrance(4);
  const [chosen, setChosen] = useState(false);

  // Image animations
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const punchScale = useRef(new Animated.Value(1)).current;
  const chosenFade = useRef(new Animated.Value(0)).current;
  const [chosenPath, setChosenPath] = useState<'power' | 'wisdom' | null>(null);

  // Cards fade out
  const cardsFade = useRef(new Animated.Value(1)).current;

  // Continue button
  const nextBtnOpacity = useRef(new Animated.Value(0)).current;
  const nextBtnSlide = useRef(new Animated.Value(20)).current;

  const handleChoice = useCallback((path: 'power' | 'wisdom') => {
    if (chosen) return;
    setChosen(true);
    setChosenPath(path);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});

    // Punch down → flash → swap → reveal
    Animated.sequence([
      Animated.timing(punchScale, {
        toValue: 0.92,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(flashOpacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      chosenFade.setValue(1);

      Animated.parallel([
        Animated.timing(flashOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(punchScale, {
          toValue: 1,
          tension: 80,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(cardsFade, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        // Show continue button
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
    });
  }, [chosen]);

  const powerColor = '#EF4444';
  const wisdomColor = '#6366F1';

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + spacingV2.md }]}>
      {/* Everything centered vertically */}
      <View style={styles.centerSection}>
        {/* Text */}
        <Animated.View style={[styles.textSection, { opacity: anims[0].opacity, transform: anims[0].transform }]}>
          <Text style={styles.title}>Choose Your Path</Text>
          <Text style={styles.subtitle}>
            Every level-up, shape your village.{'\n'}Your choices define your world.
          </Text>
        </Animated.View>

        {/* Image */}
        <Animated.View style={[styles.imageWrap, { opacity: anims[1].opacity, transform: anims[1].transform }]}>
          <Animated.View style={[styles.imageContainer, { transform: [{ scale: punchScale }] }]}>
            <Image source={baseImage} style={styles.villageImage} resizeMode="contain" />

            <Animated.View style={[StyleSheet.absoluteFill, { opacity: chosenPath === 'power' ? chosenFade : 0 }]}>
              <Image source={powerImage} style={styles.villageImage} resizeMode="contain" />
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: chosenPath === 'wisdom' ? chosenFade : 0 }]}>
              <Image source={wisdomImage} style={styles.villageImage} resizeMode="contain" />
            </Animated.View>

            <Animated.View style={[styles.flashOverlay, { opacity: flashOpacity }]} />
          </Animated.View>
        </Animated.View>

        {/* Choice cards right below text */}
        <Animated.View style={[styles.cardsArea, { opacity: Animated.multiply(anims[2].opacity, cardsFade), transform: anims[2].transform }]}>
          <View style={styles.cardsRow}>
            {/* Power */}
            <TouchableOpacity
              style={[styles.choiceCard, { borderColor: 'rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.06)' }]}
              onPress={() => handleChoice('power')}
              activeOpacity={0.7}
              disabled={chosen}
            >
              <View style={[styles.choiceIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                <MaterialCommunityIcons name="sword-cross" size={24} color={powerColor} />
              </View>
              <Text style={styles.choiceTitle}>POWER</Text>
              <Text style={styles.choiceQuote}>"Strength earns respect."</Text>
            </TouchableOpacity>

            {/* Wisdom */}
            <TouchableOpacity
              style={[styles.choiceCard, { borderColor: 'rgba(99, 102, 241, 0.2)', backgroundColor: 'rgba(99, 102, 241, 0.06)' }]}
              onPress={() => handleChoice('wisdom')}
              activeOpacity={0.7}
              disabled={chosen}
            >
              <View style={[styles.choiceIconCircle, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
                <MaterialCommunityIcons name="book-open-variant" size={24} color={wisdomColor} />
              </View>
              <Text style={styles.choiceTitle}>WISDOM</Text>
              <Text style={styles.choiceQuote}>"Knowledge earns loyalty."</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Continue button (replaces cards after choice) */}
        <Animated.View style={[styles.continueArea, { opacity: nextBtnOpacity, transform: [{ translateY: nextBtnSlide }] }]}>
          <GradientButton title="Continue" onPress={() => navigation.navigate('V2NotificationsAsk')} />
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
    borderRadius: 20,
    overflow: 'hidden',
  },
  villageImage: {
    width: '100%',
    height: '100%',
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
  textSection: {
    alignItems: 'center',
    marginBottom: spacingV2.sm,
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
  cardsArea: {
    width: '100%',
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  choiceCard: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: borderRadiusV2.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  choiceIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  choiceTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 3,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  choiceQuote: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.45)',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 17,
  },
  continueArea: {
    width: '100%',
    marginTop: spacingV2.lg,
  },
});
