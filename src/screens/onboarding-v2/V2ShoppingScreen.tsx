import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { colorsV2, typographyV2, spacingV2, borderRadiusV2 } from '../../constants/themeV2';
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
  used_for?: string[];
  timing_options?: string[];
  timing_flexible?: boolean;
  session?: { premium?: boolean };
}

// Concise user-facing benefit per ingredient
const BENEFIT_LINES: Record<string, string> = {
  salicylic_acid: 'Clears pores and fights breakouts',
  hyaluronic_acid: 'Deep hydration for plumper, smoother skin',
  snail_mucin: 'Repairs and hydrates without clogging pores',
  benzoyl_peroxide: 'Kills acne-causing bacteria fast',
  aha: 'Smooths texture and evens skin tone',
  retinol: 'Reduces fine lines and boosts cell turnover',
  vitamin_c: 'Brightens dark spots and protects from damage',
  niacinamide: 'Controls oil, minimizes pores, calms redness',
  caffeine_solution: 'Reduces puffiness and dark circles',
  minoxidil: 'Stimulates thicker facial hair growth',
};

export default function V2ShoppingScreen({ navigation }: any) {
  useOnboardingTracking('v2_shopping');
  const { data, updateData, setOnboardingComplete } = useOnboarding();
  const { user } = useAuth();

  const [checkedProducts, setCheckedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const anims = useScreenEntrance(3);

  const problems: Problem[] = guideBlocks.problems || [];
  const ingredients: Ingredient[] = guideBlocks.ingredients || [];

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

  const selectedProblems = problems.filter((problem: Problem) =>
    selectedCategories.includes(problem.problem_id)
  );

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

  const hasBHA = selectedIngredients.some(ing => ing.ingredient_id === 'salicylic_acid');
  const hasAHA = selectedIngredients.some(ing => ing.ingredient_id === 'aha');
  if (hasBHA && hasAHA) {
    selectedIngredients = selectedIngredients.filter(ing => ing.ingredient_id !== 'aha');
  }

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

  useEffect(() => {
    if (selectedCategories.length === 0 || initialized) return;

    const allChecked = new Set<string>();
    selectedIngredients.forEach((ing) => {
      allChecked.add(ing.ingredient_id);
    });
    setCheckedProducts(allChecked);
    setInitialized(true);
  }, [selectedIngredients.length, selectedCategories.length, initialized]);

  const totalCards = selectedIngredients.length;

  const toggleProduct = (ingredientId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCheckedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ingredientId)) {
        newSet.delete(ingredientId);
      } else {
        newSet.add(ingredientId);
      }
      return newSet;
    });
  };

  const handleComplete = useCallback(async () => {
    if (hasCompleted) return;
    setLoading(true);
    setHasCompleted(true);

    try {
      const shoppingSelections: Record<string, string> = {};
      selectedIngredients.forEach((ing) => {
        if (checkedProducts.has(ing.ingredient_id)) {
          shoppingSelections[ing.ingredient_id] = 'pending';
        } else {
          shoppingSelections[ing.ingredient_id] = 'skipped';
        }
      });
      exercises.forEach((ex) => {
        shoppingSelections[`ex_${ex.exercise_id}`] = ex.state === 'added' ? 'added' : 'skipped';
      });

      updateData({ shoppingSelections });

      if (user?.uid) {
        const updatedData = { ...data, shoppingSelections };
        const { ingredientSelections, exerciseSelections } = buildRoutineFromOnboarding(updatedData);

        const selectedHabits = data.selectedHabits || [];

        await updateDoc(doc(db, 'users', user.uid), {
          routineStarted: true,
          ingredientSelections,
          exerciseSelections,
          routineStartDate: new Date().toISOString(),
          ...(selectedHabits.length > 0 ? { selectedHabits } : {}),
        });
      }

      setOnboardingComplete(true);
    } catch (error: any) {
      console.error('[V2Shopping] Error completing:', error);
      Alert.alert('Error', error.message || 'Failed to start routine');
      setLoading(false);
      setHasCompleted(false);
    }
  }, [user, hasCompleted, selectedIngredients, exercises, checkedProducts, data, updateData, setOnboardingComplete]);

  useEffect(() => {
    if (!loadingCategories && totalCards === 0 && !loading && !hasCompleted) {
      handleComplete();
    }
  }, [loadingCategories, totalCards, loading, hasCompleted, handleComplete]);

  if (loadingCategories || totalCards === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colorsV2.accentOrange} />
        <Text style={styles.loadingText}>Preparing your products...</Text>
      </View>
    );
  }

  const getTimingText = (ingredient: Ingredient): string => {
    const opts = ingredient.timing_options || [];
    if (opts.includes('morning') && opts.includes('evening')) return 'AM & PM';
    if (opts.includes('morning')) return 'Morning';
    if (opts.includes('evening')) return 'Evening';
    return 'Anytime';
  };

  const getTimingIcon = (ingredient: Ingredient): string => {
    const opts = ingredient.timing_options || [];
    if (opts.includes('morning') && opts.includes('evening')) return 'weather-sunset-up';
    if (opts.includes('morning')) return 'weather-sunset-up';
    if (opts.includes('evening')) return 'moon-waning-crescent';
    return 'clock-outline';
  };

  return (
    <View style={styles.container}>
      <V2ScreenWrapper showProgress={false} scrollable>
        {/* Header */}
        <Animated.View style={[styles.headerContainer, { opacity: anims[0].opacity, transform: anims[0].transform }]}>
          <Text style={styles.headline}>Products You'll Need</Text>
          <Text style={styles.subtitle}>
            These will make a real difference, but start with your habits and exercises and pick these up when you can.{'\n\n'}Any brand works, just look for the ingredient.
          </Text>
        </Animated.View>

        {/* Vertical product list */}
        <Animated.View style={[styles.listContainer, { opacity: anims[1].opacity, transform: anims[1].transform }]}>
          {selectedIngredients.map((ingredient) => {
            const isChecked = checkedProducts.has(ingredient.ingredient_id);
            const benefit = BENEFIT_LINES[ingredient.ingredient_id];
            return (
              <TouchableOpacity
                key={ingredient.ingredient_id}
                style={[styles.productCard, isChecked && styles.productCardChecked]}
                onPress={() => toggleProduct(ingredient.ingredient_id)}
                activeOpacity={0.8}
              >
                {/* Top row: checkbox + name + timing */}
                <View style={styles.cardTopRow}>
                  <View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
                    {isChecked && <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />}
                  </View>
                  <Text style={[styles.cardName, !isChecked && styles.cardNameUnchecked]} numberOfLines={1}>
                    {ingredient.display_name}
                  </Text>
                  <View style={styles.timingBadge}>
                    <MaterialCommunityIcons name={getTimingIcon(ingredient) as any} size={12} color={colorsV2.accentPurple} />
                    <Text style={styles.timingText}>{getTimingText(ingredient)}</Text>
                  </View>
                </View>

                {/* User-facing benefit */}
                {benefit && (
                  <Text style={styles.benefitText}>{benefit}</Text>
                )}

                {/* Scientific description */}
                <Text style={styles.cardDescription}>
                  {ingredient.short_description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {/* Continue button */}
        <Animated.View style={[styles.buttonContainer, { opacity: anims[2].opacity, transform: anims[2].transform }]}>
          <GradientButton
            title="Start My Protocol"
            onPress={handleComplete}
            disabled={loading}
          />
        </Animated.View>
      </V2ScreenWrapper>

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
    marginTop: spacingV2.xl + spacingV2.lg,
    marginBottom: spacingV2.lg,
    alignItems: 'center',
  },
  headline: {
    ...typographyV2.hero,
    textAlign: 'center',
    marginBottom: spacingV2.md,
  },
  subtitle: {
    ...typographyV2.body,
    color: colorsV2.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Product list
  listContainer: {
    gap: spacingV2.sm,
    marginBottom: spacingV2.md,
  },

  // Product card
  productCard: {
    backgroundColor: colorsV2.surface,
    borderRadius: borderRadiusV2.lg,
    borderWidth: 1,
    borderColor: colorsV2.border,
    padding: spacingV2.md,
  },
  productCardChecked: {
    borderColor: colorsV2.accentOrange + '35',
  },

  // Top row
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacingV2.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: colorsV2.textMuted,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacingV2.sm,
  },
  checkboxActive: {
    backgroundColor: colorsV2.accentOrange,
    borderColor: colorsV2.accentOrange,
  },
  cardName: {
    ...typographyV2.body,
    fontWeight: '700',
    color: colorsV2.textPrimary,
    flex: 1,
  },
  cardNameUnchecked: {
    color: colorsV2.textMuted,
    textDecorationLine: 'line-through',
  },
  timingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorsV2.accentPurple + '15',
    borderRadius: borderRadiusV2.sm,
    paddingHorizontal: spacingV2.sm,
    paddingVertical: spacingV2.xs - 1,
    gap: 4,
    marginLeft: spacingV2.sm,
  },
  timingText: {
    ...typographyV2.caption,
    color: colorsV2.accentPurple,
    fontWeight: '600',
    fontSize: 11,
  },

  // Benefit line
  benefitText: {
    ...typographyV2.body,
    color: colorsV2.accentPurple,
    fontWeight: '600',
    fontSize: 14,
    marginBottom: spacingV2.xs,
  },

  // Description
  cardDescription: {
    ...typographyV2.body,
    color: colorsV2.textSecondary,
    lineHeight: 20,
    fontSize: 13,
  },

  // Button
  buttonContainer: {
    marginTop: spacingV2.lg,
    marginBottom: spacingV2.lg,
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
