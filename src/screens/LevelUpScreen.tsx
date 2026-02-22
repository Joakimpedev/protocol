/**
 * LevelUpScreen
 * Multi-phase level-up celebration:
 *   Phase 1: Current village appears with "LEVEL UP" text
 *   Phase 2: Image blurs into a mystery preview with "?" — choice cards appear
 *   Phase 3: On choice — instant reveal of chosen village with punch animation
 *   Phase 4: Hold to admire, then graceful fade out
 *
 * All next-level images are preloaded via hidden <Image> components so the
 * reveal on choice is instantaneous.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  Dimensions,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import { getLevelDefinition } from '../services/xpService';
import {
  getVillageImageForLevel,
  getBalancedVillageImage,
  getChoiceImages,
  saveVillageChoice,
} from '../services/villageService';
import { VILLAGE_CHOICE_COPY } from '../data/villageChoices';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_SIZE = Math.min(SCREEN_WIDTH - 64, SCREEN_HEIGHT * 0.3);
const CARD_WIDTH = (SCREEN_WIDTH - 72) / 2;

export default function LevelUpScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { newLevel, currentChoices = [] } = route.params || { newLevel: 2, currentChoices: [] };
  const levelDef = getLevelDefinition(newLevel);
  const prevLevelDef = getLevelDefinition(Math.max(newLevel - 1, 1));
  const hasChoice = newLevel >= 2 && newLevel <= 5;
  const choiceCopy = VILLAGE_CHOICE_COPY[newLevel];

  const [phase, setPhase] = useState<'enter' | 'mystery' | 'reveal' | 'exit'>('enter');
  const [choosing, setChoosing] = useState(false);

  // Images — all computed eagerly so RN can cache them
  const currentVillageImage = useMemo(
    () => getVillageImageForLevel(Math.max(newLevel - 1, 1), currentChoices),
    [newLevel, currentChoices]
  );
  const mysteryImage = useMemo(
    () => hasChoice ? getBalancedVillageImage(newLevel) : currentVillageImage,
    [newLevel, hasChoice]
  );
  const choiceImages = useMemo(
    () => hasChoice ? getChoiceImages(newLevel, currentChoices) : null,
    [newLevel, currentChoices, hasChoice]
  );
  const [revealImage, setRevealImage] = useState(currentVillageImage);

  // ── Animation values ──

  // Phase 1: entrance
  const screenFade = useRef(new Animated.Value(0)).current;        // whole screen opacity
  const bgBlurFade = useRef(new Animated.Value(0)).current;        // blurred bg behind everything
  const currentImgFade = useRef(new Animated.Value(0)).current;    // current village image
  const currentImgScale = useRef(new Animated.Value(0.9)).current;
  const labelFade = useRef(new Animated.Value(0)).current;
  const labelSlide = useRef(new Animated.Value(-15)).current;
  const infoFade = useRef(new Animated.Value(0)).current;
  const infoSlide = useRef(new Animated.Value(15)).current;

  // Phase 2: mystery transition
  const mysteryFade = useRef(new Animated.Value(0)).current;       // blurred mystery overlay
  const questionFade = useRef(new Animated.Value(0)).current;      // "?" icon
  const questionScale = useRef(new Animated.Value(0.5)).current;
  const cardsFade = useRef(new Animated.Value(0)).current;
  const cardsSlide = useRef(new Animated.Value(25)).current;

  // Phase 3: reveal
  const revealFade = useRef(new Animated.Value(0)).current;
  const revealScale = useRef(new Animated.Value(1.15)).current;    // starts slightly zoomed, snaps to 1

  // Phase 4: exit
  const exitFade = useRef(new Animated.Value(1)).current;

  // ── Phase 1: Entrance ──
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    // Fade the whole screen in first (prevents the "jump")
    Animated.timing(screenFade, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      // Then run the staggered content entrance
      Animated.sequence([
        // Blurred bg
        Animated.timing(bgBlurFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        // Current village image
        Animated.parallel([
          Animated.timing(currentImgFade, {
            toValue: 1,
            duration: 450,
            useNativeDriver: true,
          }),
          Animated.spring(currentImgScale, {
            toValue: 1,
            tension: 50,
            friction: 9,
            useNativeDriver: true,
          }),
        ]),
        // "LEVEL UP" label
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
        // Level info
        Animated.parallel([
          Animated.timing(infoFade, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(infoSlide, {
            toValue: 0,
            tension: 60,
            friction: 10,
            useNativeDriver: true,
          }),
        ]),
        // Brief hold on the current level
        Animated.delay(800),
      ]).start(() => {
        // Transition to mystery phase
        if (hasChoice) {
          startMysteryPhase();
        } else {
          // No choice — show continue immediately
          startNoChoicePhase();
        }
      });
    });
  }, []);

  // ── Phase 2: Mystery transition ──
  const startMysteryPhase = () => {
    setPhase('mystery');

    Animated.sequence([
      // Blur over the current image + show "?"
      Animated.parallel([
        Animated.timing(mysteryFade, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        // Fade out old level info
        Animated.timing(infoFade, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // "?" pops in
      Animated.parallel([
        Animated.timing(questionFade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(questionScale, {
          toValue: 1,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // Choice cards slide up
      Animated.parallel([
        Animated.timing(cardsFade, {
          toValue: 1,
          duration: 400,
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

  // For levels without choice (6+)
  const startNoChoicePhase = () => {
    Animated.parallel([
      Animated.timing(cardsFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(cardsSlide, {
        toValue: 0,
        tension: 50,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // ── Phase 3: Reveal on choice ──
  const handleChoice = async (choice: 0 | 1) => {
    if (choosing) return;
    setChoosing(true);
    setPhase('reveal');

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});

    // Set the chosen image
    setRevealImage(choice === 1 ? choiceImages!.power : choiceImages!.wisdom);

    // Save to Firestore
    if (user) {
      saveVillageChoice(user.uid, choice).catch(console.error);
    }

    // Instant reveal: hide mystery + "?", show chosen image with punch
    Animated.parallel([
      // Hide "?" and mystery blur
      Animated.timing(questionFade, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(mysteryFade, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      // Hide cards
      Animated.timing(cardsFade, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      // Reveal new image with scale punch
      Animated.timing(revealFade, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(revealScale, {
        toValue: 1,
        tension: 100,
        friction: 6,
        useNativeDriver: true,
      }),
      // Fade in new level info
      Animated.sequence([
        Animated.delay(200),
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
        ]),
      ]),
    ]).start(() => {
      // Hold to admire, then exit
      setTimeout(() => gracefulExit(), 1500);
    });
  };

  const handleDismissNoChoice = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    gracefulExit();
  };

  // ── Phase 4: Graceful exit ──
  const gracefulExit = () => {
    setPhase('exit');
    Animated.timing(exitFade, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      navigation.goBack();
    });
  };

  // Which level info to show depends on phase
  const showNewLevelInfo = phase === 'reveal' || phase === 'exit';

  const powerColor = '#EF4444';
  const wisdomColor = '#6366F1';

  return (
    <Animated.View style={[styles.container, { opacity: Animated.multiply(screenFade, exitFade) }]}>
      {/* Preload all next-level images (hidden, zero-size) */}
      {choiceImages && (
        <View style={styles.preloadContainer} pointerEvents="none">
          <Image source={choiceImages.power} style={styles.preloadImage} />
          <Image source={choiceImages.wisdom} style={styles.preloadImage} />
          <Image source={mysteryImage} style={styles.preloadImage} />
        </View>
      )}

      {/* Layer 1: Blurred background — current village stretched */}
      <Animated.Image
        source={currentVillageImage}
        style={[styles.bgImage, { opacity: bgBlurFade }]}
        resizeMode="cover"
        blurRadius={50}
      />
      <View style={styles.bgOverlay} />

      {/* Main content */}
      <View style={styles.content}>
        {/* Top section */}
        <View style={styles.topSection}>
          {/* "LEVEL UP" label */}
          <Animated.View
            style={{
              opacity: labelFade,
              transform: [{ translateY: labelSlide }],
            }}
          >
            <Text style={styles.levelUpLabel}>LEVEL UP</Text>
          </Animated.View>

          {/* Image stack — layers on top of each other */}
          <View style={styles.imageContainer}>
            {/* Base: current village (always rendered) */}
            <Animated.View
              style={[
                styles.imageLayer,
                {
                  opacity: currentImgFade,
                  transform: [{ scale: currentImgScale }],
                },
              ]}
            >
              <Image source={currentVillageImage} style={styles.villageImage} resizeMode="cover" />
            </Animated.View>

            {/* Mystery: blurred next-level preview */}
            <Animated.View style={[styles.imageLayer, { opacity: mysteryFade }]}>
              <Image
                source={mysteryImage}
                style={styles.villageImage}
                resizeMode="cover"
                blurRadius={50}
              />
            </Animated.View>

            {/* "?" overlay on mystery */}
            <Animated.View
              style={[
                styles.questionOverlay,
                {
                  opacity: questionFade,
                  transform: [{ scale: questionScale }],
                },
              ]}
            >
              <View style={styles.questionCircle}>
                <MaterialCommunityIcons name="help" size={36} color="rgba(255,255,255,0.9)" />
              </View>
            </Animated.View>

            {/* Reveal: chosen village image */}
            <Animated.View
              style={[
                styles.imageLayer,
                {
                  opacity: revealFade,
                  transform: [{ scale: revealScale }],
                },
              ]}
            >
              <Image source={revealImage} style={styles.villageImage} resizeMode="cover" />
            </Animated.View>
          </View>

          {/* Level info — switches between old and new */}
          <Animated.View
            style={[
              styles.levelInfo,
              {
                opacity: infoFade,
                transform: [{ translateY: infoSlide }],
              },
            ]}
          >
            {showNewLevelInfo ? (
              <>
                <Text style={styles.levelNumber}>Level {newLevel}</Text>
                <Text style={styles.rankName}>{levelDef.name}</Text>
                <Text style={styles.rankDesc}>{levelDef.description}</Text>
              </>
            ) : (
              <>
                <Text style={styles.levelNumber}>Level {Math.max(newLevel - 1, 1)}</Text>
                <Text style={styles.rankName}>{prevLevelDef.name}</Text>
                <Text style={styles.rankDesc}>{prevLevelDef.description}</Text>
              </>
            )}
          </Animated.View>
        </View>

        {/* Bottom section: Choice cards or Continue */}
        {hasChoice && choiceCopy ? (
          <Animated.View
            style={[
              styles.bottomSection,
              {
                opacity: cardsFade,
                transform: [{ translateY: cardsSlide }],
              },
            ]}
          >
            <Text style={styles.choiceHeader}>Choose your path</Text>

            <View style={styles.cardsRow}>
              {/* Power */}
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

              {/* Wisdom */}
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
              styles.bottomSection,
              {
                opacity: cardsFade,
                transform: [{ translateY: cardsSlide }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleDismissNoChoice}
              activeOpacity={0.8}
            >
              <Text style={styles.continueText}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Hidden preload images
  preloadContainer: {
    position: 'absolute',
    width: 0,
    height: 0,
    overflow: 'hidden',
    opacity: 0,
  },
  preloadImage: {
    width: 1,
    height: 1,
  },

  // Blurred background
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    opacity: 0.45,
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },

  content: {
    flex: 1,
  },

  // Top area
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  levelUpLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 6,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 24,
  },

  // Image container — layers stack via absolute positioning
  imageContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
  imageLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    overflow: 'hidden',
  },
  villageImage: {
    width: '100%',
    height: '100%',
  },

  // "?" overlay
  questionOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Level info
  levelInfo: {
    alignItems: 'center',
    marginTop: 24,
  },
  levelNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  rankName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  rankDesc: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.45)',
  },

  // Bottom area
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 50,
  },
  choiceHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  choiceCard: {
    width: CARD_WIDTH,
    paddingVertical: 24,
    paddingHorizontal: 14,
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
    marginBottom: 12,
  },
  choiceTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 3,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  choiceQuote: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.45)',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 17,
  },

  // No-choice continue
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
