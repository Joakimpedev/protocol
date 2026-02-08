import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import { colors, typography, spacing, MONOSPACE_FONT } from '../../constants/theme';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useDevMode } from '../../contexts/DevModeContext';
import { useResponsive } from '../../utils/responsive';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboardingTracking, ONBOARDING_SCREENS } from '../../hooks/useOnboardingTracking';
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
  useOnboardingTracking(ONBOARDING_SCREENS.SHOPPING);
  const { data, updateData } = useOnboarding();
  const { user } = useAuth();
  const { isDevModeEnabled, clearForceFlags } = useDevMode();
  const responsive = useResponsive();

  // Listen for navigation events to catch what's causing the unmount
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      console.log('[ShoppingScreen] 🚨 NAVIGATION BEFORE REMOVE EVENT 🚨');
      console.log('[ShoppingScreen] Action:', e.data.action);
      console.log('[ShoppingScreen] Preventing:', e.preventDefault ? 'yes' : 'no');
    });

    return unsubscribe;
  }, [navigation]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [productStates, setProductStates] = useState<Record<string, ProductState>>({});
  const [showProductNameInput, setShowProductNameInput] = useState(false);
  const [currentIngredientId, setCurrentIngredientId] = useState<string | null>(null);
  const [productNameInput, setProductNameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Load guide blocks data
  const problems: Problem[] = guideBlocks.problems || [];
  const ingredients: Ingredient[] = guideBlocks.ingredients || [];

  // Load concerns: prefer 27-page flow (selectedProblems), then selectedCategories, then Firestore
  // This should only run ONCE on mount, not re-run when context changes
  useEffect(() => {
    console.log('[ShoppingScreen] COMPONENT MOUNTED');

    const loadCategoriesAndProgress = async () => {
      console.log('[ShoppingScreen] Loading categories...');
      console.log('[ShoppingScreen] data.selectedProblems:', data.selectedProblems);
      console.log('[ShoppingScreen] data.selectedCategories:', data.selectedCategories);

      const fromContext = data.selectedProblems?.length ? data.selectedProblems : data.selectedCategories;
      console.log('[ShoppingScreen] fromContext:', fromContext);

      if (fromContext && fromContext.length > 0) {
        console.log('[ShoppingScreen] Using context data:', fromContext);
        setSelectedCategories(fromContext);
        setLoadingCategories(false);
        return;
      }
      if (!user) {
        setLoadingCategories(false);
        return;
      }

      try {
        // Load from Firestore (for app restart scenario)
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const concerns = userData.concerns || [];
          if (concerns.length > 0) {
            setSelectedCategories(concerns);
          } else {
            // No concerns found - this shouldn't happen if user is on Shopping screen
            // But handle gracefully by going back
            Alert.alert('Error', 'Unable to load your selections. Please start over.');
            navigation.navigate('Welcome');
          }
        } else {
          Alert.alert('Error', 'User data not found. Please start over.');
          navigation.navigate('Welcome');
        }
      } catch (error: any) {
        console.error('Error loading categories:', error);
        Alert.alert('Error', 'Failed to load your selections. Please try again.');
        navigation.navigate('Welcome');
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategoriesAndProgress();

    // Cleanup function runs when component unmounts
    return () => {
      console.log('[ShoppingScreen] COMPONENT UNMOUNTING!!!');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Get selected problems based on user's categories
  const selectedProblems = problems.filter((problem: Problem) =>
    selectedCategories.includes(problem.problem_id)
  );
  console.log('[ShoppingScreen] selectedProblems:', selectedProblems.map(p => p.problem_id));

  // Get all unique ingredient IDs from selected problems
  const ingredientIds = Array.from(
    new Set(
      selectedProblems.flatMap((problem: Problem) => problem.recommended_ingredients || [])
    )
  );
  console.log('[ShoppingScreen] ingredientIds:', ingredientIds);

  // Helper to check if ingredient is premium (for free users, hide premium ingredients)
  const isPremiumIngredient = (ing: any): boolean => {
    return ing?.session?.premium === true;
  };

  // Get ingredients sorted by routine_order, excluding premium ingredients
  let selectedIngredients = ingredientIds
    .map((id) => ingredients.find((ing: Ingredient) => ing.ingredient_id === id))
    .filter((ing): ing is Ingredient => ing !== undefined && !isPremiumIngredient(ing))
    .sort((a, b) => a.routine_order - b.routine_order);
  console.log('[ShoppingScreen] selectedIngredients (after premium filter):', selectedIngredients.map(i => i.ingredient_id));

  // Rule: If both BHA (salicylic_acid) and AHA are present, remove AHA (keep BHA)
  const hasBHA = selectedIngredients.some(ing => ing.ingredient_id === 'salicylic_acid');
  const hasAHA = selectedIngredients.some(ing => ing.ingredient_id === 'aha');

  if (hasBHA && hasAHA) {
    selectedIngredients = selectedIngredients.filter(ing => ing.ingredient_id !== 'aha');
    console.log('[ShoppingScreen] Removed AHA (BHA present)');
  }
  console.log('[ShoppingScreen] Final selectedIngredients:', selectedIngredients.map(i => i.ingredient_id));
  console.log('[ShoppingScreen] totalCards:', selectedIngredients.length);

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
    if (selectedCategories.length === 0) return; // Wait for categories to load
    
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
  }, [selectedIngredients.length, selectedCategories.length]);

  const totalCards = selectedIngredients.length;

  // 27-page flow: we came from ProtocolOverview; save to context and go to Page 18
  const is27PageFlow = (data.selectedProblems?.length ?? 0) > 0;

  // Define handleComplete early so it can be used in useEffect
  const handleComplete = useCallback(async () => {
    console.log('[ShoppingScreen] handleComplete called!', { hasCompleted, is27PageFlow });
    if (hasCompleted) {
      console.log('[ShoppingScreen] Already completed, returning');
      return;
    }

    setLoading(true);
    setHasCompleted(true);

    if (is27PageFlow) {
      console.log('[ShoppingScreen] 27-page flow, navigating to WhyThisWorks');
      const shoppingSelections: Record<string, string> = {};
      selectedIngredients.forEach((ing) => {
        const state = productStates[ing.ingredient_id];
        if (state?.state === 'active' && state.productName) {
          shoppingSelections[ing.ingredient_id] = `owned:${state.productName}`;
        } else if (state?.state === 'pending') {
          shoppingSelections[ing.ingredient_id] = 'pending';
        } else {
          shoppingSelections[ing.ingredient_id] = 'skipped';
        }
      });
      exercises.forEach((ex) => {
        shoppingSelections[`ex_${ex.exercise_id}`] = ex.state === 'added' ? 'added' : 'skipped';
      });
      updateData({ shoppingSelections });
      setLoading(false);
      navigation.navigate('WhyThisWorks');
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

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

      if (isDevModeEnabled) await clearForceFlags();

      const { initializeUserNotifications } = require('../../services/notificationService');
      await initializeUserNotifications(user.uid);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start routine');
      setLoading(false);
    }
  }, [user, hasCompleted, selectedIngredients, exercises, productStates, is27PageFlow, updateData, navigation]);

  // If no ingredients, complete immediately
  useEffect(() => {
    console.log('[ShoppingScreen] Auto-complete check:', { loadingCategories, totalCards, loading, hasCompleted });
    if (!loadingCategories && totalCards === 0 && !loading && !hasCompleted) {
      console.log('[ShoppingScreen] AUTO-COMPLETING (no ingredients)');
      setHasCompleted(true);
      handleComplete();
    }
  }, [loadingCategories, totalCards, loading, hasCompleted, handleComplete]);

  // Show loading while fetching categories
  if (loadingCategories) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

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

  if (!currentIngredient) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  const timingText = getTimingText(currentIngredient);

  console.log('[ShoppingScreen] RENDERING UI - currentCard:', currentCardIndex + 1, 'of', totalCards);

  return (
    <View style={[styles.container, { padding: responsive.safeHorizontalPadding }]}>
      <View style={[styles.cardContainer, { padding: responsive.sz(24), maxWidth: responsive.sz(400) }]}>
        <View style={styles.progressContainer}>
          <Text style={[styles.progressText, { fontSize: responsive.font(16) }]}>{progressText}</Text>
        </View>

        <View style={styles.titleContainer}>
          <Text style={[styles.title, { fontSize: responsive.font(28) }]}>Get your products</Text>
        </View>

        <View style={styles.reassuranceContainer}>
          <Text style={[styles.reassuranceText, { fontSize: responsive.font(16) }]}>
            We'll show you the ingredients your routine needs. Pick any product that contains them.
          </Text>
          <Text style={[styles.reassuranceText, { fontSize: responsive.font(16) }]}>
          {'\n'}Available wherever you buy skincare.
          </Text>
        </View>

        <View style={styles.divider} />

        <ScrollView style={[styles.cardContent, { maxHeight: responsive.sz(400) }]} contentContainerStyle={styles.cardContentInner}>
          <Text style={[styles.ingredientName, { fontSize: responsive.font(18) }]}>{currentIngredient.display_name.toUpperCase()}</Text>
          
          <Text style={[styles.ingredientDescription, { fontSize: responsive.font(16) }]}>{currentIngredient.short_description}</Text>
          
          <Text style={[styles.timingText, { fontSize: responsive.font(16) }]}>Used in your {timingText}.</Text>

          <View style={styles.examplesContainer}>
            <Text style={[styles.examplesLabel, { fontSize: responsive.font(12) }]}>Examples:</Text>
            {currentIngredient.example_brands.map((brand, idx) => (
              <Text key={idx} style={[styles.exampleText, { fontSize: responsive.font(14) }]}>• {brand}</Text>
            ))}
          </View>
        </ScrollView>

        <View style={styles.divider} />

        <View style={[styles.actionButtons, { gap: responsive.sz(8) }]}>
          <TouchableOpacity
            style={[styles.actionButton, styles.haveButton, { padding: responsive.sz(16), minHeight: responsive.sz(44) }]}
            onPress={() => handleIHaveThis(currentIngredient.ingredient_id)}
          >
            <Text style={[styles.actionButtonText, { fontSize: responsive.font(16) }]}>I have this</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.willGetButton, { padding: responsive.sz(16), minHeight: responsive.sz(44) }]}
            onPress={() => handleWillGetIt(currentIngredient.ingredient_id)}
          >
            <Text style={[styles.actionButtonText, { fontSize: responsive.font(16) }]}>Will get it</Text>
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
        <View style={[styles.modalOverlay, { padding: responsive.safeHorizontalPadding }]}>
          <View style={[styles.modalContent, { padding: responsive.sz(24), maxWidth: responsive.sz(400) }]}>
            <Text style={[styles.modalTitle, { fontSize: responsive.font(18) }]}>What product did you get?</Text>
            <TextInput
              style={[styles.modalInput, { padding: responsive.sz(16), fontSize: responsive.font(16) }]}
              placeholder="Enter product name"
              placeholderTextColor={colors.textMuted}
              value={productNameInput}
              onChangeText={setProductNameInput}
              autoFocus={true}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary, { padding: responsive.sz(16), minHeight: responsive.sz(44), minWidth: responsive.sz(200) }]}
                onPress={handleProductNameSubmit}
                disabled={!productNameInput.trim()}
              >
                <Text style={[styles.modalButtonText, { fontSize: responsive.font(16) }, !productNameInput.trim() && styles.modalButtonTextDisabled]}>
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
    // padding is set dynamically
  },
  cardContainer: {
    width: '100%',
    // maxWidth and padding are set dynamically
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  progressContainer: {
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  progressText: {
    fontFamily: 'System',
    color: colors.textSecondary,
    textAlign: 'center',
    // fontSize is set dynamically
  },
  titleContainer: {
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: MONOSPACE_FONT,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.text,
    // fontSize is set dynamically
  },
  reassuranceContainer: {
    marginBottom: spacing.lg,
  },
  reassuranceText: {
    fontFamily: 'System',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xs,
    // fontSize is set dynamically
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
    fontFamily: MONOSPACE_FONT,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
    // fontSize is set dynamically
  },
  ingredientDescription: {
    fontFamily: 'System',
    color: colors.text,
    marginBottom: spacing.sm,
    lineHeight: 22,
    // fontSize is set dynamically
  },
  timingText: {
    fontFamily: 'System',
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontStyle: 'italic',
    // fontSize is set dynamically
  },
  examplesContainer: {
    marginTop: spacing.md,
  },
  examplesLabel: {
    fontFamily: 'System',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    // fontSize is set dynamically
  },
  exampleText: {
    fontFamily: 'System',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    // fontSize is set dynamically
  },
  actionButtons: {
    flexDirection: 'row',
    // gap is set dynamically
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    // padding and minHeight are set dynamically
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
    fontFamily: 'System',
    fontWeight: '600',
    color: colors.text,
    // fontSize is set dynamically
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    // padding is set dynamically
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    // padding and maxWidth are set dynamically
    width: '100%',
  },
  modalTitle: {
    fontFamily: MONOSPACE_FONT,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
    // fontSize is set dynamically
  },
  modalInput: {
    fontFamily: 'System',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    // padding and fontSize are set dynamically
    color: colors.text,
    marginBottom: spacing.lg,
  },
  modalButtons: {
    alignItems: 'center',
  },
  modalButton: {
    // padding, minHeight, and minWidth are set dynamically
    borderRadius: 4,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtonText: {
    fontFamily: 'System',
    fontWeight: '600',
    color: colors.text,
    // fontSize is set dynamically
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

