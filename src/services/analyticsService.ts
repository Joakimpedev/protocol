/**
 * Analytics Service
 * Handles tracking various user behavior data points for analytics
 */

import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getTodayDateString } from './completionService';

export interface StepSkip {
  date: string; // YYYY-MM-DD
  step_id: string;
  skipped: true;
  reason: null;
  timestamp: string; // ISO timestamp
}

export interface TimerSkip {
  date: string; // YYYY-MM-DD
  step_id: string;
  timer_skipped: true;
  timer_duration: number; // seconds
  timestamp: string; // ISO timestamp
}

export interface ExerciseEarlyEnd {
  date: string; // YYYY-MM-DD
  exercise_id: string;
  ended_early: true;
  timestamp: string; // ISO timestamp
}

export interface RoutineStartTime {
  date: string; // YYYY-MM-DD
  morning_start?: string; // ISO timestamp
  evening_start?: string; // ISO timestamp
}

export interface SkinRating {
  week_number: number;
  photo_date: string; // YYYY-MM-DD
  skin_rating: 'worse' | 'same' | 'better';
  timestamp: string; // ISO timestamp
}

/**
 * Track when a step is skipped
 * Only tracks if the step hasn't been completed today yet
 */
export async function trackStepSkip(
  userId: string,
  stepId: string
): Promise<void> {
  try {
    const today = getTodayDateString();
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    // Check if step is already completed today - don't track if already done
    const { getTodayCompletedSteps } = await import('./completionService');
    const completedSteps = await getTodayCompletedSteps(userId);
    if (completedSteps.includes(stepId)) {
      // Step already completed today, don't track skip
      return;
    }

    const skipData: StepSkip = {
      date: today,
      step_id: stepId,
      skipped: true,
      reason: null,
      timestamp: new Date().toISOString(),
    };

    // Store in stepSkips array
    await updateDoc(doc(db, 'users', userId), {
      stepSkips: arrayUnion(skipData),
    });
  } catch (error) {
    console.error('Error tracking step skip:', error);
    throw error;
  }
}

/**
 * Track when a timer is skipped
 * Only tracks if the step hasn't been completed today yet
 */
export async function trackTimerSkip(
  userId: string,
  stepId: string,
  timerDuration: number
): Promise<void> {
  try {
    const today = getTodayDateString();
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    // Check if step is already completed today - don't track if already done
    const { getTodayCompletedSteps } = await import('./completionService');
    const completedSteps = await getTodayCompletedSteps(userId);
    if (completedSteps.includes(stepId)) {
      // Step already completed today, don't track timer skip
      return;
    }

    const skipData: TimerSkip = {
      date: today,
      step_id: stepId,
      timer_skipped: true,
      timer_duration: timerDuration,
      timestamp: new Date().toISOString(),
    };

    // Store in timerSkips array
    await updateDoc(doc(db, 'users', userId), {
      timerSkips: arrayUnion(skipData),
    });
  } catch (error) {
    console.error('Error tracking timer skip:', error);
    throw error;
  }
}

/**
 * Track routine start time (morning or evening)
 */
export async function trackRoutineStartTime(
  userId: string,
  routineType: 'morning' | 'evening'
): Promise<void> {
  try {
    const today = getTodayDateString();
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const data = userDoc.data();
    const routineStarts: RoutineStartTime[] = data.routineStartTimes || [];
    
    // Find today's record
    let todayRecord = routineStarts.find(r => r.date === today);
    
    if (!todayRecord) {
      // Create new record for today
      todayRecord = {
        date: today,
      };
      routineStarts.push(todayRecord);
    }

    // Only set if not already set (first time starting this routine today)
    const fieldName = `${routineType}_start` as 'morning_start' | 'evening_start';
    if (!todayRecord[fieldName]) {
      todayRecord[fieldName] = new Date().toISOString();
      
      await updateDoc(doc(db, 'users', userId), {
        routineStartTimes: routineStarts,
      });
    }
  } catch (error) {
    console.error('Error tracking routine start time:', error);
    throw error;
  }
}

