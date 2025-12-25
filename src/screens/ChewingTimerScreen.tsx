import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, typography, spacing, MONOSPACE_FONT } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { Exercise } from '../services/exerciseService';
import {
  markExerciseCompleted,
  getExercisePreferences,
  saveExercisePreferences,
} from '../services/exerciseService';
import { trackExerciseEarlyEnd } from '../services/analyticsService';

interface ChewingTimerScreenProps {
  route: {
    params: {
      exercise: Exercise;
    };
  };
  navigation: any;
}

export default function ChewingTimerScreen({ route, navigation }: ChewingTimerScreenProps) {
  const { exercise } = route.params;
  const { user } = useAuth();
  const [screen, setScreen] = useState<'pre-timer' | 'timer'>('pre-timer');
  const [selectedDuration, setSelectedDuration] = useState<number>(exercise.default_duration || 1200);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSide, setCurrentSide] = useState<'left' | 'right'>('left');
  const [sideTimeRemaining, setSideTimeRemaining] = useState<number>(120); // 2 minutes in seconds
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  useEffect(() => {
    if (screen === 'timer' && timeRemaining > 0 && !isPaused) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });

        // Handle side switching countdown
        setSideTimeRemaining(prev => {
          if (prev <= 1) {
            // Switch sides and reset to 2 minutes
            setCurrentSide(current => current === 'left' ? 'right' : 'left');
            return 120;
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
  }, [screen, timeRemaining, isPaused]);

  const loadPreferences = async () => {
    if (!user) return;
    try {
      const preferences = await getExercisePreferences(user.uid);
      const lastDuration = preferences.lastDurations?.[exercise.exercise_id];
      if (lastDuration) {
        setSelectedDuration(lastDuration);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const handleStart = async () => {
    if (!user) return;

    // Save selected duration
    try {
      const preferences = await getExercisePreferences(user.uid);
      await saveExercisePreferences(user.uid, {
        lastDurations: {
          ...preferences.lastDurations,
          [exercise.exercise_id]: selectedDuration,
        },
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
    }

    setTimeRemaining(selectedDuration);
    setScreen('timer');
    setIsPaused(false);
    setCurrentSide('left');
    setSideTimeRemaining(120);
  };

  const handlePauseResume = () => {
    setIsPaused(prev => !prev);
  };

  const handleEndEarly = async () => {
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
            await handleTimerComplete();
          },
        },
      ]
    );
  };

  const handleTimerComplete = async () => {
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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (screen === 'pre-timer') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.heading}>{exercise.display_name}</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What it improves</Text>
            <Text style={styles.bodyText}>{exercise.what_it_improves}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            <Text style={styles.bodyText}>{exercise.instructions}</Text>
          </View>

          {exercise.tip && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tip</Text>
              <Text style={styles.bodyText}>{exercise.tip}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Duration</Text>
            <View style={styles.durationOptions}>
              {exercise.duration_options?.map((duration) => {
                const minutes = Math.floor(duration / 60);
                return (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.durationButton,
                      selectedDuration === duration && styles.durationButtonActive,
                    ]}
                    onPress={() => setSelectedDuration(duration)}
                  >
                    <Text
                      style={[
                        styles.durationButtonText,
                        selectedDuration === duration && styles.durationButtonTextActive,
                      ]}
                    >
                      {minutes} min
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity style={styles.startButton} onPress={handleStart}>
            <Text style={styles.startButtonText}>Start</Text>
          </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.timerContent}>
        <Text style={styles.timerDisplay}>{formatTime(timeRemaining)}</Text>
        
        <View style={styles.sideTimerContainer}>
          <Text style={styles.sideLabel}>{currentSide === 'left' ? 'Left side' : 'Right side'}</Text>
          <Text style={styles.sideTimerDisplay}>{formatTime(sideTimeRemaining)}</Text>
        </View>

        <Text style={styles.exerciseName}>{exercise.display_name}</Text>
        <Text style={styles.instructionText}>{exercise.instructions}</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handlePauseResume}
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
    marginBottom: spacing.lg,
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
  durationOptions: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  durationButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationButtonActive: {
    backgroundColor: colors.surface,
    borderColor: colors.accent,
  },
  durationButtonText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  durationButtonTextActive: {
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
    marginTop: spacing.lg,
  },
  startButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  timerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  timerDisplay: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 72,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  sideTimerContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  sideLabel: {
    ...typography.headingSmall,
    fontSize: 24,
    marginBottom: spacing.xs,
    textTransform: 'capitalize',
    color: colors.text,
  },
  sideTimerDisplay: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 48,
    fontWeight: '600',
    color: colors.accent,
  },
  exerciseName: {
    ...typography.headingSmall,
    marginBottom: spacing.sm,
  },
  instructionText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
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
});

