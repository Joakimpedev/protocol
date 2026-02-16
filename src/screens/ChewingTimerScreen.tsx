import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';
import { useAuth } from '../contexts/AuthContext';
import { Exercise } from '../services/exerciseService';
import {
  markExerciseCompleted,
  getExercisePreferences,
  saveExercisePreferences,
} from '../services/exerciseService';

interface ChewingTimerScreenProps {
  route: {
    params: {
      exercise: Exercise;
    };
  };
  navigation: any;
}

export default function ChewingTimerScreen({ route, navigation }: ChewingTimerScreenProps) {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

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

  const handleEndEarly = () => {
    Alert.alert(
      'End early?',
      'This will mark the exercise as complete.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End',
          onPress: () => {
            handleTimerComplete();
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
        {exercise.instructions && (
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsLabel}>Instructions:</Text>
            <Text style={styles.instructionsText}>{exercise.instructions}</Text>
          </View>
        )}
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
      marginBottom: theme.spacing.lg,
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
    durationOptions: {
      flexDirection: 'row',
      flexWrap: 'nowrap',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.sm,
    },
    durationButton: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    durationButtonActive: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.accent,
    },
    durationButtonText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    durationButtonTextActive: {
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
      marginTop: theme.spacing.lg,
    },
    startButtonText: {
      ...theme.typography.body,
      fontWeight: '600',
      color: theme.colors.text,
    },
    timerContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    timerDisplay: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 72,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.lg,
    },
    sideTimerContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    sideLabel: {
      ...theme.typography.headingSmall,
      fontSize: 24,
      marginBottom: theme.spacing.xs,
      textTransform: 'capitalize',
      color: theme.colors.text,
    },
    sideTimerDisplay: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 48,
      fontWeight: '600',
      color: theme.colors.accent,
    },
    exerciseName: {
      ...theme.typography.headingSmall,
      marginBottom: theme.spacing.sm,
    },
    instructionText: {
      ...theme.typography.body,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
      lineHeight: 24,
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