/**
 * Track skin rating after photo
 */
export async function trackSkinRating(
  userId: string,
  weekNumber: number,
  photoDate: string,
  rating: 'worse' | 'same' | 'better'
): Promise<void> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const ratingData: SkinRating = {
      week_number: weekNumber,
      photo_date: photoDate,
      skin_rating: rating,
      timestamp: new Date().toISOString(),
    };

    // Store in skinRatings array
    await updateDoc(doc(db, 'users', userId), {
      skinRatings: arrayUnion(ratingData),
    });
  } catch (error) {
    console.error('Error tracking skin rating:', error);
    throw error;
  }
}

/**
 * Get timer skip count for a date range
 */
export async function getTimerSkipCount(
  userId: string,
  weekStart: string,
  weekEnd: string
): Promise<number> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return 0;
    }

    const data = userDoc.data();
    const timerSkips: TimerSkip[] = data.timerSkips || [];
    
    // Count skips within the week range
    const weekSkips = timerSkips.filter((skip: TimerSkip) => {
      return skip.date >= weekStart && skip.date <= weekEnd;
    });
    
    return weekSkips.length;
  } catch (error) {
    console.error('Error getting timer skip count:', error);
    return 0;
  }
}

/**
 * Get product skip count for a date range
 * Counts stepSkips (when a product/step is skipped)
 */
export async function getProductSkipCount(
  userId: string,
  weekStart: string,
  weekEnd: string
): Promise<number> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return 0;
    }

    const data = userDoc.data();
    const stepSkips: StepSkip[] = data.stepSkips || [];
    
    // Count skips within the week range
    const weekSkips = stepSkips.filter((skip: StepSkip) => {
      return skip.date >= weekStart && skip.date <= weekEnd;
    });
    
    return weekSkips.length;
  } catch (error) {
    console.error('Error getting product skip count:', error);
    return 0;
  }
}

/**
 * Get skipped products with names and counts for a date range
 * Returns array of { stepId, productName, count } for products that were skipped
 */
export async function getSkippedProductsWithCounts(
  userId: string,
  weekStart: string,
  weekEnd: string
): Promise<Array<{ stepId: string; productName: string; count: number }>> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return [];
    }

    const data = userDoc.data();
    const stepSkips: StepSkip[] = data.stepSkips || [];
    const ingredientSelections: any[] = data.ingredientSelections || [];
    
    // Filter skips within the week range
    const weekSkips = stepSkips.filter((skip: StepSkip) => {
      return skip.date >= weekStart && skip.date <= weekEnd;
    });
    
    if (weekSkips.length === 0) {
      return [];
    }
    
    // Count skips per step_id (ingredient_id)
    const skipCounts: Record<string, number> = {};
    weekSkips.forEach((skip: StepSkip) => {
      skipCounts[skip.step_id] = (skipCounts[skip.step_id] || 0) + 1;
    });
    
    // Map step_ids to product names from ingredientSelections
    const skippedProducts: Array<{ stepId: string; productName: string; count: number }> = [];
    
    Object.entries(skipCounts).forEach(([stepId, count]) => {
      // Find the ingredient selection to get the product name
      const ingredientSelection = ingredientSelections.find(
        (ing: any) => ing.ingredient_id === stepId
      );
      
      // Only include if we found an ingredient selection (it's a product, not an exercise)
      if (ingredientSelection && ingredientSelection.product_name) {
        skippedProducts.push({
          stepId,
          productName: ingredientSelection.product_name,
          count,
        });
      }
    });
    
    return skippedProducts;
  } catch (error) {
    console.error('Error getting skipped products with counts:', error);
    return [];
  }
}

/**
 * Track when an exercise is ended early
 * Only tracks if the exercise hasn't been completed today yet
 */
