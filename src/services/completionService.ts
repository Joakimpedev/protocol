/**
 * Completion Service
 * Handles tracking daily routine completions and consistency scores
 */

import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DEFAULT_MORNING_TIME, DEFAULT_EVENING_TIME } from './notificationService';

export interface DailyCompletion {
  date: string; // ISO date string (YYYY-MM-DD)
  day_of_week: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  completedSteps: string[]; // Array of ingredient_id or exercise_id
  allCompleted: boolean; // Whether all steps were completed that day
  morning_completed: boolean; // Whether morning routine was completed
  evening_completed: boolean; // Whether evening routine was completed
  exercises_completed: boolean; // Whether exercises were completed
}

/**
 * Get today's date as YYYY-MM-DD string
 */
export function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * DEV TOOL: Reset all exercises and routines for today
 * Removes today's completion data from dailyCompletions, exerciseCompletions, and sessionCompletions
 */
export async function resetTodayCompletions(userId: string): Promise<void> {
  try {
    const today = getTodayDateString();
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const data = userDoc.data();
    
    // Remove today's entry from dailyCompletions
    const dailyCompletions: DailyCompletion[] = data.dailyCompletions || [];
    const filteredDailyCompletions = dailyCompletions.filter(c => c.date !== today);
    
    // Remove today's entry from exerciseCompletions
    const exerciseCompletions: any[] = data.exerciseCompletions || [];
    const filteredExerciseCompletions = exerciseCompletions.filter((c: any) => c.date !== today);
    
    // Remove today's entry from sessionCompletions
    const sessionCompletions: any[] = data.sessionCompletions || [];
    const filteredSessionCompletions = sessionCompletions.filter((c: any) => c.date !== today);
    
    // Update Firebase
    await updateDoc(doc(db, 'users', userId), {
      dailyCompletions: filteredDailyCompletions,
      exerciseCompletions: filteredExerciseCompletions,
      sessionCompletions: filteredSessionCompletions,
    });
  } catch (error) {
    console.error('Error resetting today completions:', error);
    throw error;
  }
}

/**
 * DEV TOOL: Reset all skip-related analytics data
 * Clears stepSkips, timerSkips, and exerciseEarlyEnds arrays
 */
export async function resetSkipAnalytics(userId: string): Promise<void> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    // Clear all skip-related arrays
    await updateDoc(doc(db, 'users', userId), {
      stepSkips: [],
      timerSkips: [],
      exerciseEarlyEnds: [],
    });
  } catch (error) {
    console.error('Error resetting skip analytics:', error);
    throw error;
  }
}

/**
 * Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 */
export function getDayOfWeek(dateString: string): number {
  const date = new Date(dateString);
  return date.getDay();
}

/**
 * Get the start of the current week (Monday) as YYYY-MM-DD string
 */
