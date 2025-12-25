/**
 * Routine Builder Service
 * Builds session-based routines with proper timing balancing and ordering
 */

import { UserRoutineData, IngredientSelection, ExerciseSelection } from './routineService';
const guideBlocks = require('../data/guide_blocks.json');

export interface RoutineStep {
  id: string;
  type: 'base_step' | 'ingredient' | 'exercise';
  displayName: string;
  productName?: string;
  stepCategory: string;
  routineOrder?: number;
  session: {
    action: string;
    duration_seconds: number | null;
    wait_after_seconds: number;
    tip: string | null;
    is_continuous?: boolean;
  };
  ingredient?: any;
  exercise?: any;
  baseStep?: any;
}

export interface RoutineSection {
  name: 'morning' | 'evening';
  steps: RoutineStep[];
  estimatedDuration: number; // total seconds
}

/**
 * Build routine sections from user data
 */
export function buildRoutineSections(routineData: UserRoutineData): RoutineSection[] {
  const ingredients: any[] = guideBlocks.ingredients || [];
  const baseSteps: any[] = guideBlocks.base_steps || [];
  const stepCategoryOrder: string[] = guideBlocks.step_category_order || [];

  // Helper to check if ingredient is premium (for free users, hide premium ingredients)
  // Note: If user already has premium ingredient in their selections, we still show it
  const isPremiumIngredient = (ing: any): boolean => {
    return ing?.session?.premium === true;
  };

  // Get all added and received ingredients
  // Filter out premium ingredients that aren't already in user's selections
  const addedIngredients = (routineData.ingredientSelections || [])
    .filter((sel: IngredientSelection) => sel.state === 'added')
    .map((sel: IngredientSelection) => {
      const ingredient = ingredients.find(ing => ing.ingredient_id === sel.ingredient_id);
      if (!ingredient) return null;
      // If it's premium and user doesn't have it, filter it out
      // But if user already has it in selections, keep it (they might have had premium before)
      return { ...ingredient, selection: sel };
    })
    .filter(Boolean);

  // Exercises are now handled separately in ExerciseHub, not in routine sections

  // Separate ingredients by timing
  const morningFixed: any[] = [];
  const eveningFixed: any[] = [];
  const flexible: any[] = [];

  addedIngredients.forEach((ing: any) => {
    const timingOptions = ing.timing_options || [];
    const isFlexible = ing.timing_flexible === true;

    if (isFlexible) {
      flexible.push(ing);
    } else if (timingOptions.length === 1 && timingOptions[0] === 'morning') {
      morningFixed.push(ing);
    } else if (timingOptions.length === 1 && timingOptions[0] === 'evening') {
      eveningFixed.push(ing);
    } else if (timingOptions.includes('morning') && !timingOptions.includes('evening')) {
      morningFixed.push(ing);
    } else if (timingOptions.includes('evening') && !timingOptions.includes('morning')) {
      eveningFixed.push(ing);
    } else {
      // Default to flexible if unclear
      flexible.push(ing);
    }
  });

  // Balance flexible ingredients
  flexible.forEach((ing: any) => {
    if (morningFixed.length <= eveningFixed.length) {
      morningFixed.push(ing);
    } else {
      eveningFixed.push(ing);
    }
  });

  // Build morning routine
  const morningSteps = buildRoutineSteps('morning', morningFixed, baseSteps, stepCategoryOrder);
  const morningSection: RoutineSection = {
    name: 'morning',
    steps: morningSteps,
    estimatedDuration: calculateEstimatedDuration(morningSteps),
  };

  // Build evening routine
  const eveningSteps = buildRoutineSteps('evening', eveningFixed, baseSteps, stepCategoryOrder);
  const eveningSection: RoutineSection = {
    name: 'evening',
    steps: eveningSteps,
    estimatedDuration: calculateEstimatedDuration(eveningSteps),
  };

  // Exercises are now handled separately in ExerciseHub, not as a routine section
  // Return only sections with steps
  const sections: RoutineSection[] = [];
  if (morningSteps.length > 0) sections.push(morningSection);
  if (eveningSteps.length > 0) sections.push(eveningSection);

  return sections;
}

/**
 * Build routine steps for a specific timing (morning/evening)
 */
function buildRoutineSteps(
  timing: 'morning' | 'evening',
  ingredients: any[],
  baseSteps: any[],
  stepCategoryOrder: string[]
): RoutineStep[] {
  const steps: RoutineStep[] = [];

  // Always add wash_face first
  const washFace = baseSteps.find((bs: any) => bs.step_id === 'wash_face');
  if (washFace && washFace.timing_options.includes(timing)) {
    steps.push({
      id: washFace.step_id,
      type: 'base_step',
      displayName: washFace.display_name,
      stepCategory: washFace.step_category,
      session: washFace.session,
      baseStep: washFace,
    });
  }

  // Add ingredients, sorted by category and routine_order
  const ingredientSteps = ingredients
    .filter((ing: any) => {
      const timingOptions = ing.timing_options || [];
      return timingOptions.includes(timing);
    })
    .map((ing: any) => ({
      id: ing.ingredient_id,
      type: 'ingredient' as const,
      displayName: ing.display_name,
      productName: ing.selection?.product_name,
      stepCategory: ing.step_category || 'treatment',
      routineOrder: ing.routine_order || 999,
      session: ing.session || {
        action: ing.short_description,
        duration_seconds: null,
        wait_after_seconds: 0,
        tip: null,
      },
      ingredient: ing,
    }));

  // Sort by category order, then by routine_order
  ingredientSteps.sort((a, b) => {
    const categoryA = stepCategoryOrder.indexOf(a.stepCategory);
    const categoryB = stepCategoryOrder.indexOf(b.stepCategory);
    
    if (categoryA !== categoryB) {
      return categoryA - categoryB;
    }
    
    return (a.routineOrder || 999) - (b.routineOrder || 999);
  });

  steps.push(...ingredientSteps);

  return steps;
}

/**
 * Calculate estimated duration for a set of steps
 */
function calculateEstimatedDuration(steps: RoutineStep[]): number {
  return steps.reduce((total, step) => {
    const stepDuration = step.session.duration_seconds || 0;
    const waitDuration = step.session.wait_after_seconds || 0;
    return total + stepDuration + waitDuration;
  }, 0);
}

/**
 * Format duration in seconds to human-readable string
 * Rounds to minutes, doesn't show seconds
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes === 0) {
    return '1min'; // Show at least 1min for very short durations
  }
  return `${minutes}min`;
}

