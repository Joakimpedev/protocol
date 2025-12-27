/**
 * Routine Service
 * Handles loading and updating user routine data from Firestore
 */

import { doc, getDoc, updateDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface IngredientSelection {
  ingredient_id: string;
  product_name: string;
  state: 'active' | 'pending' | 'deferred' | 'skipped' | 'added' | 'not_received'; // 'added' and 'not_received' kept for backward compatibility
  waiting_for_delivery?: boolean; // Deprecated, kept for backward compatibility
  defer_until?: string; // ISO date string for when to show deferred products again
}

export interface ExerciseSelection {
  exercise_id: string;
  state: 'added' | 'skipped';
}

export interface UserRoutineData {
  routineStarted: boolean;
  routineStartDate?: string;
  ingredientSelections?: IngredientSelection[];
  exerciseSelections?: ExerciseSelection[];
  concerns?: string[];
  skinType?: 'oily' | 'dry' | 'combination' | 'normal';
  budget?: 'low' | 'medium' | 'flexible';
  dailyTime?: 10 | 20 | 30;
}

/**
 * Load user routine data from Firestore
 */
export async function loadUserRoutine(userId: string): Promise<UserRoutineData | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return null;
    }

    const data = userDoc.data();
    return {
      routineStarted: data.routineStarted || false,
      routineStartDate: data.routineStartDate,
      ingredientSelections: data.ingredientSelections || [],
      exerciseSelections: data.exerciseSelections || [],
      concerns: data.concerns || [],
      skinType: data.skinType,
      budget: data.budget,
      dailyTime: data.dailyTime,
    };
  } catch (error) {
    console.error('Error loading user routine:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time updates of user routine data
 */
export function subscribeToUserRoutine(
  userId: string,
  callback: (data: UserRoutineData | null) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'users', userId),
    (userDoc) => {
      if (!userDoc.exists()) {
        callback(null);
        return;
      }

      const data = userDoc.data();
      callback({
        routineStarted: data.routineStarted || false,
        routineStartDate: data.routineStartDate,
        ingredientSelections: data.ingredientSelections || [],
        exerciseSelections: data.exerciseSelections || [],
        concerns: data.concerns || [],
        skinType: data.skinType,
        budget: data.budget,
        dailyTime: data.dailyTime,
      });
    },
    (error) => {
      console.error('Error subscribing to user routine:', error);
      callback(null);
    }
  );
}

/**
 * Update a specific ingredient's state (e.g., mark as received)
 */
export async function updateIngredientState(
  userId: string,
  ingredientId: string,
  updates: Partial<IngredientSelection>
): Promise<void> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const data = userDoc.data();
    const ingredientSelections: IngredientSelection[] = data.ingredientSelections || [];

    // Find and update the ingredient
    const updatedSelections = ingredientSelections.map((selection) => {
      if (selection.ingredient_id === ingredientId) {
        return { ...selection, ...updates };
      }
      return selection;
    });

    await updateDoc(doc(db, 'users', userId), {
      ingredientSelections: updatedSelections,
    });
  } catch (error) {
    console.error('Error updating ingredient state:', error);
    throw error;
  }
}

/**
 * Mark a product as received (change from not_received to added, or pending/deferred to active)
 */
export async function markProductAsReceived(
  userId: string,
  ingredientId: string
): Promise<void> {
  await updateIngredientState(userId, ingredientId, {
    state: 'active',
    waiting_for_delivery: false,
  });
}

/**
 * Mark a pending product as active (user got it)
 */
export async function markPendingProductAsActive(
  userId: string,
  ingredientId: string,
  productName: string
): Promise<void> {
  await updateIngredientState(userId, ingredientId, {
    state: 'active',
    product_name: productName,
    waiting_for_delivery: false,
  });
}

/**
 * Defer a pending product (waiting for delivery)
 */
export async function deferPendingProduct(
  userId: string,
  ingredientId: string,
  days: 1 | 3 | 7
): Promise<void> {
  const deferDate = new Date();
  deferDate.setDate(deferDate.getDate() + days);
  
  await updateIngredientState(userId, ingredientId, {
    state: 'deferred',
    defer_until: deferDate.toISOString(),
  });
}

/**
 * Skip a pending product forever
 */
export async function skipPendingProduct(
  userId: string,
  ingredientId: string
): Promise<void> {
  await updateIngredientState(userId, ingredientId, {
    state: 'skipped',
  });
}

/**
 * Check if a deferred product should be shown again
 */
export function shouldShowDeferredProduct(deferUntil?: string): boolean {
  if (!deferUntil) return true;
  const deferDate = new Date(deferUntil);
  return new Date() >= deferDate;
}

/**
 * Update exercise state
 */
export async function updateExerciseState(
  userId: string,
  exerciseId: string,
  state: 'added' | 'skipped'
): Promise<void> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const data = userDoc.data();
    const exerciseSelections: ExerciseSelection[] = data.exerciseSelections || [];

    // Find and update the exercise
    const updatedSelections = exerciseSelections.map((selection) => {
      if (selection.exercise_id === exerciseId) {
        return { ...selection, state };
      }
      return selection;
    });

    await updateDoc(doc(db, 'users', userId), {
      exerciseSelections: updatedSelections,
    });
  } catch (error) {
    console.error('Error updating exercise state:', error);
    throw error;
  }
}

/**
 * Reset all deferred products back to pending state (dev tool)
 * This will reset all products to pending state (the "don't have" state after onboarding)
 * - Resets deferred products (waiting for delivery) back to pending
 * - Resets active products back to pending (removes product_name)
 * - Resets skipped products back to pending
 */
export async function resetDeferredProducts(userId: string): Promise<void> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const data = userDoc.data();
    const ingredientSelections: IngredientSelection[] = data.ingredientSelections || [];

    // Reset all products to pending state (the "don't have" state after onboarding)
    const updatedSelections = ingredientSelections.map((selection) => {
      // Remove defer_until, product_name, and waiting_for_delivery
      // Set all products to pending state regardless of current state
      const { defer_until, product_name, waiting_for_delivery, ...rest } = selection;
      return {
        ...rest,
        state: 'pending' as const,
      };
    });

    await updateDoc(doc(db, 'users', userId), {
      ingredientSelections: updatedSelections,
    });
  } catch (error) {
    console.error('Error resetting deferred products:', error);
    throw error;
  }
}