export async function trackExerciseEarlyEnd(
  userId: string,
  exerciseId: string
): Promise<void> {
  try {
    const today = getTodayDateString();
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    // Check if exercise is already completed today - don't track if already done
    const { getTodayExerciseCompletions } = await import('./exerciseService');
    const completedExercises = await getTodayExerciseCompletions(userId);
    if (completedExercises[exerciseId] === true) {
      // Exercise already completed today, don't track early end
      return;
    }

    const endData: ExerciseEarlyEnd = {
      date: today,
      exercise_id: exerciseId,
      ended_early: true,
      timestamp: new Date().toISOString(),
    };

    // Store in exerciseEarlyEnds array
    await updateDoc(doc(db, 'users', userId), {
      exerciseEarlyEnds: arrayUnion(endData),
    });
  } catch (error) {
    console.error('Error tracking exercise early end:', error);
    throw error;
  }
}

/**
 * Get exercise early end count for a date range
 * Tracks when exercises are ended early or skipped
 */
export async function getExerciseEarlyEndCount(
  userId: string,
  weekStart: string,
  weekEnd: string
): Promise<number> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return 0;
    }

    const data = userDoc.data();
    const exerciseEarlyEnds: ExerciseEarlyEnd[] = data.exerciseEarlyEnds || [];
    
    // Count early ends within the week range
    const weekEarlyEnds = exerciseEarlyEnds.filter((end: ExerciseEarlyEnd) => {
      return end.date >= weekStart && end.date <= weekEnd;
    });
    
    return weekEarlyEnds.length;
  } catch (error) {
    console.error('Error getting exercise early end count:', error);
    return 0;
  }
}

/**
 * Get most skipped step for a date range
 * Returns { stepId, stepName, count } or null if no skips
 */
export async function getMostSkippedStep(
  userId: string,
  weekStart: string,
  weekEnd: string
): Promise<{ stepId: string; stepName: string; count: number } | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return null;
    }

    const data = userDoc.data();
    const stepSkips: StepSkip[] = data.stepSkips || [];
    
    // Filter skips within the week range
    const weekSkips = stepSkips.filter((skip: StepSkip) => {
      return skip.date >= weekStart && skip.date <= weekEnd;
    });
    
    if (weekSkips.length === 0) {
      return null;
    }
    
    // Count skips per step
    const skipCounts: Record<string, number> = {};
    weekSkips.forEach((skip: StepSkip) => {
      skipCounts[skip.step_id] = (skipCounts[skip.step_id] || 0) + 1;
    });
    
    // Find step with most skips
    let mostSkippedStepId = '';
    let maxCount = 0;
    Object.entries(skipCounts).forEach(([stepId, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostSkippedStepId = stepId;
      }
    });
    
    if (!mostSkippedStepId) {
      return null;
    }
    
    // Get step display name from guide blocks
    const guideBlocks = require('../data/guide_blocks.json');
    const ingredients = guideBlocks.ingredients || [];
    const exercises = guideBlocks.exercises || [];
    const baseSteps = guideBlocks.base_steps || [];
    
    // Try to find in ingredients
    let stepName = '';
    const ingredient = ingredients.find((ing: any) => ing.ingredient_id === mostSkippedStepId);
    if (ingredient) {
      stepName = ingredient.display_name || mostSkippedStepId;
    } else {
      // Try exercises
      const exercise = exercises.find((ex: any) => ex.exercise_id === mostSkippedStepId);
      if (exercise) {
        stepName = exercise.display_name || mostSkippedStepId;
      } else {
        // Try base steps
        const baseStep = baseSteps.find((bs: any) => bs.step_id === mostSkippedStepId);
        if (baseStep) {
          stepName = baseStep.display_name || mostSkippedStepId;
        } else {
          stepName = mostSkippedStepId;
        }
      }
    }
    
    return {
      stepId: mostSkippedStepId,
      stepName,
      count: maxCount,
    };
  } catch (error) {
    console.error('Error getting most skipped step:', error);
    return null;
  }
}

