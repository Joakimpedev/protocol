import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { colors, typography, spacing, MONOSPACE_FONT } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { Exercise, ExerciseVariation, getTodayVariation } from '../services/exerciseService';
import {
  markExerciseCompleted,
  getExercisePreferences,
  saveExercisePreferences,
} from '../services/exerciseService';
import { trackExerciseEarlyEnd } from '../services/analyticsService';
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
          onPress: async () => {
            // Track that exercise was ended early
            if (user) {
              try {
                await trackExerciseEarlyEnd(user.uid, exercise.exercise_id);
              } catch (error) {
                console.error('Error tracking exercise early end:', error);
              }
            }
            await handleAllSetsComplete();
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  heading: {
    ...typography.heading,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.headingSmall,
    fontSize: 20,
    marginBottom: spacing.sm,
  },
  bodyText: {
    ...typography.body,
    lineHeight: 24,
  },
  setOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  setButton: {
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  setButtonActive: {
    backgroundColor: colors.surface,
    borderColor: colors.accent,
  },
  setButtonText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  setButtonTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  startButton: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  startButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  readyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  readyText: {
    ...typography.heading,
    marginBottom: spacing.xl,
  },
  goButton: {
    padding: spacing.xl,
    paddingHorizontal: spacing.xxl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  goButtonText: {
    ...typography.heading,
    color: colors.text,
  },
  exerciseContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  setDisplay: {
    ...typography.headingSmall,
    marginBottom: spacing.lg,
  },
  timerDisplay: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 96,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  phaseText: {
    ...typography.headingSmall,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  instructionText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
    paddingHorizontal: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  controlButton: {
    padding: spacing.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  endButton: {
    borderColor: colors.error,
  },
  controlButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  nextButton: {
    padding: spacing.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 4,
  },
  nextButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.accent,
  },
});