export function getWeekStartDateString(): string {
  const today = new Date();
  const day = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Calculate days to subtract to get to Monday
  // Monday (1): subtract 0 days
  // Tuesday (2): subtract 1 day
  // Wednesday (3): subtract 2 days
  // ...
  // Sunday (0): subtract 6 days
  const daysToSubtract = day === 0 ? 6 : day - 1;
  
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysToSubtract);
  monday.setHours(0, 0, 0, 0);
  
  // Use local date formatting to avoid timezone issues with toISOString()
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayOfMonth}`;
}

/**
 * Mark a step as completed for today
 */
export async function markStepCompleted(
  userId: string,
  stepId: string,
  stepType: 'ingredient' | 'exercise'
): Promise<void> {
  try {
    const today = getTodayDateString();
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const data = userDoc.data();
    const completions: DailyCompletion[] = data.dailyCompletions || [];
    
    // Find today's completion record
    let todayCompletion = completions.find(c => c.date === today);
    
    if (!todayCompletion) {
      // Create new completion record for today
      todayCompletion = {
        date: today,
        day_of_week: getDayOfWeek(today),
        completedSteps: [],
        allCompleted: false,
        morning_completed: false,
        evening_completed: false,
        exercises_completed: false,
      };
      completions.push(todayCompletion);
    }

    // Add step if not already completed
    if (!todayCompletion.completedSteps.includes(stepId)) {
      todayCompletion.completedSteps.push(stepId);
    }

    // Check if all steps are completed
    const routineData = data;
    const allSteps = [
      ...(routineData.ingredientSelections || []).filter((ing: any) => ing.state === 'added' || ing.state === 'active').map((ing: any) => ing.ingredient_id),
      ...(routineData.exerciseSelections || []).filter((ex: any) => ex.state === 'added').map((ex: any) => ex.exercise_id),
    ];
    
    todayCompletion.allCompleted = allSteps.every(stepId => 
      todayCompletion.completedSteps.includes(stepId)
    );

    // Update Firestore
    await updateDoc(doc(db, 'users', userId), {
      dailyCompletions: completions,
    });
  } catch (error) {
    console.error('Error marking step completed:', error);
    throw error;
  }
}

/**
 * Mark a step as uncompleted for today
 */
export async function markStepUncompleted(
  userId: string,
  stepId: string
): Promise<void> {
  try {
    const today = getTodayDateString();
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const data = userDoc.data();
    const completions: DailyCompletion[] = data.dailyCompletions || [];
    
    // Find today's completion record
    const todayCompletion = completions.find(c => c.date === today);
    
    if (todayCompletion) {
      // Remove step from completed list
      todayCompletion.completedSteps = todayCompletion.completedSteps.filter(
        id => id !== stepId
      );
      todayCompletion.allCompleted = false;

      // Update Firestore
      await updateDoc(doc(db, 'users', userId), {
        dailyCompletions: completions,
      });
    }
  } catch (error) {
    console.error('Error marking step uncompleted:', error);
    throw error;
  }
}

/**
 * Get today's completed steps
 */
export async function getTodayCompletedSteps(userId: string): Promise<string[]> {
  try {
    const today = getTodayDateString();
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return [];
    }

    const data = userDoc.data();
    const completions: DailyCompletion[] = data.dailyCompletions || [];
    const todayCompletion = completions.find(c => c.date === today);
    
    return todayCompletion?.completedSteps || [];
  } catch (error) {
    console.error('Error getting today completed steps:', error);
    return [];
  }
}

/**
 * Calculate daily section scores (0.0-10.0 for each section)
 * Returns scores for morning, evening, and exercises sections
 * 
 * Simplified logic:
 * - Morning: (completed steps / expected steps) * 10
 * - Evening: (completed steps / expected steps) * 10
 * - Exercises: (completed exercises / total exercises) * 10
 */
export async function calculateDailySectionScores(userId: string, date: string): Promise<{
  morning: number;
  evening: number;
  exercises: number;
}> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return { morning: 0, evening: 0, exercises: 0 };
    }

    const data = userDoc.data();
    const completions: DailyCompletion[] = data.dailyCompletions || [];
    const todayCompletion = completions.find(c => c.date === date);
    
    // Get session completions to determine which sections were actually completed
    const sessionCompletions: any[] = data.sessionCompletions || [];
    const todaySessionCompletion = sessionCompletions.find((c: any) => c.date === date);
    const morningSessionCompleted = todaySessionCompletion?.morning === true;
    const eveningSessionCompleted = todaySessionCompletion?.evening === true;
    
    // Get exercise completions for this date
    const exerciseCompletions: any[] = data.exerciseCompletions || [];
    const todayExerciseCompletion = exerciseCompletions.find((c: any) => c.date === date);
    const completedExerciseIds = todayExerciseCompletion?.exercises 
      ? Object.keys(todayExerciseCompletion.exercises).filter(id => todayExerciseCompletion.exercises[id] === true)
      : [];

    // Get skipped steps for this date (from stepSkips array)
    const stepSkips: any[] = data.stepSkips || [];
    const skippedStepIds = stepSkips
      .filter((skip: any) => skip.date === date)
      .map((skip: any) => skip.step_id);

    // Get all ingredient selections
    const guideBlocks = require('../data/guide_blocks.json');
    const ingredients: any[] = guideBlocks.ingredients || [];
    const baseSteps: any[] = guideBlocks.base_steps || [];
    
    const ingredientSelections = (data.ingredientSelections || [])
      .filter((ing: any) => ing.state === 'added' || ing.state === 'active');
    
    // Build morning and evening ingredient lists
    // For flexible timing ingredients, count them in both sections if both sessions completed,
    // or in the section where the session was completed
    const morningIngredientIds: string[] = [];
    const eveningIngredientIds: string[] = [];
    
    ingredientSelections.forEach((sel: any) => {
      const ingredient = ingredients.find((ing: any) => ing.ingredient_id === sel.ingredient_id);
      if (!ingredient) return;
      
      const timingOptions = ingredient.timing_options || [];
      const hasMorning = timingOptions.includes('morning');
      const hasEvening = timingOptions.includes('evening');
      const isFlexible = hasMorning && hasEvening;
      
      if (hasMorning) {
        // Add to morning if:
        // - It's morning-only, OR
        // - It's flexible AND morning session was completed
        if (!isFlexible || morningSessionCompleted) {
          morningIngredientIds.push(sel.ingredient_id);
        }
      }
      if (hasEvening) {
        // Add to evening if:
        // - It's evening-only, OR
        // - It's flexible AND evening session was completed
        if (!isFlexible || eveningSessionCompleted) {
          eveningIngredientIds.push(sel.ingredient_id);
        }
      }
    });
    
    // Add base steps (wash_face) to morning or evening based on timing
    const washFace = baseSteps.find((bs: any) => bs.step_id === 'wash_face');
    const washFaceId = washFace?.step_id;
    if (washFaceId) {
      const washFaceTiming = washFace.timing_options || [];
      const washFaceHasMorning = washFaceTiming.includes('morning');
      const washFaceHasEvening = washFaceTiming.includes('evening');
      const washFaceIsFlexible = washFaceHasMorning && washFaceHasEvening;
      
      if (washFaceHasMorning) {
        // Add to morning if morning-only OR (flexible AND morning session completed)
        if (!washFaceIsFlexible || morningSessionCompleted) {
          morningIngredientIds.push(washFaceId);
        }
      }
      if (washFaceHasEvening) {
        // Add to evening if evening-only OR (flexible AND evening session completed)
        if (!washFaceIsFlexible || eveningSessionCompleted) {
          eveningIngredientIds.push(washFaceId);
        }
      }
    }
    
    // Get exercises (excluding mewing and exercises without completion tracking)
    const { getAllExercises } = require('./exerciseService');
    const allExercises = getAllExercises();
    const allExerciseIds = (data.exerciseSelections || [])
      .filter((ex: any) => {
        if (ex.state !== 'added' || ex.exercise_id === 'mewing') {
          return false;
        }
        // Only include exercises that have has_completion: true
        const exercise = allExercises.find((e: any) => e.exercise_id === ex.exercise_id);
        return exercise && exercise.has_completion === true;
      })
      .map((ex: any) => ex.exercise_id);
    
    // Get completed steps from daily completions
    const completedSteps = todayCompletion?.completedSteps || [];
    
    // Calculate morning section score
    const morningExpected = morningIngredientIds.filter(id => !skippedStepIds.includes(id));
    const completedMorning = completedSteps.filter(id => 
      morningExpected.includes(id) && !skippedStepIds.includes(id)
    );
    const morningPercentage = morningExpected.length > 0 
      ? completedMorning.length / morningExpected.length 
      : 0;
    const morningScore = Math.round(morningPercentage * 10 * 10) / 10;
    
    // Calculate evening section score
    const eveningExpected = eveningIngredientIds.filter(id => !skippedStepIds.includes(id));
    const completedEvening = completedSteps.filter(id => 
      eveningExpected.includes(id) && !skippedStepIds.includes(id)
    );
    const eveningPercentage = eveningExpected.length > 0 
      ? completedEvening.length / eveningExpected.length 
      : 0;
    const eveningScore = Math.round(eveningPercentage * 10 * 10) / 10;
    
    // Calculate exercises section score
    const exercisesExpected = allExerciseIds.filter(id => !skippedStepIds.includes(id));
    const completedExercises = completedExerciseIds.filter(id => 
      exercisesExpected.includes(id) && !skippedStepIds.includes(id)
    );
    const exercisesPercentage = exercisesExpected.length > 0 
      ? completedExercises.length / exercisesExpected.length 
      : 0;
    const exercisesScore = Math.round(exercisesPercentage * 10 * 10) / 10;
    
    return {
      morning: Math.min(10.0, Math.max(0.0, morningScore)),
      evening: Math.min(10.0, Math.max(0.0, eveningScore)),
      exercises: Math.min(10.0, Math.max(0.0, exercisesScore)),
    };
  } catch (error) {
    console.error('Error calculating daily section scores:', error);
    return { morning: 0, evening: 0, exercises: 0 };
  }
}

/**
 * Calculate daily completion score (0.0-10.0)
 * Based on equal weight (1/3 each) for morning, evening, and exercises sections
 * 
 * Formula: (morningScore + eveningScore + exercisesScore) / 3
 * Always divides by 3, even if a section has 0 expected steps (counts as 0)
 */
export async function calculateDailyScore(userId: string, date: string): Promise<number> {
  try {
    // Get section scores (each is 0.0-10.0)
    const sectionScores = await calculateDailySectionScores(userId, date);
    
    // Always average all three sections equally (1/3 each)
    // This ensures consistent scoring regardless of which sections have steps
    const totalScore = sectionScores.morning + sectionScores.evening + sectionScores.exercises;
    const averageScore = totalScore / 3;
    
    // Round to 1 decimal place
    const score = Math.round(averageScore * 10) / 10;
    
    return Math.min(10.0, Math.max(0.0, score));
  } catch (error) {
    console.error('Error calculating daily score:', error);
    return 0;
  }
}

/**
 * Calculate weekly consistency score
 * Returns average daily score (0.0-10.0) for the week
 * Uses the same logic as getWeeklySummary to ensure consistency
 */
export async function calculateWeeklyConsistency(userId: string): Promise<number> {
  try {
    const weekStart = getWeekStartDateString();
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return 0;
    }

    const data = userDoc.data();
    const completions: DailyCompletion[] = data.dailyCompletions || [];
    const sessionCompletions: any[] = data.sessionCompletions || [];
    
    // Calculate days revealed (from when user started to today, inclusive)
    // IMPORTANT: Only count days from when user actually started using the app
    const today = getTodayDateString();
    const todayParts = today.split('-').map(Number);
    const weekStartParts = weekStart.split('-').map(Number);
    const todayDate = new Date(todayParts[0], todayParts[1] - 1, todayParts[2]);
    const weekStartDateObj = new Date(weekStartParts[0], weekStartParts[1] - 1, weekStartParts[2]);
    
    // Get when user actually started (routineStartDate or signupDate as fallback)
    const routineStartDateStr = data.routineStartDate || data.routine_started_date || data.signupDate || data.signup_date;
    let actualStartDate = weekStartDateObj; // Default to week start
    
    if (routineStartDateStr) {
      // Parse the date string directly to avoid timezone issues
      const routineStartDateOnly = routineStartDateStr.split('T')[0]; // Get date part before time
      const routineStartDateParts = routineStartDateOnly.split('-').map(Number);
      const routineStartDateObj = new Date(routineStartDateParts[0], routineStartDateParts[1] - 1, routineStartDateParts[2]);
      routineStartDateObj.setHours(0, 0, 0, 0);
      
      // Use the later of: week start or when they actually started
      if (routineStartDateObj > weekStartDateObj) {
        actualStartDate = routineStartDateObj;
      }
    }
    
    // Calculate days from actual start to today (inclusive)
    actualStartDate.setHours(0, 0, 0, 0);
    todayDate.setHours(0, 0, 0, 0);
    
    const timeDiff = todayDate.getTime() - actualStartDate.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const daysRevealedForOverall = Math.min(Math.max(1, daysDiff + 1), 7); // At least 1 day, max 7 days
    
    // Helper to format local date (avoid timezone issues with toISOString)
    const formatLocalDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    // Calculate overall consistency score (0.0-10.0) as average of daily scores
    // IMPORTANT: Calculate scores for ALL days revealed, not just days with completion data
    // Days without data should count as 0.0
    const dailyScores: number[] = [];
    
    // Calculate scores starting from when user actually started, not week start
    for (let i = 0; i < daysRevealedForOverall; i++) {
      const checkDate = new Date(actualStartDate);
      checkDate.setDate(actualStartDate.getDate() + i);
      // Use local date formatting instead of toISOString() to avoid timezone shifts
      const checkDateStr = formatLocalDate(checkDate);
      
      // Calculate score for this day (will be 0.0 if no completions)
      const score = await calculateDailyScore(userId, checkDateStr);
      dailyScores.push(score);
    }
    
    // Average all days revealed (including days with 0 score)
    const totalScore = dailyScores.reduce((sum, s) => sum + s, 0);
    const overallConsistency = daysRevealedForOverall > 0
      ? Math.round((totalScore / daysRevealedForOverall) * 10) / 10
      : 0;
    
    return overallConsistency;
  } catch (error) {
    console.error('Error calculating weekly consistency:', error);
    return 0;
  }
}

/**
 * Weekly Summary Data
 */
export interface WeeklySummaryData {
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  overallConsistency: number; // 0.0-10.0 score (displayed as percentage)
  daysCompleted: number; // 0-7 (days with any completion)
  breakdown: {
    morning: number; // score (0.0-10.0)
    evening: number; // score (0.0-10.0)
    exercises: number; // score (0.0-10.0)
    morningDays: number; // days completed (for comparison)
    eveningDays: number; // days completed (for comparison)
    exercisesDays: number; // days completed (for comparison)
  };
  breakdownPreviousWeek: {
    morning: number; // score (0.0-10.0)
    evening: number; // score (0.0-10.0)
    exercises: number; // score (0.0-10.0)
  };
  currentStreak: number; // consecutive days
  bestStreak: number; // best consecutive days ever
  trend: 'up' | 'down' | 'same'; // compared to previous week
  previousWeekConsistency?: number; // 0.0-10.0 score for trend calculation
  timerSkips: number; // count of timer skips this week
  productSkips: number; // count of product skips this week
  exerciseEarlyEnds: number; // count of exercises ended early this week
  skippedProducts: Array<{
    stepId: string;
    productName: string;
    count: number;
  }>; // list of skipped products with names and counts
  mostSkippedStep: {
    stepId: string;
    stepName: string;
    count: number;
  } | null;
}

/**
 * Get detailed weekly summary data
 * Includes breakdown by routine type, streaks, and trends
 */
export async function getWeeklySummary(userId: string): Promise<WeeklySummaryData> {
  try {
    const weekStart = getWeekStartDateString();
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const data = userDoc.data();
    const completions: DailyCompletion[] = data.dailyCompletions || [];
    const sessionCompletions: any[] = data.sessionCompletions || [];
    
    // Calculate week end date (Sunday)
    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);
    const weekEnd = weekEndDate.toISOString().split('T')[0];
    
    // Get all completion records from this week (any completion, not just fully completed)
    const weekCompletions = completions.filter(c => {
      return c.date >= weekStart && c.date <= weekEnd;
    });
    
    // Get session completions for this week
    const weekSessions = sessionCompletions.filter((c: any) => {
      return c.date >= weekStart && c.date <= weekEnd;
    });

    // Count unique days with any completion data (for display purposes)
    const uniqueDays = new Set(weekCompletions.map(c => c.date));
    const daysCompleted = uniqueDays.size;
    
    // Calculate days revealed (from when user started to today, inclusive)
    // IMPORTANT: Only count days from when user actually started using the app
    // If they signed up on Wednesday, don't count Monday/Tuesday as 0 - only count from Wednesday
    const today = getTodayDateString();
    const todayParts = today.split('-').map(Number);
    const weekStartParts = weekStart.split('-').map(Number);
    const todayDate = new Date(todayParts[0], todayParts[1] - 1, todayParts[2]);
    const weekStartDateObj = new Date(weekStartParts[0], weekStartParts[1] - 1, weekStartParts[2]);
    
    // Get when user actually started (routineStartDate or signupDate as fallback)
    const routineStartDateStr = data.routineStartDate || data.routine_started_date || data.signupDate || data.signup_date;
    let actualStartDate = weekStartDateObj; // Default to week start
    
    if (routineStartDateStr) {
      // Parse the date string directly to avoid timezone issues
      // Extract just the date part (YYYY-MM-DD) before parsing
      const routineStartDateOnly = routineStartDateStr.split('T')[0]; // Get date part before time
      const routineStartDateParts = routineStartDateOnly.split('-').map(Number);
      const routineStartDateObj = new Date(routineStartDateParts[0], routineStartDateParts[1] - 1, routineStartDateParts[2]);
      routineStartDateObj.setHours(0, 0, 0, 0);
      
      // Use the later of: week start or when they actually started
      // If they started on Wednesday, use Wednesday, not Monday
      if (routineStartDateObj > weekStartDateObj) {
        actualStartDate = routineStartDateObj;
      }
    }
    
    // Calculate days from actual start to today (inclusive)
    // Make sure both dates are at midnight for accurate day counting
    actualStartDate.setHours(0, 0, 0, 0);
    todayDate.setHours(0, 0, 0, 0);
    
    // Calculate days difference
    // Example: Dec 27 00:00 to Dec 30 00:00 = 3 * 24 hours = 3 days difference
    // But we want inclusive, so Dec 27, 28, 29, 30 = 4 days total
    const timeDiff = todayDate.getTime() - actualStartDate.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    // Add 1 because we want inclusive (both start and end day count)
    // If same day: daysDiff = 0, so daysRevealed = 1 (correct)
    // If 1 day apart: daysDiff = 1, so daysRevealed = 2 (correct: today and yesterday)
    // If 3 days apart: daysDiff = 3, so daysRevealed = 4 (correct: Dec 27, 28, 29, 30)
    const daysRevealedForOverall = Math.min(Math.max(1, daysDiff + 1), 7); // At least 1 day, max 7 days
    
    // Helper to format local date (avoid timezone issues with toISOString)
    const formatLocalDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    // Debug: Log the date calculation to diagnose issues
    console.log('Date Calculation Debug:', {
      actualStartDateStr: formatLocalDate(actualStartDate),
      todayDateStr: formatLocalDate(todayDate),
      actualStartDateMs: actualStartDate.getTime(),
      todayDateMs: todayDate.getTime(),
      timeDiff,
      daysDiff,
      daysRevealedForOverall,
      calculation: `(${formatLocalDate(todayDate)} - ${formatLocalDate(actualStartDate)}) = ${daysDiff} days diff, +1 = ${daysRevealedForOverall} days total`,
    });
    
    // Calculate overall consistency score (0.0-10.0) as average of daily scores
    // IMPORTANT: Calculate scores for ALL days revealed, not just days with completion data
    // Days without data should count as 0.0
    const dailyScores: number[] = [];
    const dailyScoreDetails: Array<{ date: string; score: number; hasData: boolean }> = [];
    
    // Calculate scores starting from when user actually started, not week start
    // IMPORTANT: This loop MUST include today (the last day)
    
    const calculatedDates: string[] = [];
    for (let i = 0; i < daysRevealedForOverall; i++) {
      const checkDate = new Date(actualStartDate);
      checkDate.setDate(actualStartDate.getDate() + i);
      // Use local date formatting instead of toISOString() to avoid timezone shifts
      const checkDateStr = formatLocalDate(checkDate);
      calculatedDates.push(checkDateStr);
      
      // Check if there's any completion data for this day
      const hasCompletionData = completions.some(c => c.date === checkDateStr) ||
                                sessionCompletions.some((c: any) => c.date === checkDateStr) ||
                                (data.exerciseCompletions || []).some((c: any) => c.date === checkDateStr);
      
      // Calculate score for this day (will be 0.0 if no completions)
      const score = await calculateDailyScore(userId, checkDateStr);
      dailyScores.push(score);
      dailyScoreDetails.push({ date: checkDateStr, score, hasData: hasCompletionData });
    }
    
    // Debug: Verify we're including today
    const todayStr = formatLocalDate(todayDate);
    const includesToday = calculatedDates.includes(todayStr);
    console.log('Daily Scores Calculation:', {
      calculatedDates,
      todayStr,
      includesToday,
      daysRevealedForOverall,
      warning: includesToday ? 'OK: Today is included' : 'ERROR: Today is missing!',
    });
    
    // Average all days revealed (including days with 0 score)
    const totalScore = dailyScores.reduce((sum, s) => sum + s, 0);
    const overallConsistency = daysRevealedForOverall > 0
      ? Math.round((totalScore / daysRevealedForOverall) * 10) / 10
      : 0;
    
    // Debug logging to help diagnose issues
    console.log('Overall Consistency Calculation:', {
      weekStart,
      actualStartDate: actualStartDate.toISOString().split('T')[0],
      routineStartDate: routineStartDateStr,
      today,
      daysRevealedForOverall,
      dailyScoreDetails,
      totalScore,
      overallConsistency,
      calculation: `${totalScore} / ${daysRevealedForOverall} = ${overallConsistency}`,
    });
    
    // Calculate previous week dates first (needed for breakdown comparison)
    const previousWeekStart = new Date(weekStartDate);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const previousWeekStartStr = previousWeekStart.toISOString().split('T')[0];
    const previousWeekEnd = new Date(previousWeekStart);
    previousWeekEnd.setDate(previousWeekStart.getDate() + 6);
    const previousWeekEndStr = previousWeekEnd.toISOString().split('T')[0];
    
    // Calculate breakdown by routine type using simple day-based approach
    // Reuse daysRevealedForOverall and actualStartDate that we calculated above
    const daysRevealed = daysRevealedForOverall;
    
    // Debug logging (can be removed later)
    console.log('Weekly Summary Debug:', {
      today,
      weekStart,
      actualStartDate: actualStartDate.toISOString().split('T')[0],
      routineStartDate: routineStartDateStr,
      daysRevealed,
      todayDayOfWeek: todayDate.getDay(),
    });
    
    // Count days with morning completed (only from when user started)
    let morningDaysCompleted = 0;
    weekSessions.forEach((session: any) => {
      // Only count sessions from when user actually started
      if (session.date >= actualStartDate.toISOString().split('T')[0] && session.morning === true) {
        morningDaysCompleted++;
      }
    });
    
    // Count days with evening completed (only from when user started)
    let eveningDaysCompleted = 0;
    weekSessions.forEach((session: any) => {
      // Only count sessions from when user actually started
      if (session.date >= actualStartDate.toISOString().split('T')[0] && session.evening === true) {
        eveningDaysCompleted++;
      }
    });
    
    // Count individual exercise completions (not just days where all are completed)
    // Get user's exercises (excluding mewing)
    const { getAllExercises } = require('./exerciseService');
    const allExercises = getAllExercises();
    const userExerciseSelections = (data.exerciseSelections || [])
      .filter((ex: any) => {
        if (ex.state !== 'added' || ex.exercise_id === 'mewing') {
          return false;
        }
        // Only include exercises that have has_completion: true
        const exercise = allExercises.find((e: any) => e.exercise_id === ex.exercise_id);
        return exercise && exercise.has_completion === true;
      });
    const numExercises = userExerciseSelections.length;
    
    // Count individual exercise completions across all days in the week
    const exerciseCompletions: any[] = data.exerciseCompletions || [];
    let totalExerciseCompletions = 0;
    let exerciseDaysCompleted = 0; // Keep for backward compatibility
    
    // Get exercise IDs from userExerciseSelections for easier lookup
    const userExerciseIds = userExerciseSelections.map((ex: any) => ex.exercise_id);
    
    // Debug: Log exercise completion data for troubleshooting
    console.log('Exercises Analytics Debug:', {
      numExercises,
      userExerciseIds,
      totalExerciseCompletionsInDB: exerciseCompletions.length,
      exerciseCompletionsDates: exerciseCompletions.map((c: any) => c.date),
      daysRevealed,
    });
    
    // Check each day from when user started (up to today)
    // Count individual exercise completions across all days, even if only partially completed
    // IMPORTANT: Exercise completions are stored using getTodayDateString() which uses toISOString()
    // So we must use toISOString() here too to match the stored format
    for (let i = 0; i < daysRevealed; i++) {
      const checkDate = new Date(actualStartDate);
      checkDate.setDate(actualStartDate.getDate() + i);
      checkDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone shifts when converting to ISO
      // Use toISOString() to match how dates are stored in exerciseCompletions (via getTodayDateString())
      const checkDateStr = checkDate.toISOString().split('T')[0];
      
      // Find exercise completion for this day
      const dayExerciseCompletion = exerciseCompletions.find((c: any) => c.date === checkDateStr);
      
      // Debug: Log lookup attempts
      if (dayExerciseCompletion) {
        console.log(`Found exercise completion for ${checkDateStr}:`, dayExerciseCompletion.exercises);
      }
      
      // Count individual exercise completions for this day (even if not all exercises are done)
      if (dayExerciseCompletion && dayExerciseCompletion.exercises) {
        let allExercisesCompleted = true;
        
        // Count how many exercises were completed on this day
        // Check each exercise ID from user's routine
        for (const exerciseId of userExerciseIds) {
          if (dayExerciseCompletion.exercises[exerciseId] === true) {
            totalExerciseCompletions++;
          } else {
            allExercisesCompleted = false;
          }
        }
        
        // Track days where all exercises completed (for backward compatibility)
        if (allExercisesCompleted && numExercises > 0) {
          exerciseDaysCompleted++;
        }
      }
      // Note: If no exercise completion record exists for a day, that's fine - 
      // it means 0 exercises were completed that day, which is correct
    }
    
    // Calculate scores using per-day accumulation
    // Morning: (days completed / days revealed) × 10.0
    const morningAvg = daysRevealed > 0
      ? Math.round((morningDaysCompleted / daysRevealed) * 10 * 10) / 10
      : 0;
    
    // Evening: (days completed / days revealed) × 10.0
    const eveningAvg = daysRevealed > 0
      ? Math.round((eveningDaysCompleted / daysRevealed) * 10 * 10) / 10
      : 0;
    
    // Exercises: (total exercise completions / (numExercises × daysRevealed)) × 10.0
    // This counts individual exercise completions across all days in the week
    // Example: 2 exercises, Tuesday (2 days revealed) = 4 possible completions
    //   - If 2 exercises completed today, 0 yesterday: (2 / 4) × 10 = 5.0
    //   - If 4 exercises completed (both days): (4 / 4) × 10 = 10.0
    //   - If 1 exercise completed today: (1 / 4) × 10 = 2.5
    const totalPossibleExerciseCompletions = numExercises * daysRevealed;
    const exercisesAvg = totalPossibleExerciseCompletions > 0
      ? Math.round((totalExerciseCompletions / totalPossibleExerciseCompletions) * 10 * 10) / 10
      : 0;
    
    // Debug: Log final exercises calculation
    console.log('Exercises Score Calculation:', {
      totalExerciseCompletions,
      totalPossibleExerciseCompletions,
      exercisesAvg,
      calculation: `${totalExerciseCompletions} / ${totalPossibleExerciseCompletions} × 10 = ${exercisesAvg}`,
    });
    
    // Also calculate days completed for reference (keep for backward compatibility)
    const breakdownDays = {
      morning: 0,
      evening: 0,
      exercises: 0,
    };
    
    weekSessions.forEach((session: any) => {
      if (session.morning) breakdownDays.morning++;
      if (session.evening) breakdownDays.evening++;
      if (session.exercises) breakdownDays.exercises++;
    });
    
    const breakdown = {
      morning: morningAvg,
      evening: eveningAvg,
      exercises: exercisesAvg,
      morningDays: breakdownDays.morning,
      eveningDays: breakdownDays.evening,
      exercisesDays: breakdownDays.exercises,
    };
    
    // Get previous week breakdown for comparison (use same simple day-based approach)
    const prevWeekSessions = sessionCompletions.filter((c: any) => {
      return c.date >= previousWeekStartStr && c.date <= previousWeekEndStr;
    });
    
    // Previous week is complete (7 days)
    const prevDaysRevealed = 7;
    
    // Count days with morning completed in previous week
    let prevMorningDaysCompleted = 0;
    prevWeekSessions.forEach((session: any) => {
      if (session.morning === true) {
        prevMorningDaysCompleted++;
      }
    });
    
    // Count days with evening completed in previous week
    let prevEveningDaysCompleted = 0;
    prevWeekSessions.forEach((session: any) => {
      if (session.evening === true) {
        prevEveningDaysCompleted++;
      }
    });
    
    // Count individual exercise completions in previous week
    let prevTotalExerciseCompletions = 0;
    let prevExerciseDaysCompleted = 0; // Keep for backward compatibility
    const prevWeekStartDateObj = new Date(previousWeekStartStr);
    
    // Use the same exercise IDs list
    // IMPORTANT: Use toISOString() to match how dates are stored in exerciseCompletions
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(prevWeekStartDateObj);
      checkDate.setDate(prevWeekStartDateObj.getDate() + i);
      checkDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone shifts when converting to ISO
      const checkDateStr = checkDate.toISOString().split('T')[0];
      
      const dayExerciseCompletion = exerciseCompletions.find((c: any) => c.date === checkDateStr);
      
      if (dayExerciseCompletion && dayExerciseCompletion.exercises) {
        let allExercisesCompleted = true;
        
        // Count how many exercises were completed on this day
        // Check each exercise ID from user's routine
        for (const exerciseId of userExerciseIds) {
          if (dayExerciseCompletion.exercises[exerciseId] === true) {
            prevTotalExerciseCompletions++;
          } else {
            allExercisesCompleted = false;
          }
        }
        
        // Track days where all exercises completed (for backward compatibility)
        if (allExercisesCompleted && numExercises > 0) {
          prevExerciseDaysCompleted++;
        }
      }
    }
    
    // Calculate previous week scores using same logic as current week
    const prevMorningAvg = Math.round((prevMorningDaysCompleted / prevDaysRevealed) * 10 * 10) / 10;
    const prevEveningAvg = Math.round((prevEveningDaysCompleted / prevDaysRevealed) * 10 * 10) / 10;
    const prevTotalPossibleExerciseCompletions = numExercises * prevDaysRevealed;
    const prevExercisesAvg = prevTotalPossibleExerciseCompletions > 0
      ? Math.round((prevTotalExerciseCompletions / prevTotalPossibleExerciseCompletions) * 10 * 10) / 10
      : 0;
    
    const breakdownPreviousWeek = {
      morning: prevMorningAvg,
      evening: prevEveningAvg,
      exercises: prevExercisesAvg,
    };
    
    
    // Calculate trend (compare to previous week) - do this early so we can use it in early returns
    // Get previous week completions to calculate overall consistency
    const previousWeekCompletions = completions.filter(c => {
      return c.date >= previousWeekStartStr && c.date <= previousWeekEndStr;
    });
    const prevUniqueDays = new Set(previousWeekCompletions.map(c => c.date));
    
    const prevDailyScores: number[] = [];
    for (const date of prevUniqueDays) {
      const score = await calculateDailyScore(userId, date);
      prevDailyScores.push(score);
    }
    const previousWeekConsistency = prevDailyScores.length > 0
      ? Math.round((prevDailyScores.reduce((sum, s) => sum + s, 0) / prevDailyScores.length) * 10) / 10
      : 0;
    
    // Calculate current streak (consecutive days with score >= 7.0)
    // Streak counts up to the most recent completed day
    // Get all days with completion data and calculate their scores
    const allDaysWithData = completions.map(c => c.date);
    const dayScores: { date: string; score: number }[] = [];
    for (const date of allDaysWithData) {
      const score = await calculateDailyScore(userId, date);
      dayScores.push({ date, score });
    }
    
    // Filter to days with score >= 7.0 (considered "completed" for streak)
    const allCompletions = dayScores
      .filter(d => d.score >= 7.0)
      .map(d => d.date)
      .sort()
      .reverse(); // Most recent first
    
    // Get skip counts and most skipped step (need to await these)
    const { 
      getTimerSkipCount, 
      getMostSkippedStep,
      getProductSkipCount,
      getExerciseEarlyEndCount,
      getSkippedProductsWithCounts
    } = await import('./analyticsService');
    const timerSkips = await getTimerSkipCount(userId, weekStart, weekEnd);
    const productSkips = await getProductSkipCount(userId, weekStart, weekEnd);
    const exerciseEarlyEnds = await getExerciseEarlyEndCount(userId, weekStart, weekEnd);
    const skippedProducts = await getSkippedProductsWithCounts(userId, weekStart, weekEnd);
    const mostSkippedStep = await getMostSkippedStep(userId, weekStart, weekEnd);
    
    if (allCompletions.length === 0) {
      let trend: 'up' | 'down' | 'same' = 'same';
      if (overallConsistency > previousWeekConsistency) {
        trend = 'up';
      } else if (overallConsistency < previousWeekConsistency) {
        trend = 'down';
      }
      
      return {
        weekStart,
        weekEnd,
        overallConsistency,
        daysCompleted,
        breakdown,
        breakdownPreviousWeek,
        currentStreak: 0,
        bestStreak: 0,
        trend,
        previousWeekConsistency,
        timerSkips,
        productSkips,
        exerciseEarlyEnds,
        skippedProducts,
        mostSkippedStep,
      };
    }
    
    let currentStreak = 0;
    // Reuse 'today' variable declared earlier in function
    let checkDate = new Date(today);
    
    // Count backwards from today (or yesterday if today not completed)
    // First, check if today is completed
    const todayCompleted = allCompletions.includes(today);
    if (!todayCompleted) {
      // Start from yesterday
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    // Count consecutive days backwards
    for (let i = 0; i < 365; i++) { // Max 1 year lookback
      const dateStr = checkDate.toISOString().split('T')[0];
      if (allCompletions.includes(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    // Calculate best streak ever
    let bestStreak = 0;
    let tempStreak = 0;
    const sortedDates = [...allCompletions].sort();
    
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const daysDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          tempStreak++;
        } else {
          bestStreak = Math.max(bestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }
    bestStreak = Math.max(bestStreak, tempStreak);
    
    // Calculate trend (previousWeekConsistency was already calculated above)
    let trend: 'up' | 'down' | 'same' = 'same';
    if (overallConsistency > previousWeekConsistency) {
      trend = 'up';
    } else if (overallConsistency < previousWeekConsistency) {
      trend = 'down';
    }
    
    // Calculate total days completed for stats
    const totalDaysCompleted = allCompletions.length;
    
    // Get existing stats to preserve best_streak if it's higher
    const existingStats = data.stats || {};
    const existingBestStreak = existingStats.best_streak || 0;
    const finalBestStreak = Math.max(bestStreak, existingBestStreak);
    
    // Update stats in Firestore (fire and forget - don't wait for it)
    updateUserStats(userId, currentStreak, finalBestStreak, totalDaysCompleted).catch(
      (error) => console.error('Error updating stats in weekly summary:', error)
    );
    
    return {
      weekStart,
      weekEnd,
      overallConsistency,
      daysCompleted,
      breakdown,
      breakdownPreviousWeek,
      currentStreak,
      bestStreak,
      trend,
      previousWeekConsistency,
      timerSkips,
      productSkips,
      exerciseEarlyEnds,
      skippedProducts,
      mostSkippedStep,
    };
  } catch (error) {
    console.error('Error getting weekly summary:', error);
    throw error;
  }
}

/**
 * Update user stats in Firestore
 * Stores current_streak, best_streak, and total_days_completed
 */
export async function updateUserStats(
  userId: string,
  currentStreak: number,
  bestStreak: number,
  totalDaysCompleted: number
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), {
      stats: {
        current_streak: currentStreak,
        best_streak: bestStreak,
        total_days_completed: totalDaysCompleted,
        last_updated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error updating user stats:', error);
    throw error;
  }
}

/**
 * Calculate and update user stats
 * This should be called after daily completions to keep stats up to date
 */
export async function calculateAndUpdateStats(userId: string): Promise<void> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const data = userDoc.data();
    const completions: DailyCompletion[] = data.dailyCompletions || [];
    
    // Get all days with completion data and calculate their scores
    const allDaysWithData = completions.map(c => c.date);
    const dayScores: { date: string; score: number }[] = [];
    for (const date of allDaysWithData) {
      const score = await calculateDailyScore(userId, date);
      dayScores.push({ date, score });
    }
    
    // Filter to days with score >= 7.0 (considered "completed" for streak)
    const allCompletions = dayScores
      .filter(d => d.score >= 7.0)
      .map(d => d.date)
      .sort()
      .reverse(); // Most recent first
    
    // Calculate current streak
    let currentStreak = 0;
    const today = getTodayDateString();
    let checkDate = new Date(today);
    
    // Count backwards from today (or yesterday if today not completed)
    const todayCompleted = allCompletions.includes(today);
    if (!todayCompleted) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    // Count consecutive days backwards
    for (let i = 0; i < 365; i++) { // Max 1 year lookback
      const dateStr = checkDate.toISOString().split('T')[0];
      if (allCompletions.includes(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    // Calculate best streak ever
    let bestStreak = 0;
    let tempStreak = 0;
    const sortedDates = [...allCompletions].sort();
    
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const daysDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          tempStreak++;
        } else {
          bestStreak = Math.max(bestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }
    bestStreak = Math.max(bestStreak, tempStreak);
    
    // Get existing stats to preserve best_streak if it's higher
    const existingStats = data.stats || {};
    const existingBestStreak = existingStats.best_streak || 0;
    const finalBestStreak = Math.max(bestStreak, existingBestStreak);
    
    // Total days completed is the count of all completions
    const totalDaysCompleted = allCompletions.length;
    
    // Update stats in Firestore
    await updateUserStats(userId, currentStreak, finalBestStreak, totalDaysCompleted);
  } catch (error) {
    console.error('Error calculating and updating stats:', error);
    throw error;
  }
}

