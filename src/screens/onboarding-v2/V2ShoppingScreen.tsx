import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colorsV2, typographyV2, spacingV2, borderRadiusV2, gradients, shadows } from '../../constants/themeV2';
import GradientButton from '../../components/v2/GradientButton';
import V2ScreenWrapper from '../../components/v2/V2ScreenWrapper';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useAuth } from '../../contexts/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { buildRoutineFromOnboarding } from '../../utils/buildRoutineFromOnboarding';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useOnboardingTracking } from '../../hooks/useOnboardingTracking';

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
  session?: { premium?: boolean };
}

interface ProductState {
  state: 'pending' | 'active';
  productName?: string;
}

export default function V2ShoppingScreen({ navigation }: any) {
  useOnboardingTracking('v2_shopping');
  const { data, updateData, setOnboardingComplete } = useOnboarding();
  const { user } = useAuth();

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [productStates, setProductStates] = useState<Record<string, ProductState>>({});
  const [showProductNameInput, setShowProductNameInput] = useState(false);
  const [currentIngredientId, setCurrentIngredientId] = useState<string | null>(null);
  const [productNameInput, setProductNameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const anims = useScreenEntrance(4);
  const cardSlide = useState(() => new Animated.Value(0))[0];

  const problems: Problem[] = guideBlocks.problems || [];
  const ingredients: Ingredient[] = guideBlocks.ingredients || [];

  // Load concerns on mount
  useEffect(() => {
    const loadCategories = async () => {
      const fromContext = data.selectedProblems?.length ? data.selectedProblems : data.selectedCategories;

      if (fromContext && fromContext.length > 0) {
        setSelectedCategories(fromContext);
        setLoadingCategories(false);
        return;
      }

      if (!user) {
        setLoadingCategories(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const concerns = userData.concerns || [];
          if (concerns.length > 0) {
            setSelectedCategories(concerns);
          } else {
            Alert.alert('Error', 'Unable to load your selections. Please start over.');
          }
        }
      } catch (error: any) {
        console.error('[V2Shopping] Error loading categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  // Get selected problems
  const selectedProblems = problems.filter((problem: Problem) =>
    selectedCategories.includes(problem.problem_id)
  );

  // Get all unique ingredient IDs
  const ingredientIds = Array.from(
    new Set(
      selectedProblems.flatMap((problem: Problem) => problem.recommended_ingredients || [])
    )
  );

  const isPremiumIngredient = (ing: any): boolean => ing?.session?.premium === true;

  let selectedIngredients = ingredientIds
    .map((id) => ingredients.find((ing: Ingredient) => ing.ingredient_id === id))
    .filter((ing): ing is Ingredient => ing !== undefined && !isPremiumIngredient(ing))
    .sort((a, b) => a.routine_order - b.routine_order);

  // BHA/AHA rule
  const hasBHA = selectedIngredients.some(ing => ing.ingredient_id === 'salicylic_acid');
  const hasAHA = selectedIngredients.some(ing => ing.ingredient_id === 'aha');
  if (hasBHA && hasAHA) {
    selectedIngredients = selectedIngredients.filter(ing => ing.ingredient_id !== 'aha');
  }

  // Get exercises
  const exerciseIds = Array.from(
    new Set(
      selectedProblems.flatMap((problem: Problem) => problem.recommended_exercises || [])
    )
  );
  const exercises = exerciseIds.map((id) => ({
    exercise_id: id,
    display_name: guideBlocks.exercises?.find((ex: any) => ex.exercise_id === id)?.display_name || id,
    state: 'added' as const,
  }));

  // Initialize product states
  useEffect(() => {
    if (selectedCategories.length === 0) return;

    const initialStates: Record<string, ProductState> = {};
    selectedIngredients.forEach((ingredient) => {
      if (!productStates[ingredient.ingredient_id]) {
        initialStates[ingredient.ingredient_id] = { state: 'pending' };
      }
    });

    if (Object.keys(initialStates).length > 0) {
      setProductStates((prev) => ({ ...prev, ...initialStates }));
    }
  }, [selectedIngredients.length, selectedCategories.length]);

  const totalCards = selectedIngredients.length;

  const handleComplete = useCallback(async () => {
    if (hasCompleted) return;
    setLoading(true);
    setHasCompleted(true);

    try {
      // Build shopping selections for context
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

      // Update context with shopping selections
      updateData({ shoppingSelections });

      // Build final routine and save to Firestore
      if (user?.uid) {
        const updatedData = { ...data, shoppingSelections };
        const { ingredientSelections, exerciseSelections } = buildRoutineFromOnboarding(updatedData);

        await updateDoc(doc(db, 'users', user.uid), {
          routineStarted: true,
          ingredientSelections,
          exerciseSelections,
          routineStartDate: new Date().toISOString(),
        });
      }

      // Complete onboarding - this triggers RootNavigator to show the app
      setOnboardingComplete(true);
    } catch (error: any) {
      console.error('[V2Shopping] Error completing:', error);
      Alert.alert('Error', error.message || 'Failed to start routine');
      setLoading(false);
      setHasCompleted(false);
    }
  }, [user, hasCompleted, selectedIngredients, exercises, productStates, data, updateData, setOnboardingComplete]);

  // Auto-complete if no ingredients
  useEffect(() => {
    if (!loadingCategories && totalCards === 0 && !loading && !hasCompleted) {
      handleComplete();
    }
  }, [loadingCategories, totalCards, loading, hasCompleted, handleComplete]);

  // Loading state
  if (loadingCategories || totalCards === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colorsV2.accentOrange} />
        <Text style={styles.loadingText}>Preparing your products...</Text>
      </View>
    );
  }

  const currentIngredient = selectedIngredients[currentCardIndex];
  if (!currentIngredient) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colorsV2.accentOrange} />
      </View>
    );
  }

  const handleIHaveThis = (ingredientId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentIngredientId(ingredientId);
    setProductNameInput('');
    setShowProductNameInput(true);
  };

  const handleWillGetIt = (ingredientId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProductStates((prev) => ({
      ...prev,
      [ingredientId]: { state: 'pending' },
    }));
    animateToNextCard();
  };

  const handleProductNameSubmit = () => {
    if (!currentIngredientId || !productNameInput.trim()) {
      Alert.alert('Enter product name', 'Type what you got');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    animateToNextCard();
  };

  const animateToNextCard = () => {
    if (currentCardIndex < totalCards - 1) {
      // Slide out left, then slide in from right
      Animated.timing(cardSlide, {
        toValue: -30,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setCurrentCardIndex(prev => prev + 1);
        cardSlide.setValue(30);
        Animated.spring(cardSlide, {
          toValue: 0,
          tension: 120,
          friction: 12,
          useNativeDriver: true,
        }).start();
      });
    } else {
      handleComplete();
    }
  };

  return (
    <View style={styles.container}>
      <V2ScreenWrapper showProgress={false} scrollable={false}>
        <View style={styles.centerContent}>
          {/* Header */}
          <Animated.View style={[styles.headerContainer, { opacity: anims[0].opacity, transform: anims[0].transform }]}>
            <Text style={styles.label}>GET YOUR PRODUCTS</Text>
            <Text style={styles.headline}>Products You'll Need</Text>
            <Text style={styles.subtitle}>
              Pick any product that contains these ingredients. Available wherever you buy skincare.
            </Text>
          </Animated.View>

          {/* Progress */}
          <Animated.View style={[styles.progressContainer, { opacity: anims[1].opacity, transform: anims[1].transform }]}>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${((currentCardIndex + 1) / totalCards) * 100}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              {currentCardIndex + 1} of {totalCards}
            </Text>
          </Animated.View>

          {/* Ingredient Card */}
          <Animated.View
            style={[
              styles.ingredientCard,
              {
                opacity: anims[2].opacity,
                transform: [
                  ...anims[2].transform,
                  { translateX: cardSlide },
                ],
              },
            ]}
          >
            <View style={styles.ingredientHeader}>
              <View style={styles.ingredientBadge}>
                <Text style={styles.ingredientBadgeText}>INGREDIENT</Text>
              </View>
            </View>

            <Text style={styles.ingredientName}>
              {currentIngredient.display_name}
            </Text>

            <Text style={styles.ingredientDescription}>
              {currentIngredient.short_description}
            </Text>

            <View style={styles.divider} />

            <Text style={styles.examplesLabel}>EXAMPLE PRODUCTS</Text>
            <ScrollView style={styles.examplesScroll} nestedScrollEnabled>
              {currentIngredient.example_brands.map((brand, idx) => (
                <View key={idx} style={styles.exampleRow}>
                  <View style={styles.exampleDot} />
                  <Text style={styles.exampleText}>{brand}</Text>
                </View>
              ))}
            </ScrollView>
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View style={[styles.actionsContainer, { opacity: anims[3].opacity, transform: anims[3].transform }]}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleIHaveThis(currentIngredient.ingredient_id)}
              activeOpacity={0.8}
            >
              <View style={styles.actionButtonInner}>
                <Text style={styles.actionButtonIcon}>✓</Text>
                <Text style={styles.actionButtonText}>I have this</Text>
              </View>
            </TouchableOpacity>

            <GradientButton
              title="Will get it"
              onPress={() => handleWillGetIt(currentIngredient.ingredient_id)}
            />
          </Animated.View>
        </View>
      </V2ScreenWrapper>

      {/* Product Name Modal */}
      <Modal
        visible={showProductNameInput}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowProductNameInput(false);
          setCurrentIngredientId(null);
          setProductNameInput('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>What product do you have?</Text>
            <Text style={styles.modalSubtitle}>Enter the name so we can track it in your routine</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="e.g. CeraVe SA Cleanser"
              placeholderTextColor={colorsV2.textMuted}
              value={productNameInput}
              onChangeText={setProductNameInput}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleProductNameSubmit}
            />

            <GradientButton
              title="Continue"
              onPress={handleProductNameSubmit}
              disabled={!productNameInput.trim()}
            />

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => {
                setShowProductNameInput(false);
                setCurrentIngredientId(null);
                setProductNameInput('');
              }}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colorsV2.accentOrange} />
          <Text style={styles.loadingOverlayText}>Setting up your protocol...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorsV2.background,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colorsV2.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacingV2.md,
  },
  loadingText: {
    ...typographyV2.bodySmall,
    color: colorsV2.textSecondary,
  },

  // Header
  headerContainer: {
    marginTop: spacingV2.xl,
    marginBottom: spacingV2.lg,
  },
  label: {
    ...typographyV2.label,
    color: colorsV2.accentOrange,
    textAlign: 'center',
    marginBottom: spacingV2.sm,
    letterSpacing: 1.5,
  },
  headline: {
    ...typographyV2.hero,
    textAlign: 'center',
    marginBottom: spacingV2.sm,
  },
  subtitle: {
    ...typographyV2.body,
    color: colorsV2.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Progress
  progressContainer: {
    marginBottom: spacingV2.lg,
  },
  progressBar: {
    height: 6,
    backgroundColor: colorsV2.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacingV2.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    ...typographyV2.caption,
    color: colorsV2.textMuted,
    textAlign: 'center',
  },

  // Ingredient Card
  ingredientCard: {
    backgroundColor: colorsV2.surface,
    borderRadius: borderRadiusV2.xl,
    borderWidth: 1,
    borderColor: colorsV2.border,
    padding: spacingV2.lg,
    marginBottom: spacingV2.lg,
    ...shadows.card,
  },
  ingredientHeader: {
    marginBottom: spacingV2.md,
  },
  ingredientBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colorsV2.accentOrange + '18',
    borderRadius: borderRadiusV2.sm,
    paddingHorizontal: spacingV2.sm + 2,
    paddingVertical: spacingV2.xs,
  },
  ingredientBadgeText: {
    ...typographyV2.caption,
    color: colorsV2.accentOrange,
    fontWeight: '700',
    letterSpacing: 1,
  },
  ingredientName: {
    ...typographyV2.heading,
    marginBottom: spacingV2.sm,
  },
  ingredientDescription: {
    ...typographyV2.body,
    color: colorsV2.textSecondary,
    lineHeight: 22,
    marginBottom: spacingV2.md,
  },
  divider: {
    height: 1,
    backgroundColor: colorsV2.border,
    marginBottom: spacingV2.md,
  },
  examplesLabel: {
    ...typographyV2.label,
    color: colorsV2.textMuted,
    marginBottom: spacingV2.sm,
    letterSpacing: 1,
  },
  examplesScroll: {
    maxHeight: 120,
  },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacingV2.sm,
  },
  exampleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colorsV2.accentPurple,
    marginRight: spacingV2.sm,
  },
  exampleText: {
    ...typographyV2.bodySmall,
    color: colorsV2.textSecondary,
  },

  // Actions
  actionsContainer: {
    gap: spacingV2.sm,
    marginBottom: spacingV2.xl,
  },
  actionButton: {
    backgroundColor: colorsV2.surface,
    borderWidth: 1.5,
    borderColor: colorsV2.border,
    borderRadius: borderRadiusV2.pill,
    paddingVertical: 16,
    paddingHorizontal: spacingV2.xl,
  },
  actionButtonInner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacingV2.sm,
  },
  actionButtonIcon: {
    color: colorsV2.success,
    fontSize: 16,
    fontWeight: '700',
  },
  actionButtonText: {
    ...typographyV2.body,
    fontWeight: '600',
    color: colorsV2.textPrimary,
    fontSize: 17,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacingV2.lg,
  },
  modalContent: {
    backgroundColor: colorsV2.surface,
    borderRadius: borderRadiusV2.xl,
    borderWidth: 1,
    borderColor: colorsV2.border,
    padding: spacingV2.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    ...typographyV2.heading,
    textAlign: 'center',
    marginBottom: spacingV2.xs,
  },
  modalSubtitle: {
    ...typographyV2.bodySmall,
    color: colorsV2.textSecondary,
    textAlign: 'center',
    marginBottom: spacingV2.lg,
  },
  modalInput: {
    ...typographyV2.body,
    backgroundColor: colorsV2.background,
    borderWidth: 1,
    borderColor: colorsV2.border,
    borderRadius: borderRadiusV2.md,
    padding: spacingV2.md,
    color: colorsV2.textPrimary,
    marginBottom: spacingV2.lg,
  },
  modalCancel: {
    alignItems: 'center',
    marginTop: spacingV2.md,
    paddingVertical: spacingV2.sm,
  },
  modalCancelText: {
    ...typographyV2.bodySmall,
    color: colorsV2.textMuted,
  },

  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacingV2.md,
  },
  loadingOverlayText: {
    ...typographyV2.body,
    color: colorsV2.textSecondary,
  },
});
