/**
 * Routine Service
 * Handles loading and updating user routine data from Firestore
 */

import { doc, getDoc, updateDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface IngredientSelection {
  ingredient_id: string;
  product_name: string;
  state: 'added' | 'skipped' | 'not_received';
  waiting_for_delivery: boolean;
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
 * Mark a product as received (change from not_received to added)
 */
export async function markProductAsReceived(
  userId: string,
  ingredientId: string
): Promise<void> {
  await updateIngredientState(userId, ingredientId, {
    state: 'added',
    waiting_for_delivery: false,
  });
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




