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
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  const monday = new Date(today);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
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
 * Calculate daily completion score (0.0-10.0)
 * Based on equal weight (1/3 each) for morning, evening, and exercises sections
 */
export async function calculateDailyScore(userId: string, date: string): Promise<number> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return 0;
    }

    const data = userDoc.data();
    const completions: DailyCompletion[] = data.dailyCompletions || [];
    const todayCompletion = completions.find(c => c.date === date);
    
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
    
    // Separate ingredients by timing (morning vs evening)
    const morningIngredientIds: string[] = [];
    const eveningIngredientIds: string[] = [];
    
    ingredientSelections.forEach((sel: any) => {
      const ingredient = ingredients.find((ing: any) => ing.ingredient_id === sel.ingredient_id);
      if (!ingredient) return;
      
      const timingOptions = ingredient.timing_options || [];
      if (timingOptions.includes('morning')) {
        morningIngredientIds.push(sel.ingredient_id);
      }
      if (timingOptions.includes('evening')) {
        eveningIngredientIds.push(sel.ingredient_id);
      }
    });
    
    // Add base steps (wash_face) to morning or evening based on timing
    const washFace = baseSteps.find((bs: any) => bs.step_id === 'wash_face');
    const washFaceId = washFace?.step_id;
    if (washFaceId) {
      const washFaceTiming = washFace.timing_options || [];
      if (washFaceTiming.includes('morning') && morningIngredientIds.length > 0) {
        morningIngredientIds.push(washFaceId);
      }
      if (washFaceTiming.includes('evening') && eveningIngredientIds.length > 0) {
        eveningIngredientIds.push(washFaceId);
      }
    }
    
    // Get exercises (excluding mewing)
    const allExerciseIds = (data.exerciseSelections || [])
      .filter((ex: any) => ex.state === 'added' && ex.exercise_id !== 'mewing')
      .map((ex: any) => ex.exercise_id);
    
    // Count completed items from different sources
    const completedSteps = todayCompletion?.completedSteps || [];
    
    // Count completed morning ingredients and base steps
    const completedMorningIds = completedSteps.filter(id => 
      morningIngredientIds.includes(id) && !skippedStepIds.includes(id)
    );
    
    // Count completed evening ingredients and base steps
    const completedEveningIds = completedSteps.filter(id => 
      eveningIngredientIds.includes(id) && !skippedStepIds.includes(id)
    );
    
    // Count completed exercises (from exerciseCompletions, not dailyCompletions)
    const completedExerciseCount = completedExerciseIds.filter(id => 
      allExerciseIds.includes(id) && !skippedStepIds.includes(id)
    ).length;
    
    // Calculate completion percentage for each section (0-1)
    // Morning section
    const morningExpected = morningIngredientIds.filter(id => !skippedStepIds.includes(id)).length;
    const morningPercentage = morningExpected > 0 ? completedMorningIds.length / morningExpected : 0;
    
    // Evening section
    const eveningExpected = eveningIngredientIds.filter(id => !skippedStepIds.includes(id)).length;
    const eveningPercentage = eveningExpected > 0 ? completedEveningIds.length / eveningExpected : 0;
    
    // Exercises section
    const exercisesExpected = allExerciseIds.filter(id => !skippedStepIds.includes(id)).length;
    const exercisesPercentage = exercisesExpected > 0 ? completedExerciseCount / exercisesExpected : 0;
    
    // If no sections have any expected steps, return 0
    if (morningExpected === 0 && eveningExpected === 0 && exercisesExpected === 0) {
      return 0;
    }
    
    // Calculate average of the three sections (equal weight: 1/3 each)
    // If a section has no expected steps, it doesn't contribute to the score
    let totalPercentage = 0;
    let sectionCount = 0;
    
    if (morningExpected > 0) {
      totalPercentage += morningPercentage;
      sectionCount++;
    }
    if (eveningExpected > 0) {
      totalPercentage += eveningPercentage;
      sectionCount++;
    }
    if (exercisesExpected > 0) {
      totalPercentage += exercisesPercentage;
      sectionCount++;
    }
    
    // Average percentage (0-1)
    const averagePercentage = sectionCount > 0 ? totalPercentage / sectionCount : 0;
    
    // Convert to 0.0-10.0 score (round to 1 decimal)
    const score = Math.round(averagePercentage * 10 * 10) / 10;
    
    return Math.min(10.0, Math.max(0.0, score));
  } catch (error) {
    console.error('Error calculating daily score:', error);
    return 0;
  }
}

