import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import { colors, typography, spacing, MONOSPACE_FONT } from '../../constants/theme';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
const guideBlocks = require('../../data/guide_blocks.json');

interface Problem {
  problem_id: string;
  display_name: string;
  recommended_ingredients: string[];
  recommended_exercises: string[];
}

interface Ingredient {
  ingredient_id: string;
  display_name: string;
  routine_order: number;
  short_description: string;
  example_brands: string[];
  timing_options?: string[];
  timing_flexible?: boolean;
}

interface Exercise {
  exercise_id: string;
  display_name: string;
  state: 'added' | 'skipped';
}

interface ProductState {
  state: 'pending' | 'active';
  productName?: string;
}

export default function ShoppingScreen({ navigation }: any) {
  const { data } = useOnboarding();
  const { user } = useAuth();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [productStates, setProductStates] = useState<Record<string, ProductState>>({});
  const [showProductNameInput, setShowProductNameInput] = useState(false);
  const [currentIngredientId, setCurrentIngredientId] = useState<string | null>(null);
  const [productNameInput, setProductNameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  // Load guide blocks data
  const problems: Problem[] = guideBlocks.problems || [];
  const ingredients: Ingredient[] = guideBlocks.ingredients || [];

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
  const exercises: Exercise[] = exerciseIds.map((id) => ({
    exercise_id: id,
    display_name: guideBlocks.exercises?.find((ex: any) => ex.exercise_id === id)?.display_name || id,
    state: 'added', // Default to added for exercises
  }));

  // Initialize product states
  useEffect(() => {
    const initialStates: Record<string, ProductState> = {};
    selectedIngredients.forEach((ingredient) => {
      if (!productStates[ingredient.ingredient_id]) {
        initialStates[ingredient.ingredient_id] = {
          state: 'pending',
        };
      }
    });
    if (Object.keys(initialStates).length > 0) {
      setProductStates((prev) => ({ ...prev, ...initialStates }));
    }
  }, [selectedIngredients.length]);

  const totalCards = selectedIngredients.length;

  // If no ingredients, complete immediately
  useEffect(() => {
    if (totalCards === 0 && !loading && !hasCompleted) {
      setHasCompleted(true);
      handleComplete();
    }
  }, [totalCards, loading, hasCompleted]);

  if (totalCards === 0) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  const currentIngredient = selectedIngredients[currentCardIndex];
  const progressText = `${currentCardIndex + 1}/${totalCards}`;

  // Get timing text for ingredient
  const getTimingText = (ingredient: Ingredient): string => {
    if (!ingredient.timing_options || ingredient.timing_options.length === 0) {
      return 'routine';
    }
    if (ingredient.timing_options.length === 1) {
      return `${ingredient.timing_options[0]} routine`;
    }
    return 'routine';
  };

  const handleIHaveThis = (ingredientId: string) => {
    setCurrentIngredientId(ingredientId);
    setProductNameInput('');
    setShowProductNameInput(true);
  };

  const handleWillGetIt = (ingredientId: string) => {
    setProductStates((prev) => ({
      ...prev,
      [ingredientId]: {
        state: 'pending',
      },
    }));
    moveToNextCard();
  };

  const handleProductNameSubmit = () => {
    if (!currentIngredientId || !productNameInput.trim()) {
      Alert.alert('Enter product name', 'Type what you got');
      return;
    }

    setProductStates((prev) => ({
      ...prev,
      [currentIngredientId]: {
        state: 'active',
        productName: productNameInput.trim(),
      },
    }));

    setShowProductNameInput(false);
    setCurrentIngredientId(null);
    setProductNameInput('');
    moveToNextCard();
  };

  const moveToNextCard = () => {
    if (currentCardIndex < totalCards - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      // All cards done, save and proceed
      handleComplete();
    }
  };

  const handleComplete = async () => {
    if (!user || hasCompleted) return;

    setLoading(true);
    setHasCompleted(true);
    try {
      const ingredientSelections = selectedIngredients.map((ing) => {
        const state = productStates[ing.ingredient_id];
        return {
          ingredient_id: ing.ingredient_id,
          product_name: state?.state === 'active' ? (state.productName || '') : '',
          state: state?.state === 'active' ? 'active' : 'pending',
          waiting_for_delivery: false,
        };
      });

      const exerciseSelections = exercises.map((ex) => ({
        exercise_id: ex.exercise_id,
        state: ex.state,
      }));

      await updateDoc(doc(db, 'users', user.uid), {
        routineStarted: true,
        ingredientSelections,
        exerciseSelections,
        routineStartDate: new Date().toISOString(),
      });

      // Initialize notifications
      const { initializeUserNotifications } = require('../../services/notificationService');
      await initializeUserNotifications(user.uid);

      // RootNavigator listens to Firestore changes and will automatically
      // switch to AppNavigator when routineStarted becomes true
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start routine');
      setLoading(false);
    }
  };

  if (!currentIngredient) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  const timingText = getTimingText(currentIngredient);

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>{progressText}</Text>
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>Get your products</Text>
        </View>

        <View style={styles.reassuranceContainer}>
          <Text style={styles.reassuranceText}>
            We'll show you the ingredients your routine needs. Pick any product that contains them.
          </Text>
          <Text style={styles.reassuranceText}>
          {'\n'}Available wherever you buy skincare.
          </Text>
        </View>

        <View style={styles.divider} />

        <ScrollView style={styles.cardContent} contentContainerStyle={styles.cardContentInner}>
          <Text style={styles.ingredientName}>{currentIngredient.display_name.toUpperCase()}</Text>
          
          <Text style={styles.ingredientDescription}>{currentIngredient.short_description}</Text>
          
          <Text style={styles.timingText}>Used in your {timingText}.</Text>

          <View style={styles.examplesContainer}>
            <Text style={styles.examplesLabel}>Examples:</Text>
            {currentIngredient.example_brands.map((brand, idx) => (
              <Text key={idx} style={styles.exampleText}>• {brand}</Text>
            ))}
          </View>
        </ScrollView>

        <View style={styles.divider} />

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.haveButton]}
            onPress={() => handleIHaveThis(currentIngredient.ingredient_id)}
          >
            <Text style={styles.actionButtonText}>I have this</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.willGetButton]}
            onPress={() => handleWillGetIt(currentIngredient.ingredient_id)}
          >
            <Text style={styles.actionButtonText}>Will get it</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Product Name Input Modal */}
      <Modal
        visible={showProductNameInput}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowProductNameInput(false);
          setCurrentIngredientId(null);
          setProductNameInput('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>What product did you get?</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter product name"
              placeholderTextColor={colors.textMuted}
              value={productNameInput}
              onChangeText={setProductNameInput}
              autoFocus={true}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleProductNameSubmit}
                disabled={!productNameInput.trim()}
              >
                <Text style={[styles.modalButtonText, !productNameInput.trim() && styles.modalButtonTextDisabled]}>
                  Continue
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.lg,
  },
  progressContainer: {
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  progressText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  titleContainer: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.heading,
    fontSize: 28,
    textAlign: 'center',
    color: colors.text,
  },
  reassuranceContainer: {
    marginBottom: spacing.lg,
  },
  reassuranceText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  cardContent: {
    maxHeight: 400,
  },
  cardContentInner: {
    paddingVertical: spacing.sm,
  },
  ingredientName: {
    ...typography.headingSmall,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  ingredientDescription: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  timingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  examplesContainer: {
    marginTop: spacing.md,
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
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 1,
  },
  haveButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  willGetButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  actionButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    ...typography.headingSmall,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalInput: {
    ...typography.body,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  modalButtons: {
    alignItems: 'center',
  },
  modalButton: {
    padding: spacing.md,
    borderRadius: 4,
    minWidth: 200,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  modalButtonTextDisabled: {
    opacity: 0.5,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

