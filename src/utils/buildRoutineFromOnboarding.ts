/**
 * Build Firestore routine payload (ingredientSelections, exerciseSelections) from onboarding data.
 * Used when completing onboarding on TrialPaywall so the homepage shows the correct protocol and ingredients.
 */

import type { IngredientSelection, ExerciseSelection } from '../services/routineService';
import type { OnboardingData } from '../contexts/OnboardingContext';

const guideBlocks = require('../data/guide_blocks.json');

interface Problem {
  problem_id: string;
  recommended_ingredients: string[];
  recommended_exercises: string[];
}

interface Ingredient {
  ingredient_id: string;
  routine_order: number;
  session?: { premium?: boolean };
}

export interface RoutinePayload {
  ingredientSelections: IngredientSelection[];
  exerciseSelections: ExerciseSelection[];
}

/**
 * Build ingredient and exercise selections from onboarding context.
 * shoppingSelections format (from ShoppingScreen): ingredient_id -> 'owned:ProductName' | 'pending' | 'skipped', ex_${exercise_id} -> 'added' | 'skipped'
 */
export function buildRoutineFromOnboarding(data: OnboardingData): RoutinePayload {
  const concerns = data.selectedProblems?.length ? data.selectedProblems : (data.selectedCategories || []);
  const shoppingSelections = data.shoppingSelections || {};
  const problems: Problem[] = guideBlocks.problems || [];
  const ingredients: Ingredient[] = guideBlocks.ingredients || [];

  const selectedProblems = problems.filter((p: Problem) => concerns.includes(p.problem_id));
  const ingredientIds = Array.from(
    new Set(selectedProblems.flatMap((p: Problem) => p.recommended_ingredients || []))
  );

  const isPremiumIngredient = (ing: Ingredient): boolean => ing?.session?.premium === true;
  let selectedIngredients = ingredientIds
    .map((id) => ingredients.find((i: Ingredient) => i.ingredient_id === id))
    .filter((ing): ing is Ingredient => ing !== undefined && !isPremiumIngredient(ing))
    .sort((a, b) => a.routine_order - b.routine_order);

  const hasBHA = selectedIngredients.some((i) => i.ingredient_id === 'salicylic_acid');
  const hasAHA = selectedIngredients.some((i) => i.ingredient_id === 'aha');
  if (hasBHA && hasAHA) {
    selectedIngredients = selectedIngredients.filter((i) => i.ingredient_id !== 'aha');
  }

  const exerciseIds = Array.from(
    new Set(selectedProblems.flatMap((p: Problem) => p.recommended_exercises || []))
  );
  const exercises = exerciseIds.map((id) => ({ exercise_id: id }));

  const ingredientSelections: IngredientSelection[] = selectedIngredients.map((ing) => {
    const val = shoppingSelections[ing.ingredient_id];
    if (val && val.startsWith('owned:')) {
      const productName = val.slice(6);
      return {
        ingredient_id: ing.ingredient_id,
        product_name: productName,
        state: 'active' as const,
        waiting_for_delivery: false,
      };
    }
    if (val === 'pending') {
      return {
        ingredient_id: ing.ingredient_id,
        product_name: '',
        state: 'pending' as const,
        waiting_for_delivery: false,
      };
    }
    if (val === 'skipped') {
      return {
        ingredient_id: ing.ingredient_id,
        product_name: '',
        state: 'skipped' as const,
        waiting_for_delivery: false,
      };
    }
    return {
      ingredient_id: ing.ingredient_id,
      product_name: '',
      state: 'pending' as const,
      waiting_for_delivery: false,
    };
  });

  const exerciseSelections: ExerciseSelection[] = exercises.map((ex) => {
    const val = shoppingSelections[`ex_${ex.exercise_id}`];
    const state = val === 'skipped' ? 'skipped' : 'added';
    return { exercise_id: ex.exercise_id, state: state as 'added' | 'skipped' };
  });

  return { ingredientSelections, exerciseSelections };
}