/**
 * Calculate weekly consistency score
 * Returns average daily score (0.0-10.0) for the week
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
    
    // Get all completion records from this week
    const weekCompletions = completions.filter(c => {
      return c.date >= weekStart;
    });

    // Calculate daily scores for each day in the week
    const dailyScores: number[] = [];
    const uniqueDays = new Set(weekCompletions.map(c => c.date));
    
    // Calculate score for each day that has any completion data
    for (const date of uniqueDays) {
      const score = await calculateDailyScore(userId, date);
      dailyScores.push(score);
    }
    
    // If no days have data, return 0
    if (dailyScores.length === 0) {
      return 0;
    }
    
    // Calculate average (round to 1 decimal)
    const average = dailyScores.reduce((sum, score) => sum + score, 0) / dailyScores.length;
    return Math.round(average * 10) / 10;
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
    morning: number; // percentage (0-100)
    evening: number; // percentage (0-100)
    exercises: number; // percentage (0-100)
    morningDays: number; // days completed (for comparison)
    eveningDays: number; // days completed (for comparison)
    exercisesDays: number; // days completed (for comparison)
  };
  breakdownPreviousWeek: {
    morning: number; // percentage (0-100)
    evening: number; // percentage (0-100)
    exercises: number; // percentage (0-100)
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

    // Count unique days with any completion data
    const uniqueDays = new Set(weekCompletions.map(c => c.date));
    const daysCompleted = uniqueDays.size;
    
    // Calculate overall consistency score (0.0-10.0) as average of daily scores
    const dailyScores: number[] = [];
    for (const date of uniqueDays) {
      const score = await calculateDailyScore(userId, date);
      dailyScores.push(score);
    }
    
    const overallConsistency = dailyScores.length > 0
      ? Math.round((dailyScores.reduce((sum, s) => sum + s, 0) / dailyScores.length) * 10) / 10
      : 0;
    
    // Calculate previous week dates first (needed for breakdown comparison)
    const previousWeekStart = new Date(weekStartDate);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const previousWeekStartStr = previousWeekStart.toISOString().split('T')[0];
    const previousWeekEnd = new Date(previousWeekStart);
    previousWeekEnd.setDate(previousWeekStart.getDate() + 6);
    const previousWeekEndStr = previousWeekEnd.toISOString().split('T')[0];
    
    // Calculate breakdown by routine type (days completed)
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
    
    // Calculate percentages (0-100)
    const breakdown = {
      morning: Math.round((breakdownDays.morning / 7) * 100),
      evening: Math.round((breakdownDays.evening / 7) * 100),
      exercises: Math.round((breakdownDays.exercises / 7) * 100),
      morningDays: breakdownDays.morning,
      eveningDays: breakdownDays.evening,
      exercisesDays: breakdownDays.exercises,
    };
    
    // Get previous week breakdown for comparison
    const previousWeekSessions = sessionCompletions.filter((c: any) => {
      return c.date >= previousWeekStartStr && c.date <= previousWeekEndStr;
    });
    
    const prevBreakdownDays = {
      morning: 0,
      evening: 0,
      exercises: 0,
    };
    
    previousWeekSessions.forEach((session: any) => {
      if (session.morning) prevBreakdownDays.morning++;
      if (session.evening) prevBreakdownDays.evening++;
      if (session.exercises) prevBreakdownDays.exercises++;
    });
    
    const breakdownPreviousWeek = {
      morning: Math.round((prevBreakdownDays.morning / 7) * 100),
      evening: Math.round((prevBreakdownDays.evening / 7) * 100),
      exercises: Math.round((prevBreakdownDays.exercises / 7) * 100),
    };
    
    
    // Calculate trend (compare to previous week) - do this early so we can use it in early returns
    
    const previousWeekCompletions = completions.filter(c => {
      return c.date >= previousWeekStartStr && c.date <= previousWeekEndStr && c.allCompleted === true;
    });
    
    // Calculate previous week score
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
    const today = getTodayDateString();
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

