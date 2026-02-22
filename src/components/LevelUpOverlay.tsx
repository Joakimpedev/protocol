/**
 * LevelUpOverlay
 * In-place level-up celebration rendered as an absolute overlay on TodayScreen.
 *
 * Simple approach: blur + centered image fade/scale in on top of everything.
 * VillageDisplay stays visible underneath (not hidden). At choice time, the parent
 * updates VillageDisplay to the new level behind the blur. On dismiss, the overlay
 * fades out to reveal the already-correct VillageDisplay.
 *
 * All animations use useNativeDriver: true.
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import { getLevelDefinition } from '../services/xpService';
import {
  getVillageImageForLevel,
  getChoiceImages,
  saveVillageChoice,
} from '../services/villageService';
import { VILLAGE_CHOICE_COPY } from '../data/villageChoices';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_SIZE = Math.min(SCREEN_WIDTH - 64, SCREEN_HEIGHT * 0.3);

// Village stage names for level info display
const VILLAGE_STAGE_NAMES: Record<number, string> = {
  1: 'Campfire',
  2: 'Clearing',
  3: 'Homestead',
  4: 'Settlement',
  5: 'Village',
};

interface LevelUpOverlayProps {
  newLevel: number;
  currentChoices: number[];
  onChoiceMade: (choice: 0 | 1) => void;
  onDismiss: () => void;
}

export default function LevelUpOverlay({
  newLevel,
  currentChoices,
  onChoiceMade,
  onDismiss,
}: LevelUpOverlayProps) {
  const { user } = useAuth();
  const levelDef = getLevelDefinition(newLevel);
  const hasChoice = newLevel >= 2 && newLevel <= 5;
  const choiceCopy = VILLAGE_CHOICE_COPY[newLevel];

  const [choosing, setChoosing] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [chosenPath, setChosenPath] = useState<0 | 1 | null>(null);

  // Images
  const currentVillageImage = useMemo(
    () => getVillageImageForLevel(Math.max(newLevel - 1, 1), currentChoices),
    [newLevel, currentChoices]
  );
  const choiceImages = useMemo(
    () => hasChoice ? getChoiceImages(newLevel, currentChoices) : null,
    [newLevel, currentChoices, hasChoice]
  );

  // Animation values — all native driver
  const blurOpacity = useRef(new Animated.Value(0)).current;
  const imageFade = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(0.85)).current;
  const labelFade = useRef(new Animated.Value(0)).current;
  const labelSlide = useRef(new Animated.Value(-15)).current;
  const cardsFade = useRef(new Animated.Value(0)).current;
  const cardsSlide = useRef(new Animated.Value(30)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const punchScale = useRef(new Animated.Value(1)).current;
  const infoFade = useRef(new Animated.Value(0)).current;
  const infoSlide = useRef(new Animated.Value(15)).current;

  // Centered image position
  const imageX = (SCREEN_WIDTH - IMAGE_SIZE) / 2;
  const imageY = (SCREEN_HEIGHT - IMAGE_SIZE) / 2 - 60;

  // Phase 1: Fade in — wait for the image to be ready before animating
  const entranceStarted = useRef(false);

  const startEntrance = useCallback(() => {
    if (entranceStarted.current) return;
    entranceStarted.current = true;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    Animated.parallel([
      Animated.timing(blurOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(imageFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(imageScale, {
        toValue: 1,
        tension: 50,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start(() => {
      showContent();
    });
  }, []);

  // Start entrance once the current village image has loaded
  useEffect(() => {
    if (imageReady) {
      startEntrance();
    }
  }, [imageReady]);

  // Phase 2: Show labels + cards
  const showContent = () => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(labelFade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(labelSlide, {
          toValue: 0,
          tension: 60,
          friction: 10,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(cardsFade, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(cardsSlide, {
          toValue: 0,
          tension: 50,
          friction: 10,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  // Animation for switching from current to chosen image
  const chosenImageFade = useRef(new Animated.Value(0)).current;

  // Phase 3: Handle choice
  const handleChoice = useCallback((choice: 0 | 1) => {
    if (choosing) return;
    setChoosing(true);
    setChosenPath(choice);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});

    if (user) {
      saveVillageChoice(user.uid, choice).catch(console.error);
    }

    // Scale down → flash to white → swap image behind flash → fade flash out
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
      // Flash is fully white — swap to chosen image layer + tell parent to update VillageDisplay
      chosenImageFade.setValue(1);
      onChoiceMade(choice);

      // The chosen image is already pre-rendered, so we can fade out the flash immediately
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
        // Show new level info
        Animated.parallel([
          Animated.timing(infoFade, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.spring(infoSlide, {
            toValue: 0,
            tension: 60,
            friction: 10,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setTimeout(() => fadeOut(), 1800);
        });
      });
    });
  }, [choosing, user, choiceImages]);

  const handleContinue = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    fadeOut();
  }, []);

  // Phase 4: Fade out — VillageDisplay underneath is already updated
  const fadeOut = () => {
    Animated.parallel([
      Animated.timing(blurOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(imageFade, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(imageScale, {
        toValue: 0.95,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(labelFade, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(infoFade, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const villageStageName = VILLAGE_STAGE_NAMES[Math.min(newLevel, 5)] || `Level ${newLevel}`;
  const powerColor = '#EF4444';
  const wisdomColor = '#6366F1';

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Blur background */}
      <Animated.View style={[styles.blurWrapper, { opacity: blurOpacity }]} pointerEvents="auto">
        <BlurView style={StyleSheet.absoluteFill} intensity={40} tint="dark" />
        <View style={styles.blurDarkOverlay} />
      </Animated.View>

      {/* "LEVEL UP" label */}
      <Animated.View
        style={[
          styles.labelContainer,
          {
            opacity: labelFade,
            transform: [{ translateY: labelSlide }],
            top: imageY - 40,
          },
        ]}
        pointerEvents="none"
      >
        <Text style={styles.levelUpLabel}>LEVEL UP</Text>
      </Animated.View>

      {/* Centered image — fades + scales in, independent of scroll container */}
      <Animated.View
        style={[
          styles.imageContainer,
          {
            left: imageX,
            top: imageY,
            width: IMAGE_SIZE,
            height: IMAGE_SIZE,
            opacity: imageFade,
            transform: [
              { scale: Animated.multiply(imageScale, punchScale) },
            ],
          },
        ]}
        pointerEvents="none"
      >
        {/* Base layer: current village image */}
        <Image
          source={currentVillageImage}
          style={styles.villageImage}
          resizeMode="cover"
          onLoad={() => setImageReady(true)}
        />
        {/* Pre-rendered choice images — hidden until chosen, then revealed instantly */}
        {choiceImages && (
          <>
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: chosenPath === 1 ? chosenImageFade : 0 }]}>
              <Image source={choiceImages.power} style={styles.villageImage} resizeMode="cover" />
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: chosenPath === 0 ? chosenImageFade : 0 }]}>
              <Image source={choiceImages.wisdom} style={styles.villageImage} resizeMode="cover" />
            </Animated.View>
          </>
        )}
        <Animated.View style={[styles.flashOverlay, { opacity: flashOpacity }]} />
      </Animated.View>

      {/* New level info — shown after choice */}
      <Animated.View
        style={[
          styles.levelInfo,
          {
            opacity: infoFade,
            transform: [{ translateY: infoSlide }],
            top: imageY + IMAGE_SIZE + 12,
          },
        ]}
        pointerEvents="none"
      >
        <Text style={styles.levelNumber}>Level {newLevel}</Text>
        <Text style={styles.rankName}>{villageStageName}</Text>
      </Animated.View>

      {/* Choice cards / Continue */}
      {hasChoice && choiceCopy ? (
        <Animated.View
          style={[
            styles.cardsContainer,
            {
              opacity: cardsFade,
              transform: [{ translateY: cardsSlide }],
              top: imageY + IMAGE_SIZE + 16,
            },
          ]}
        >
          <Text style={styles.choiceHeader}>Choose your path</Text>
          <View style={styles.cardsRow}>
            <TouchableOpacity
              style={[
                styles.choiceCard,
                {
                  borderColor: 'rgba(239, 68, 68, 0.2)',
                  backgroundColor: 'rgba(239, 68, 68, 0.06)',
                },
              ]}
              onPress={() => handleChoice(1)}
              activeOpacity={0.7}
              disabled={choosing}
            >
              <View style={[styles.choiceIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                <MaterialCommunityIcons name="sword-cross" size={24} color={powerColor} />
              </View>
              <Text style={styles.choiceTitle}>{choiceCopy.power.title}</Text>
              <Text style={styles.choiceQuote}>{choiceCopy.power.quote}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.choiceCard,
                {
                  borderColor: 'rgba(99, 102, 241, 0.2)',
                  backgroundColor: 'rgba(99, 102, 241, 0.06)',
                },
              ]}
              onPress={() => handleChoice(0)}
              activeOpacity={0.7}
              disabled={choosing}
            >
              <View style={[styles.choiceIconCircle, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
                <MaterialCommunityIcons name="book-open-variant" size={24} color={wisdomColor} />
              </View>
              <Text style={styles.choiceTitle}>{choiceCopy.wisdom.title}</Text>
              <Text style={styles.choiceQuote}>{choiceCopy.wisdom.quote}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      ) : (
        <Animated.View
          style={[
            styles.cardsContainer,
            {
              opacity: cardsFade,
              transform: [{ translateY: cardsSlide }],
              top: imageY + IMAGE_SIZE + 16,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000,
  },

  blurWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  blurDarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },

  labelContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  levelUpLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 6,
    color: 'rgba(255, 255, 255, 0.5)',
  },

  imageContainer: {
    position: 'absolute',
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

  levelInfo: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  levelNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  rankName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  cardsContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
  },
  choiceHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  choiceCard: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 16,
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

  continueButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  continueText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
