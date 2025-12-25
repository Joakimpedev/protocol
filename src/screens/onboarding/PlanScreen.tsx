import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { colors, typography, spacing, MONOSPACE_FONT } from '../../constants/theme';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
const guideBlocks = require('../../data/guide_blocks.json');

interface Problem {
  problem_id: string;
  display_name: string;
  what_it_is: string;
  what_causes_it: string;
  how_to_fix: string;
  recommended_ingredients: string[];
  recommended_exercises: string[];
}

interface Ingredient {
  ingredient_id: string;
  display_name: string;
  routine_order: number;
  short_description: string;
  example_brands: string[];
  timing: string;
  used_for: string[];
}

interface Exercise {
  exercise_id: string;
  display_name: string;
  short_description: string;
  duration: string;
  used_for: string[];
}

interface ItemState {
  state: 'pending' | 'added' | 'skipped' | 'not_received';
  productName?: string;
  waitingForDelivery?: boolean; // Track if checkbox is checked
}

export default function PlanScreen({ navigation }: any) {
  // Adjust top padding here - increase this number to move content lower
  const TOP_PADDING_EXTRA = 10; // Adjust this value (default: 80)

  const { data } = useOnboarding();
  const { user } = useAuth();
  const [ingredientStates, setIngredientStates] = useState<Record<string, ItemState>>({});
  const [exerciseStates, setExerciseStates] = useState<Record<string, ItemState>>({});
  const [loading, setLoading] = useState(false);

  // Load guide blocks data
  const problems: Problem[] = guideBlocks.problems || [];
  const ingredients: Ingredient[] = guideBlocks.ingredients || [];
  const exercises: Exercise[] = guideBlocks.exercises || [];

  // Get selected problems based on user's categories
  const selectedProblems = problems.filter((problem: Problem) =>
    data.selectedCategories?.includes(problem.problem_id)
  );

  // Get all unique ingredient IDs from selected problems
  const ingredientIds = Array.from(
    new Set(
      selectedProblems.flatMap((problem: Problem) => problem.recommended_ingredients || [])
    )
  );

  // Helper to check if ingredient is premium (for free users, hide premium ingredients)
  const isPremiumIngredient = (ing: any): boolean => {
    return ing?.session?.premium === true;
  };

  // Get ingredients sorted by routine_order, excluding premium ingredients
  let selectedIngredients = ingredientIds
    .map((id) => ingredients.find((ing: Ingredient) => ing.ingredient_id === id))
    .filter((ing): ing is Ingredient => ing !== undefined && !isPremiumIngredient(ing))
    .sort((a, b) => a.routine_order - b.routine_order);

  // Rule: If both BHA (salicylic_acid) and AHA are present, remove AHA (keep BHA)
  const hasBHA = selectedIngredients.some(ing => ing.ingredient_id === 'salicylic_acid');
  const hasAHA = selectedIngredients.some(ing => ing.ingredient_id === 'aha');
  
  if (hasBHA && hasAHA) {
    selectedIngredients = selectedIngredients.filter(ing => ing.ingredient_id !== 'aha');
  }

  // Get all unique exercise IDs from selected problems
  const exerciseIds = Array.from(
    new Set(
      selectedProblems.flatMap((problem: Problem) => problem.recommended_exercises || [])
    )
  );

  // Get exercises
  const selectedExercises = exerciseIds
    .map((id) => exercises.find((ex: Exercise) => ex.exercise_id === id))
    .filter((ex): ex is Exercise => ex !== undefined);

  // Format problem names for intro text
  const formatProblemNames = (problems: Problem[]): string => {
    if (problems.length === 0) return '';
    if (problems.length === 1) return problems[0].display_name.toLowerCase();
    if (problems.length === 2) {
      return `${problems[0].display_name.toLowerCase()} and ${problems[1].display_name.toLowerCase()}`;
    }
    const allButLast = problems.slice(0, -1).map(p => p.display_name.toLowerCase()).join(', ');
    const last = problems[problems.length - 1].display_name.toLowerCase();
    return `${allButLast} and ${last}`;
  };

  // Initialize states for ingredients
  useEffect(() => {
    const initialStates: Record<string, ItemState> = {};
    selectedIngredients.forEach((ingredient) => {
      if (!ingredientStates[ingredient.ingredient_id]) {
        initialStates[ingredient.ingredient_id] = {
          state: 'pending',
          productName: '',
          waitingForDelivery: false,
        };
      }
    });
    if (Object.keys(initialStates).length > 0) {
      setIngredientStates((prev) => ({ ...prev, ...initialStates }));
    }
  }, [selectedIngredients.length]);

  // Initialize states for exercises
  useEffect(() => {
    const initialStates: Record<string, ItemState> = {};
    selectedExercises.forEach((exercise) => {
      if (!exerciseStates[exercise.exercise_id]) {
        initialStates[exercise.exercise_id] = {
          state: 'pending',
        };
      }
    });
    if (Object.keys(initialStates).length > 0) {
      setExerciseStates((prev) => ({ ...prev, ...initialStates }));
    }
  }, [selectedExercises.length]);

  const handleToggleWaiting = (ingredientId: string) => {
    setIngredientStates((prev) => {
      const current = prev[ingredientId];
      return {
        ...prev,
        [ingredientId]: {
          ...current,
          waitingForDelivery: !current?.waitingForDelivery,
          // If toggling to waiting, and it was 'added', change to 'not_received'
          state: !current?.waitingForDelivery && current?.state === 'added' ? 'not_received' :
                 current?.waitingForDelivery && current?.state === 'not_received' ? 'added' :
                 current?.state // Keep current state if not 'added' or 'not_received'
        },
      };
    });
  };

  const handleProductNameChange = (ingredientId: string, text: string) => {
    setIngredientStates((prev) => ({
      ...prev,
      [ingredientId]: {
        ...prev[ingredientId],
        productName: text,
      },
    }));
  };

  const handleIngredientAdd = (ingredientId: string) => {
    const state = ingredientStates[ingredientId];
    if (!state?.productName?.trim()) {
      Alert.alert('Enter product name', 'Type what you got');
      return;
    }

    setIngredientStates((prev) => ({
      ...prev,
      [ingredientId]: {
        ...prev[ingredientId],
        state: prev[ingredientId]?.waitingForDelivery ? 'not_received' : 'added',
      },
    }));
  };

  const handleIngredientSkip = (ingredientId: string) => {
    setIngredientStates((prev) => ({
      ...prev,
      [ingredientId]: {
        ...prev[ingredientId],
        state: 'skipped',
        productName: '',
        waitingForDelivery: false,
      },
    }));
  };

  const handleIngredientChange = (ingredientId: string) => {
    setIngredientStates((prev) => ({
      ...prev,
      [ingredientId]: {
        ...prev[ingredientId],
        state: 'pending',
        productName: '',
        waitingForDelivery: false,
      },
    }));
  };

  const handleExerciseAdd = (exerciseId: string) => {
    setExerciseStates((prev) => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        state: 'added',
      },
    }));
  };

  const handleExerciseSkip = (exerciseId: string) => {
    setExerciseStates((prev) => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        state: 'skipped',
      },
    }));
  };

  const handleExerciseChange = (exerciseId: string) => {
    setExerciseStates((prev) => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        state: 'pending',
      },
    }));
  };

  const getProgress = () => {
    const ingredientDecisions = Object.values(ingredientStates).filter(
      (state) => state.state === 'added' || state.state === 'skipped' || state.state === 'not_received'
    ).length;
    const exerciseDecisions = Object.values(exerciseStates).filter(
      (state) => state.state === 'added' || state.state === 'skipped'
    ).length;
    const decided = ingredientDecisions + exerciseDecisions;
    const total = selectedIngredients.length + selectedExercises.length;
    return { decided, total };
  };

  const handleStartRoutine = async () => {
    if (!user) return;

    const { decided, total } = getProgress();
    if (decided !== total || total === 0) {
      Alert.alert('Complete all items', 'Please decide on all products and exercises before starting.');
      return;
    }

    // Check if all products are skipped
    const allProductsSkipped = selectedIngredients.every(
      (ing) => ingredientStates[ing.ingredient_id]?.state === 'skipped'
    );

    // Check if everything is skipped
    const allSkipped = allProductsSkipped && selectedExercises.every(
      (ex) => exerciseStates[ex.exercise_id]?.state === 'skipped'
    );

    if (allSkipped) {
      Alert.alert(
        'Empty routine',
        'You have skipped everything. Your routine is empty. Please go back and add at least one item.',
        [{ text: 'Go Back', onPress: () => navigation.goBack() }]
      );
      return;
    }

    if (allProductsSkipped && selectedExercises.length > 0) {
      Alert.alert(
        'Only exercises',
        'You have skipped all products. Your routine will only include exercises. Continue?',
        [
          { text: 'Go Back', style: 'cancel' },
          {
            text: 'Continue',
            onPress: async () => {
              await saveRoutine();
            },
          },
        ]
      );
      return;
    }

    await saveRoutine();
  };

  const saveRoutine = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const ingredientSelections = selectedIngredients.map((ing) => {
        const state = ingredientStates[ing.ingredient_id];
        return {
          ingredient_id: ing.ingredient_id,
          product_name: state?.productName || '',
          state: state?.state || 'skipped',
          waiting_for_delivery: state?.waitingForDelivery || false,
        };
      });

      const exerciseSelections = selectedExercises.map((ex) => {
        const state = exerciseStates[ex.exercise_id];
        return {
          exercise_id: ex.exercise_id,
          state: state?.state || 'skipped',
        };
      });

      await updateDoc(doc(db, 'users', user.uid), {
        routineStarted: true,
        ingredientSelections,
        exerciseSelections,
        routineStartDate: new Date().toISOString(),
      });

      // Initialize notifications
      const { initializeUserNotifications } = require('../services/notificationService');
      await initializeUserNotifications(user.uid);

      // RootNavigator listens to Firestore changes and will automatically
      // switch to AppNavigator when routineStarted becomes true
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start routine');
    } finally {
      setLoading(false);
    }
  };

  const { decided, total } = getProgress();
  const canStart = decided === total && total > 0;

  const renderProblemSection = (problem: Problem) => (
    <View key={problem.problem_id} style={styles.problemSection}>
      <Text style={styles.problemTitle}>{problem.display_name}</Text>
      <Text style={styles.problemParagraph}>{problem.what_it_is}</Text>
      <Text style={styles.problemParagraph}>{problem.what_causes_it}</Text>
      <Text style={styles.solutionTitle}>Solution</Text>
      <Text style={styles.problemParagraph}>{problem.how_to_fix}</Text>
    </View>
  );

  const renderIngredientCard = (ingredient: Ingredient) => {
    const state = ingredientStates[ingredient.ingredient_id] || {
      state: 'pending',
      productName: '',
      waitingForDelivery: false,
    };

    if (state.state === 'added' || state.state === 'not_received') {
      return (
        <View key={ingredient.ingredient_id} style={styles.ingredientCard}>
          <Text style={styles.ingredientName}>{ingredient.display_name}</Text>
          <Text style={styles.ingredientDescription}>{ingredient.short_description}</Text>
          <View style={styles.examplesContainer}>
            <Text style={styles.examplesLabel}>Example brands:</Text>
            {ingredient.example_brands.map((brand, idx) => (
              <Text key={idx} style={styles.exampleText}>• {brand}</Text>
            ))}
          </View>
          {state.state === 'added' ? (
            <View style={styles.addedContainer}>
              <Text style={styles.addedText}>✓ Added: {state.productName}</Text>
              <TouchableOpacity onPress={() => handleIngredientChange(ingredient.ingredient_id)}>
                <Text style={styles.changeText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.notReceivedContainer}>
              <Text style={styles.notReceivedText}>⏳ Waiting for delivery: {state.productName}</Text>
              <TouchableOpacity onPress={() => handleIngredientChange(ingredient.ingredient_id)}>
                <Text style={styles.changeText}>Change</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }

    if (state.state === 'skipped') {
      return (
        <View key={ingredient.ingredient_id} style={styles.ingredientCard}>
          <Text style={styles.ingredientName}>{ingredient.display_name}</Text>
          <Text style={styles.ingredientDescription}>{ingredient.short_description}</Text>
          <View style={styles.examplesContainer}>
            <Text style={styles.examplesLabel}>Example brands:</Text>
            {ingredient.example_brands.map((brand, idx) => (
              <Text key={idx} style={styles.exampleText}>• {brand}</Text>
            ))}
          </View>
          <View style={styles.addedContainer}>
            <Text style={styles.notReceivedText}>Skipped</Text>
            <TouchableOpacity onPress={() => handleIngredientChange(ingredient.ingredient_id)}>
              <Text style={styles.changeText}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View key={ingredient.ingredient_id} style={styles.ingredientCard}>
        <Text style={styles.ingredientName}>{ingredient.display_name}</Text>
        <Text style={styles.ingredientDescription}>{ingredient.short_description}</Text>
        <View style={styles.examplesContainer}>
          <Text style={styles.examplesLabel}>Example brands:</Text>
          {ingredient.example_brands.map((brand, idx) => (
            <Text key={idx} style={styles.exampleText}>• {brand}</Text>
          ))}
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.productInput}
            placeholder="What is name of the product you got?"
            placeholderTextColor={colors.textMuted}
            value={state.productName}
            onChangeText={(text) => handleProductNameChange(ingredient.ingredient_id, text)}
          />
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => handleToggleWaiting(ingredient.ingredient_id)}
          >
            <Text style={styles.checkboxText}>
              {state.waitingForDelivery ? '☑' : '☐'} Will buy / waiting for delivery
            </Text>
          </TouchableOpacity>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.addButton,
                !state.productName?.trim() && styles.buttonDisabled,
              ]}
              onPress={() => handleIngredientAdd(ingredient.ingredient_id)}
              disabled={!state.productName?.trim()}
            >
              <Text style={styles.actionButtonText}>Add to routine</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.skipButton]}
              onPress={() => handleIngredientSkip(ingredient.ingredient_id)}
            >
              <Text style={styles.actionButtonText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderExerciseCard = (exercise: Exercise) => {
    const state = exerciseStates[exercise.exercise_id] || { state: 'pending' };

    if (state.state === 'added') {
      return (
        <View key={exercise.exercise_id} style={styles.exerciseCard}>
          <Text style={styles.exerciseName}>{exercise.display_name}</Text>
          <Text style={styles.exerciseDescription}>{exercise.short_description}</Text>
          <Text style={styles.exerciseDuration}>Duration: {exercise.duration}</Text>
          <View style={styles.addedContainer}>
            <Text style={styles.addedText}>✓ Added</Text>
            <TouchableOpacity onPress={() => handleExerciseChange(exercise.exercise_id)}>
              <Text style={styles.changeText}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (state.state === 'skipped') {
      return (
        <View key={exercise.exercise_id} style={styles.exerciseCard}>
          <Text style={styles.exerciseName}>{exercise.display_name}</Text>
          <Text style={styles.exerciseDescription}>{exercise.short_description}</Text>
          <Text style={styles.exerciseDuration}>Duration: {exercise.duration}</Text>
          <View style={styles.addedContainer}>
            <Text style={styles.notReceivedText}>Skipped</Text>
            <TouchableOpacity onPress={() => handleExerciseChange(exercise.exercise_id)}>
              <Text style={styles.changeText}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View key={exercise.exercise_id} style={styles.exerciseCard}>
        <Text style={styles.exerciseName}>{exercise.display_name}</Text>
        <Text style={styles.exerciseDescription}>{exercise.short_description}</Text>
        <Text style={styles.exerciseDuration}>Duration: {exercise.duration}</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.addButton]}
            onPress={() => handleExerciseAdd(exercise.exercise_id)}
          >
            <Text style={styles.actionButtonText}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.skipButton]}
            onPress={() => handleExerciseSkip(exercise.exercise_id)}
          >
            <Text style={styles.actionButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const problemNamesText = formatProblemNames(selectedProblems);

  // Styles with access to TOP_PADDING_EXTRA
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.lg,
      paddingTop: spacing.xxl + spacing.xxl + spacing.xxl + TOP_PADDING_EXTRA, // Adjust TOP_PADDING_EXTRA constant above to change
    },
    heading: {
      ...typography.heading,
      fontSize: 32, // Bigger than default heading (24)
      marginBottom: spacing.lg,
      textAlign: 'center',
    },
    problemsTitle: {
      ...typography.heading,
      marginBottom: spacing.xl,
      textAlign: 'center',
    },
    timeContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: spacing.md,
    },
    timeLabel: {
      ...typography.label,
      marginRight: spacing.sm,
    },
    timeValue: {
      ...typography.body,
      color: colors.text,
    },
    protocolIntro: {
      ...typography.body,
      color: colors.text,
      marginBottom: spacing.sm,
      lineHeight: 22,
    },
    infoIntro: {
      ...typography.body,
      color: colors.text,
      marginBottom: spacing.xl,
      lineHeight: 22,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.lg,
    },
    section: {
      marginBottom: spacing.md,
    },
    sectionTitle: {
      ...typography.headingSmall,
      marginBottom: spacing.md,
    },
    introText: {
      ...typography.body,
      color: colors.textSecondary,
      marginBottom: spacing.md,
      lineHeight: 22,
    },
    problemSection: {
      marginBottom: spacing.xl,
    },
    problemTitle: {
      ...typography.headingSmall,
      marginBottom: spacing.md,
    },
    problemParagraph: {
      ...typography.body,
      color: colors.text,
      marginBottom: spacing.md,
      lineHeight: 22,
    },
    solutionTitle: {
      ...typography.body,
      fontWeight: '100',
      color: colors.text,
      marginBottom: spacing.xs,
      marginTop: spacing.sm,
    },
    ingredientCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 4,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    ingredientName: {
      ...typography.headingSmall,
      marginBottom: spacing.xs,
    },
    ingredientDescription: {
      ...typography.body,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
      lineHeight: 20,
    },
    examplesContainer: {
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    examplesLabel: {
      ...typography.label,
      marginBottom: spacing.xs,
    },
    exampleText: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    inputContainer: {
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    productInput: {
      ...typography.body,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 4,
      padding: spacing.md,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    checkbox: {
      marginBottom: spacing.sm,
    },
    checkboxText: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    actionButton: {
      flex: 1,
      padding: spacing.md,
      alignItems: 'center',
      borderRadius: 4,
      borderWidth: 1,
    },
    addButton: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    skipButton: {
      backgroundColor: colors.background,
      borderColor: colors.border,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    actionButtonText: {
      ...typography.body,
      fontWeight: '600',
    },
    addedContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    addedText: {
      ...typography.body,
      color: colors.accent,
    },
    changeText: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      textDecorationLine: 'underline',
    },
    notReceivedContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    notReceivedText: {
      ...typography.body,
      color: colors.textSecondary,
    },
    exerciseCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 4,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    exerciseName: {
      ...typography.headingSmall,
      marginBottom: spacing.xs,
    },
    exerciseDescription: {
      ...typography.body,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
      lineHeight: 20,
    },
    exerciseDuration: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },
    progressText: {
      ...typography.body,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    footer: {
      padding: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    startButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 4,
      padding: spacing.md,
      alignItems: 'center',
    },
    startButtonDisabled: {
      opacity: 0.5,
    },
    startButtonText: {
      ...typography.body,
      fontWeight: '600',
    },
    startHint: {
      ...typography.bodySmall,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.heading}>
          Here's your{'\n'}custom plan{'\n'}
        </Text>

        {/* Custom protocol intro */}
        {problemNamesText && (
          <Text style={styles.protocolIntro}>
            You are about to start a protocol focused on {problemNamesText}.
          </Text>
        )}

        {/* Info intro text */}
        {selectedProblems.length > 0 && (
          <Text style={styles.infoIntro}>
            If you follow this protocol, you will see results. Below is some info on the cause of these problems, and how to combat them.
            {'\n'}{'\n'}</Text>
        )}

        {/* Problem Sections */}
        {selectedProblems.length > 0 && (
          <>
            <Text style={styles.problemsTitle}>Your main problems</Text>
            <View style={styles.section}>
              {selectedProblems.map((problem: Problem) => renderProblemSection(problem))}
            </View>
            <View style={styles.divider} />
          </>
        )}

        {/* Products Section */}
        {selectedIngredients.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Here's your shopping list</Text>
            <Text style={styles.introText}>{guideBlocks.static_text.shopping_intro}</Text>
            {selectedIngredients.map((ingredient) => renderIngredientCard(ingredient))}
            <View style={styles.divider} />
          </>
        )}

        {/* Exercises Section */}
        {selectedExercises.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Exercises</Text>
            <Text style={styles.introText}>{guideBlocks.static_text.exercises_intro}</Text>
            {selectedExercises.map((exercise) => renderExerciseCard(exercise))}
            <View style={styles.divider} />
          </>
        )}

        {/* Progress */}
        <Text style={styles.progressText}>
          Progress: {decided}/{total} items decided
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.startButton, (!canStart || loading) && styles.startButtonDisabled]}
          onPress={handleStartRoutine}
          disabled={!canStart || loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.startButtonText}>Start Routine</Text>
          )}
        </TouchableOpacity>
        {!canStart && (
          <Text style={styles.startHint}>(activates when all decided)</Text>
        )}
      </View>
    </View>
  );
}
