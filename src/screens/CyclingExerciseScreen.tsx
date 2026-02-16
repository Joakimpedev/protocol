import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';
import { useAuth } from '../contexts/AuthContext';
import { Exercise, ExerciseVariation, getTodayVariation } from '../services/exerciseService';
import {
  markExerciseCompleted,
  getExercisePreferences,
  saveExercisePreferences,
} from '../services/exerciseService';
import { useAudioPlayer } from 'expo-audio';
import { countdownSource, completeSource } from '../utils/soundUtils';

interface CyclingExerciseScreenProps {
  route: {
    params: {
      exercise: Exercise;
    };
  };
  navigation: any;
}

type ScreenState = 'pre-timer' | 'ready' | 'exercise';

export default function CyclingExerciseScreen({ route, navigation }: CyclingExerciseScreenProps) {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const { exercise } = route.params;
  const { user } = useAuth();
  const [screen, setScreen] = useState<ScreenState>('pre-timer');
  const [selectedSets, setSelectedSets] = useState<number>(exercise.default_sets || 20);
  const [currentSet, setCurrentSet] = useState(1);
  const [phase, setPhase] = useState<'hold' | 'release' | 'additional'>('hold');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [variation, setVariation] = useState<ExerciseVariation | null>(null);
  const [additionalHoldIndex, setAdditionalHoldIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Create audio players using hooks
  const countdownPlayer = useAudioPlayer(countdownSource);
  const completePlayer = useAudioPlayer(completeSource);

  // Set volume and loop properties
  useEffect(() => {
    if (countdownPlayer) {
      countdownPlayer.volume = 0.3;
      countdownPlayer.loop = false;
    }
    if (completePlayer) {
      completePlayer.volume = 0.3;
      completePlayer.loop = false;
    }
  }, [countdownPlayer, completePlayer]);

  useEffect(() => {
    const todayVariation = getTodayVariation(exercise);
    setVariation(todayVariation);

    if (user) {
      loadPreferences();
    }

    // Cleanup on unmount
    return () => {
      // Audio players cleanup automatically
    };
  }, [exercise, user]);

  useEffect(() => {
    if (screen === 'exercise' && timeRemaining > 0 && !isPaused) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          // Play countdown sound at 3 seconds (so it plays when timer will show 2)
          if (prev === 3) {
            try {
              if (countdownPlayer) {
                countdownPlayer.seekTo(0);
                countdownPlayer.play();
              }
            } catch (e) {
              console.error('Error in countdown sound:', e);
            }
          }

          // Play countdown sound at 2 seconds (so it plays when timer will show 1)
          if (prev === 2) {
            try {
              if (countdownPlayer) {
                countdownPlayer.seekTo(0);
                countdownPlayer.play();
              }
            } catch (e) {
              console.error('Error in countdown sound:', e);
            }
          }

          // Play complete sound at 1 second (so it plays when timer will show 0 and phase completes)
          if (prev === 1) {
            // Play complete sound immediately when phase completes
            try {
              if (completePlayer) {
                completePlayer.seekTo(0);
                completePlayer.play();
              }
            } catch (e) {
              console.error('Error playing complete sound:', e);
            }
            // Handle phase completion
            handlePhaseComplete();
            return 0;
          }

          if (prev <= 0) {
            return 0;
          }

          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [screen, timeRemaining, isPaused, phase, currentSet, countdownPlayer, completePlayer]);

  const loadPreferences = async () => {
    if (!user) return;
    try {
      const preferences = await getExercisePreferences(user.uid);
      const lastSets = preferences.lastSets?.[exercise.exercise_id];
      if (lastSets) {
        setSelectedSets(lastSets);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const handleStart = async () => {
    if (!user) return;

    // Save selected sets
    try {
      const preferences = await getExercisePreferences(user.uid);
      await saveExercisePreferences(user.uid, {
        lastSets: {
          ...preferences.lastSets,
          [exercise.exercise_id]: selectedSets,
        },
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
    }

    setScreen('ready');
  };

  const handleGo = () => {
    startSet();
  };

  const startSet = () => {
    if (!variation) return;

    setScreen('exercise');
    setIsPaused(false);

    // Handle continuous exercises (like Wall Slide)
    if (variation.continuous) {
      // For continuous, just show the set number, no timer
      return;
    }

    // Start with hold phase
    setPhase('hold');
    const holdTime = variation.hold_seconds || 5;
    setTimeRemaining(holdTime);
  };

  const handlePhaseComplete = () => {
    if (!variation) return;

    // Complete sound is now played in the timer logic at the right time

    if (phase === 'hold') {
      // Check if there are additional holds (like jaw stretch)
      if (variation.additional_holds && additionalHoldIndex < variation.additional_holds.length) {
        setPhase('additional');
        const additionalHold = variation.additional_holds[additionalHoldIndex];
        setTimeRemaining(additionalHold.hold_seconds);
        return;
      }

      // Move to release
      const releaseTime = variation.release_seconds || 3;
      setPhase('release');
      setTimeRemaining(releaseTime);
    } else if (phase === 'additional') {
      // Move to next additional hold or release
      if (variation.additional_holds && additionalHoldIndex < variation.additional_holds.length - 1) {
        setAdditionalHoldIndex(prev => prev + 1);
        const nextHold = variation.additional_holds![additionalHoldIndex + 1];
        setTimeRemaining(nextHold.hold_seconds);
        // Stay in additional phase
      } else {
        // All additional holds done, move to release
        const releaseTime = variation.release_seconds || 3;
        setPhase('release');
        setTimeRemaining(releaseTime);
      }
    } else if (phase === 'release') {
      // Set complete, move to next set or finish
      if (currentSet < selectedSets) {
        setAdditionalHoldIndex(0);
        setCurrentSet(prev => prev + 1);
        // Start next set immediately, no delay
        startSet();
      } else {
        handleAllSetsComplete();
      }
    }
  };

  const handleAllSetsComplete = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (user) {
      try {
        await markExerciseCompleted(user.uid, exercise.exercise_id);
      } catch (error) {
        console.error('Error marking exercise completed:', error);
      }
    }

    // Return to exercises section immediately
    navigation.goBack();
  };

  const handleEndEarly = () => {
    Alert.alert(
      'End early?',
      'This will mark the exercise as complete.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End',
          onPress: () => {
            handleAllSetsComplete();
          },
        },
      ]
    );
  };

  const formatTime = (seconds: number): string => {
    return seconds.toString().padStart(2, '0');
  };

  const getPhaseInstruction = (): string => {
    if (!variation) return '';

    if (phase === 'hold') {
      return variation.instructions.split('.')[0] || variation.instructions;
    } else if (phase === 'additional') {
      const additionalHold = variation.additional_holds?.[additionalHoldIndex];
      if (additionalHold) {
        return `Move jaw ${additionalHold.position}. Hold.`;
      }
    } else if (phase === 'release') {
      return 'Release.';
    }

    return variation.instructions;
  };

  if (screen === 'pre-timer') {
    const todayVariation = getTodayVariation(exercise);

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.heading}>{exercise.display_name}</Text>

          {todayVariation && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Today's Exercise: {todayVariation.name}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>What it improves</Text>
                <Text style={styles.bodyText}>{todayVariation.what_it_improves}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Instructions</Text>
                <Text style={styles.bodyText}>{todayVariation.instructions}</Text>
              </View>

              {todayVariation.tip && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Tip</Text>
                  <Text style={styles.bodyText}>{todayVariation.tip}</Text>
                </View>
              )}
            </>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sets</Text>
            <View style={styles.setOptions}>
              {exercise.set_options?.map((sets) => (
                <TouchableOpacity
                  key={sets}
                  style={[
                    styles.setButton,
                    selectedSets === sets && styles.setButtonActive,
                  ]}
                  onPress={() => setSelectedSets(sets)}
                >
                  <Text
                    style={[
                      styles.setButtonText,
                      selectedSets === sets && styles.setButtonTextActive,
                    ]}
                  >
                    {sets} sets
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.startButton} onPress={handleStart}>
            <Text style={styles.startButtonText}>Start</Text>
          </TouchableOpacity>
      </ScrollView>
    );
  }

  if (screen === 'ready') {
    return (
      <View style={styles.container}>
        <View style={styles.readyContent}>
          <Text style={styles.readyText}>Ready?</Text>
          <TouchableOpacity style={styles.goButton} onPress={handleGo}>
            <Text style={styles.goButtonText}>Go</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!variation) {
    return null;
  }

  // Continuous exercise (like Wall Slide)
  if (variation.continuous) {
    return (
      <View style={styles.container}>
        <View style={styles.exerciseContent}>
          {variation.instructions && (
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsLabel}>Instructions:</Text>
              <Text style={styles.instructionsText}>{variation.instructions}</Text>
            </View>
          )}
          <Text style={styles.setDisplay}>Set {currentSet} of {selectedSets}</Text>
          <Text style={styles.instructionText}>{variation.instructions}</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => {
                if (currentSet < selectedSets) {
                  setCurrentSet(prev => prev + 1);
                } else {
                  handleAllSetsComplete();
                }
              }}
            >
              <Text style={styles.nextButtonText}>
                {currentSet < selectedSets ? 'Next Set' : 'Complete'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, styles.endButton]}
              onPress={handleEndEarly}
            >
              <Text style={styles.controlButtonText}>End Early</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Timed exercise with phases
  return (
    <View style={styles.container}>
      <View style={styles.exerciseContent}>
        {variation.instructions && (
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsLabel}>Instructions:</Text>
            <Text style={styles.instructionsText}>{variation.instructions}</Text>
          </View>
        )}
        <Text style={styles.setDisplay}>Set {currentSet} of {selectedSets}</Text>

        {timeRemaining > 0 && (
          <Text style={styles.timerDisplay}>{formatTime(timeRemaining)}</Text>
        )}

        <Text style={styles.phaseText}>
          {phase === 'hold' && 'Hold'}
          {phase === 'release' && 'Release'}
          {phase === 'additional' && variation.additional_holds?.[additionalHoldIndex]?.position}
        </Text>

        <Text style={styles.instructionText}>{getPhaseInstruction()}</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setIsPaused(prev => !prev)}
          >
            <Text style={styles.controlButtonText}>
              {isPaused ? 'Resume' : 'Pause'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.endButton]}
            onPress={handleEndEarly}
          >
            <Text style={styles.controlButtonText}>End Early</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: theme.spacing.md,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.xl,
    },
    heading: {
      ...theme.typography.heading,
      marginBottom: theme.spacing.lg,
    },
    section: {
      marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
      ...theme.typography.headingSmall,
      fontSize: 20,
      marginBottom: theme.spacing.sm,
    },
    bodyText: {
      ...theme.typography.body,
      lineHeight: 24,
    },
    setOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    setButton: {
      padding: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
    },
    setButtonActive: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.accent,
    },
    setButtonText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
    },
    setButtonTextActive: {
      color: theme.colors.text,
      fontWeight: '600',
    },
    startButton: {
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      marginTop: theme.spacing.xl,
    },
    startButtonText: {
      ...theme.typography.body,
      fontWeight: '600',
      color: theme.colors.text,
    },
    readyContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    readyText: {
      ...theme.typography.heading,
      marginBottom: theme.spacing.xl,
    },
    goButton: {
      padding: theme.spacing.xl,
      paddingHorizontal: theme.spacing.xxl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
    },
    goButtonText: {
      ...theme.typography.heading,
      color: theme.colors.text,
    },
    exerciseContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    setDisplay: {
      ...theme.typography.headingSmall,
      marginBottom: theme.spacing.lg,
    },
    timerDisplay: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 96,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    phaseText: {
      ...theme.typography.headingSmall,
      marginBottom: theme.spacing.md,
      textTransform: 'uppercase',
    },
    instructionText: {
      ...theme.typography.body,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
      lineHeight: 24,
      paddingHorizontal: theme.spacing.lg,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginTop: theme.spacing.xl,
    },
    controlButton: {
      padding: theme.spacing.lg,
      paddingHorizontal: theme.spacing.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
    },
    endButton: {
      borderColor: theme.colors.error,
    },
    controlButtonText: {
      ...theme.typography.body,
      fontWeight: '600',
      color: theme.colors.text,
    },
    nextButton: {
      padding: theme.spacing.lg,
      paddingHorizontal: theme.spacing.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.accent,
      borderRadius: theme.borderRadius.lg,
    },
    nextButtonText: {
      ...theme.typography.body,
      fontWeight: '600',
      color: theme.colors.accent,
    },
    devButton: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.surface,
    },
    devButtonText: {
      ...theme.typography.body,
      fontWeight: '600',
      color: theme.colors.accent,
      fontSize: 12,
    },
    instructionsContainer: {
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      width: '100%',
    },
    instructionsLabel: {
      ...theme.typography.label,
      color: theme.colors.textMuted,
      marginBottom: theme.spacing.xs,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    instructionsText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      fontSize: 13,
    },
  });
}
