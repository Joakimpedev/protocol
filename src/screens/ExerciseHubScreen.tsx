import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';
import { useAuth } from '../contexts/AuthContext';
import {
  getAllExercises,
  getTodayExerciseCompletions,
  getTodayVariation,
  estimateExerciseDuration,
  Exercise,
  ExerciseVariation,
} from '../services/exerciseService';
import { getExercisePreferences, ExercisePreferences } from '../services/exerciseService';
import { formatDuration } from '../services/routineBuilder';

export default function ExerciseHubScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [preferences, setPreferences] = useState<ExercisePreferences>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const [allExercises, todayCompletions, userPreferences] = await Promise.all([
          Promise.resolve(getAllExercises()),
          getTodayExerciseCompletions(user.uid),
          getExercisePreferences(user.uid),
        ]);

        // Filter to only the 4 main exercises
        const mainExercises = allExercises.filter(
          ex => ['mewing', 'chewing', 'jaw_exercises', 'neck_posture'].includes(ex.exercise_id)
        );

        setExercises(mainExercises);
        setCompletions(todayCompletions);
        setPreferences(userPreferences);
      } catch (error) {
        console.error('Error loading exercise data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Refresh when returning to screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      if (user) {
        const todayCompletions = await getTodayExerciseCompletions(user.uid);
        setCompletions(todayCompletions);
        const userPreferences = await getExercisePreferences(user.uid);
        setPreferences(userPreferences);
      }
    });

    return unsubscribe;
  }, [navigation, user]);

  const handleExercisePress = (exercise: Exercise) => {
    if (exercise.exercise_id === 'mewing') {
      navigation.navigate('MewingSettings');
    } else if (exercise.exercise_id === 'chewing') {
      navigation.navigate('ChewingTimer', { exercise });
    } else if (exercise.exercise_id === 'jaw_exercises') {
      navigation.navigate('CyclingExercise', { exercise });
    } else if (exercise.exercise_id === 'neck_posture') {
      navigation.navigate('CyclingExercise', { exercise });
    }
  };

  const renderExerciseCard = (exercise: Exercise) => {
    const isCompleted = completions[exercise.exercise_id] || false;
    const hasCompletion = exercise.has_completion;

    // Calculate estimated duration using default sets (excluding mewing)
    const estimatedDurationSeconds = estimateExerciseDuration(exercise);
    const durationText = estimatedDurationSeconds > 0 ? formatDuration(estimatedDurationSeconds) : null;
    const isMewing = exercise.exercise_id === 'mewing';

    // For cycling exercises, get today's variation
    let variationName: string | null = null;
    if (exercise.type === 'cycling') {
      const variation = getTodayVariation(exercise);
      variationName = variation?.name || null;
    }

    // For mewing, check if reminders are configured
    let mewingStatus: string | null = null;
    if (isMewing) {
      mewingStatus = preferences.mewing ? 'Reminders on' : 'Set up reminders';
    }

    return (
      <TouchableOpacity
        key={exercise.exercise_id}
        style={[styles.card, isCompleted && styles.cardCompleted]}
        onPress={() => handleExercisePress(exercise)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{exercise.display_name}</Text>
          {hasCompletion && isCompleted && (
            <Text style={styles.completedCheckmark}>✓</Text>
          )}
        </View>

        <View style={styles.cardInfo}>
          {variationName && (
            <>
              <Text style={styles.cardInfoText}>Today: {variationName}</Text>
              {durationText && (
                <>
                  <Text style={styles.cardInfoText}>•</Text>
                  <Text style={styles.cardInfoText}>{durationText}</Text>
                </>
              )}
            </>
          )}
          {!variationName && mewingStatus && (
            <Text style={[
              styles.cardInfoText,
              !preferences.mewing && styles.cardInfoTextUrgent
            ]}>
              {mewingStatus}
            </Text>
          )}
          {!variationName && !mewingStatus && durationText && (
            <Text style={styles.cardInfoText}>{durationText}</Text>
          )}
        </View>

        {!variationName && !mewingStatus && hasCompletion && !isCompleted && (
          <Text style={styles.cardStatus}>Not completed</Text>
        )}

        <View style={styles.cardArrow}>
          <Text style={styles.arrowText}>→</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.text} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Exercises</Text>

      {exercises.map(renderExerciseCard)}
    </ScrollView>
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
      paddingTop: theme.spacing.xl + 60,
    },
    heading: {
      ...theme.typography.heading,
      marginBottom: theme.spacing.lg,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    cardCompleted: {
      opacity: 0.7,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    cardTitle: {
      ...theme.typography.headingSmall,
      color: theme.colors.text,
    },
    completedCheckmark: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 24,
      color: theme.colors.accent,
    },
    cardInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
      flexWrap: 'wrap',
    },
    cardInfoText: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      marginRight: theme.spacing.sm,
    },
    cardInfoTextUrgent: {
      color: theme.colors.error,
      fontWeight: '600',
    },
    cardStatus: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    cardArrow: {
      marginTop: theme.spacing.sm,
      alignItems: 'flex-end',
    },
    arrowText: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 18,
      color: theme.colors.textSecondary,
    },
  });
}
