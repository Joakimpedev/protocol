/**
 * Exercise Service
 * Handles exercise data, cycling logic, completion tracking, and user preferences
 */

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getTodayDateString } from './completionService';

const guideBlocks = require('../data/guide_blocks.json');

export interface Exercise {
  exercise_id: string;
  display_name: string;
  type: 'continuous' | 'timed' | 'cycling';
  what_it_improves?: string;
  instructions?: string;
  tip?: string;
  has_completion: boolean;
  duration_options?: number[]; // in seconds
  default_duration?: number;
  set_options?: number[];
  default_sets?: number;
  variations?: ExerciseVariation[];
  used_for?: string[];
}

export interface ExerciseVariation {
  variation_id: string;
  name: string;
  what_it_improves: string;
  instructions: string;
  tip: string;
  hold_seconds?: number;
  release_seconds?: number;
  alternating?: boolean;
  continuous?: boolean;
  additional_holds?: Array<{ position: string; hold_seconds: number }>;
}

export interface ExerciseCompletion {
  date: string; // YYYY-MM-DD
  exercises: Record<string, boolean>; // exercise_id -> completed
}

export interface ExercisePreferences {
  mewing?: MewingSettings;
  lastDurations?: Record<string, number>; // exercise_id -> duration in seconds
  lastSets?: Record<string, number>; // exercise_id -> number of sets
}

export interface MewingSettings {
  mode: 'interval' | 'custom';
  interval?: {
    hours: number; // 1, 2, 3, or 4
    startTime: string; // HH:mm format, default "09:00"
    endTime: string; // HH:mm format, default "21:00"
  };
  customTimes?: string[]; // Array of HH:mm strings
  notificationText?: string; // Default "Posture."
}

/**
 * Get all exercises from guide blocks
 */
export function getAllExercises(): Exercise[] {
  return guideBlocks.exercises || [];
}

/**
 * Get exercise by ID
 */
export function getExerciseById(exerciseId: string): Exercise | undefined {
  const exercises = getAllExercises();
  return exercises.find(ex => ex.exercise_id === exerciseId);
}

/**
 * Get today's variation for a cycling exercise
 * Uses day of year modulo number of variations
 */
export function getTodayVariation(exercise: Exercise): ExerciseVariation | null {
  if (exercise.type !== 'cycling' || !exercise.variations || exercise.variations.length === 0) {
    return null;
  }

  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const variationIndex = dayOfYear % exercise.variations.length;

  return exercise.variations[variationIndex];
}

/**
 * Get exercise completion status for today
 */
export async function getTodayExerciseCompletions(
  userId: string
): Promise<Record<string, boolean>> {
  try {
    const today = getTodayDateString();
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return {};
    }

    const data = userDoc.data();
    const completions: ExerciseCompletion[] = data.exerciseCompletions || [];
    const todayCompletion = completions.find(c => c.date === today);
    
    return todayCompletion?.exercises || {};
  } catch (error) {
    console.error('Error getting exercise completions:', error);
    return {};
  }
}

/**
 * Mark exercise as completed for today
 * Also checks if all completable exercises are done and marks exercises session as complete
 */
export async function markExerciseCompleted(
  userId: string,
  exerciseId: string
): Promise<void> {
  try {
    const today = getTodayDateString();
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const data = userDoc.data();
    const completions: ExerciseCompletion[] = data.exerciseCompletions || [];
    
    let todayCompletion = completions.find(c => c.date === today);
    
    if (!todayCompletion) {
      todayCompletion = {
        date: today,
        exercises: {},
      };
      completions.push(todayCompletion);
    }

    todayCompletion.exercises[exerciseId] = true;

    // Check if all user's selected exercises are now completed (excluding mewing and excluded exercises)
    // Only check exercises that the user has added to their routine
    const userExerciseSelections = (data.exerciseSelections || [])
      .filter((ex: any) => ex.state === 'added' && ex.exercise_id !== 'mewing')
      .map((ex: any) => ex.exercise_id);
    
    // Get all exercises to check which ones have completion tracking
    const allExercises = getAllExercises();
    const userCompletableExercises = userExerciseSelections.filter(exId => {
      const exercise = allExercises.find(ex => ex.exercise_id === exId);
      return exercise && exercise.has_completion;
    });
    
    // Check if all user's completable exercises are done
    const allUserExercisesCompleted = userCompletableExercises.length > 0 && 
      userCompletableExercises.every(id => todayCompletion.exercises[id] === true);

    // If all user's selected exercises are done, mark exercises session as complete
    if (allUserExercisesCompleted) {
      const { markSessionCompleted } = await import('./sessionService');
      await markSessionCompleted(userId, 'exercises', userExerciseSelections);
    }

    await updateDoc(doc(db, 'users', userId), {
      exerciseCompletions: completions,
    });
  } catch (error) {
    console.error('Error marking exercise completed:', error);
    throw error;
  }
}

