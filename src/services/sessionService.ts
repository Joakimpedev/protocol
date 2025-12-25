/**
 * Session Service
 * Handles tracking session completions (morning/evening/exercises)
 */

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getTodayDateString } from './completionService';

export interface SessionCompletion {
  date: string; // YYYY-MM-DD
  morning: boolean;
  evening: boolean;
  exercises: boolean;
}

/**
 * Mark a session as completed for today
 * Also marks all steps in that session as completed for consistency tracking
 */
export async function markSessionCompleted(
  userId: string,
  sessionType: 'morning' | 'evening' | 'exercises',
  stepIds?: string[]
): Promise<void> {
  try {
    const today = getTodayDateString();
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const data = userDoc.data();
    const completions: SessionCompletion[] = data.sessionCompletions || [];
    
    // Find today's completion record
    let todayCompletion = completions.find(c => c.date === today);
    
    if (!todayCompletion) {
      // Create new completion record for today
      const { getDayOfWeek } = require('./completionService');
      todayCompletion = {
        date: today,
        morning: false,
        evening: false,
        exercises: false,
      };
      completions.push(todayCompletion);
      
      // Also ensure dailyCompletion record exists with day_of_week
      const dailyCompletions = data.dailyCompletions || [];
      let todayDailyCompletion = dailyCompletions.find((c: any) => c.date === today);
      
      if (!todayDailyCompletion) {
        todayDailyCompletion = {
          date: today,
          day_of_week: getDayOfWeek(today),
          completedSteps: [],
          allCompleted: false,
          morning_completed: false,
          evening_completed: false,
          exercises_completed: false,
        };
        dailyCompletions.push(todayDailyCompletion);
        await updateDoc(doc(db, 'users', userId), {
          dailyCompletions: dailyCompletions,
        });
      }
    }

    // Mark session as completed
    todayCompletion[sessionType] = true;
    
    // Also update dailyCompletion record
    const dailyCompletions = data.dailyCompletions || [];
    let todayDailyCompletion = dailyCompletions.find((c: any) => c.date === today);
    
    if (!todayDailyCompletion) {
      const { getDayOfWeek } = require('./completionService');
      todayDailyCompletion = {
        date: today,
        day_of_week: getDayOfWeek(today),
        completedSteps: [],
        allCompleted: false,
        morning_completed: false,
        evening_completed: false,
        exercises_completed: false,
      };
      dailyCompletions.push(todayDailyCompletion);
    }
    
    // Update session completion flags
    if (sessionType === 'morning') {
      todayDailyCompletion.morning_completed = true;
    } else if (sessionType === 'evening') {
      todayDailyCompletion.evening_completed = true;
    } else if (sessionType === 'exercises') {
      todayDailyCompletion.exercises_completed = true;
    }

    // Also mark all steps as completed for consistency tracking
    if (stepIds && stepIds.length > 0) {
      const dailyCompletions = data.dailyCompletions || [];
      let todayStepCompletion = dailyCompletions.find((c: any) => c.date === today);
      
      if (!todayStepCompletion) {
        todayStepCompletion = {
          date: today,
          completedSteps: [],
          allCompleted: false,
        };
        dailyCompletions.push(todayStepCompletion);
      }

      // Add all step IDs that aren't already completed
      stepIds.forEach(stepId => {
        if (!todayStepCompletion.completedSteps.includes(stepId)) {
          todayStepCompletion.completedSteps.push(stepId);
        }
      });

      // Check if all steps are completed (all sessions done)
      // Exclude mewing from exercise IDs since it's continuous and never "completed"
      const allIngredientIds = (data.ingredientSelections || [])
        .filter((ing: any) => ing.state === 'added')
        .map((ing: any) => ing.ingredient_id);
      const allExerciseIds = (data.exerciseSelections || [])
        .filter((ex: any) => ex.state === 'added' && ex.exercise_id !== 'mewing')
        .map((ex: any) => ex.exercise_id);
      const allStepIds = [...allIngredientIds, ...allExerciseIds];
      
      const wasAlreadyCompleted = todayStepCompletion.allCompleted;
      todayStepCompletion.allCompleted = allStepIds.every((id: string) =>
        todayStepCompletion.completedSteps.includes(id)
      );

      // If user just completed their full routine for the first time today, increment global counter and notify friends
      if (todayStepCompletion.allCompleted && !wasAlreadyCompleted) {
        const { incrementGlobalCompletion } = await import('./ghostCounterService');
        incrementGlobalCompletion().catch(console.error);
        
        // Notify friends
        const { notifyFriendsOfCompletion } = await import('./notificationService');
        notifyFriendsOfCompletion(userId).catch(console.error);
      }

      // Update both sessionCompletions and dailyCompletions
      await updateDoc(doc(db, 'users', userId), {
        sessionCompletions: completions,
        dailyCompletions: dailyCompletions,
      });
      
      // Update stats after session completion (fire and forget)
      const { calculateAndUpdateStats } = await import('./completionService');
      calculateAndUpdateStats(userId).catch((error) => 
        console.error('Error updating stats after session completion:', error)
      );
    } else {
      await updateDoc(doc(db, 'users', userId), {
        sessionCompletions: completions,
      });
    }
  } catch (error) {
    console.error('Error marking session completed:', error);
    throw error;
  }
}

/**
 * Get today's session completions
 */
export async function getTodaySessionCompletions(
  userId: string
): Promise<SessionCompletion | null> {
  try {
    const today = getTodayDateString();
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return null;
    }

    const data = userDoc.data();
    const completions: SessionCompletion[] = data.sessionCompletions || [];
    const todayCompletion = completions.find(c => c.date === today);
    
    if (!todayCompletion) {
      return {
        date: today,
        morning: false,
        evening: false,
        exercises: false,
      };
    }

    return todayCompletion;
  } catch (error) {
    console.error('Error getting today session completions:', error);
    return null;
  }
}