/**
 * Get exercise preferences (mewing settings, last durations, last sets)
 */
export async function getExercisePreferences(
  userId: string
): Promise<ExercisePreferences> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return {};
    }

    const data = userDoc.data();
    return data.exercisePreferences || {};
  } catch (error) {
    console.error('Error getting exercise preferences:', error);
    return {};
  }
}

/**
 * Save exercise preferences
 */
export async function saveExercisePreferences(
  userId: string,
  preferences: Partial<ExercisePreferences>
): Promise<void> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const data = userDoc.data();
    const currentPreferences: ExercisePreferences = data.exercisePreferences || {};
    
    const updatedPreferences: ExercisePreferences = {
      ...currentPreferences,
      ...preferences,
    };

    await updateDoc(doc(db, 'users', userId), {
      exercisePreferences: updatedPreferences,
    });
  } catch (error) {
    console.error('Error saving exercise preferences:', error);
    throw error;
  }
}

/**
 * Get count of completed exercises today (excluding mewing)
 */
export async function getCompletedExerciseCount(userId: string): Promise<number> {
  const completions = await getTodayExerciseCompletions(userId);
  const exercises = getAllExercises();
  
  // Count only exercises with has_completion: true
  const completableExercises = exercises.filter(ex => ex.has_completion);
  
  return completableExercises.filter(ex => completions[ex.exercise_id]).length;
}

/**
 * Get total count of exercises that can be completed (excluding mewing)
 */
export function getTotalCompletableExerciseCount(): number {
  const exercises = getAllExercises();
  return exercises.filter(ex => ex.has_completion).length;
}

/**
 * Estimate duration for an exercise in seconds
 */
export function estimateExerciseDuration(exercise: Exercise): number {
  // Mewing is throughout the day, not calculable
  if (exercise.exercise_id === 'mewing') {
    return 0;
  }

  // Get the raw exercise data from guideBlocks to access all fields
  const exerciseData = guideBlocks.exercises?.find((ex: any) => ex.exercise_id === exercise.exercise_id);
  if (!exerciseData) {
    return 5 * 60; // Default 5 minutes if not found
  }

  // If exercise has session with duration_seconds, use that (e.g., facial_massage)
  if (exerciseData.session?.duration_seconds) {
    return exerciseData.session.duration_seconds;
  }

  // For cycling exercises with variations, estimate based on today's variation
  if (exercise.type === 'cycling' && exercise.variations && exercise.variations.length > 0) {
    const todayVariation = getTodayVariation(exercise);
    if (todayVariation) {
      const defaultSets = exercise.default_sets || 20;
      
      // Continuous exercises (like wall slide) - estimate 5 minutes
      if (todayVariation.continuous) {
        return 5 * 60; // 5 minutes
      }
      
      // Calculate per set duration
      let perSetSeconds = 0;
      const holdSeconds = todayVariation.hold_seconds || 0;
      const releaseSeconds = todayVariation.release_seconds || 3;
      perSetSeconds += holdSeconds + releaseSeconds;
      
      // Add additional holds if any
      if (todayVariation.additional_holds) {
        todayVariation.additional_holds.forEach((ah: any) => {
          perSetSeconds += ah.hold_seconds + releaseSeconds;
        });
      }
      
      // If alternating, double the time per set
      if (todayVariation.alternating) {
        perSetSeconds *= 2;
      }
      
      // Total duration = per set * number of sets
      return perSetSeconds * defaultSets;
    }
  }

  // For timed exercises, use default_duration if available
  if (exercise.type === 'timed' && exercise.default_duration) {
    return exercise.default_duration;
  }

  // Fallback: estimate based on exercise_id
  // Wall slide and other continuous exercises - estimate 5 minutes
  if (exercise.exercise_id === 'wall_slide' || exercise.exercise_id.includes('slide')) {
    return 5 * 60; // 5 minutes
  }

  // Default estimate: 5 minutes
  return 5 * 60;
}

/**
 * Get estimated total duration for all completable exercises (excluding mewing)
 */
export function getEstimatedTotalExerciseDuration(): number {
  const exercises = getAllExercises();
  const completableExercises = exercises.filter(ex => ex.has_completion && ex.exercise_id !== 'mewing');
  
  return completableExercises.reduce((total, exercise) => {
    return total + estimateExerciseDuration(exercise);
  }, 0);
}

