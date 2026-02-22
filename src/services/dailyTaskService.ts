/**
 * Daily Task Service
 * Manages user's selected habits and daily completions
 */

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getTodayDateString } from './completionService';
import { DAILY_HABITS, DailyHabit } from '../data/daily_habits';

export interface HabitCompletion {
  date: string;
  habitId: string;
  timestamp: string;
}

/**
 * Get user's selected habit IDs
 */
export async function getUserSelectedHabits(userId: string): Promise<string[]> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return [];

    const data = userDoc.data();
    return data.selectedHabits || [];
  } catch (error) {
    console.error('Error getting selected habits:', error);
    return [];
  }
}

/**
 * Toggle a habit in the user's selected list
 */
export async function toggleHabitSelection(userId: string, habitId: string): Promise<string[]> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) throw new Error('User document not found');

    const data = userDoc.data();
    const selected: string[] = data.selectedHabits || [];

    let updated: string[];
    if (selected.includes(habitId)) {
      updated = selected.filter(id => id !== habitId);
    } else {
      updated = [...selected, habitId];
    }

    await updateDoc(doc(db, 'users', userId), {
      selectedHabits: updated,
    });

    return updated;
  } catch (error) {
    console.error('Error toggling habit selection:', error);
    throw error;
  }
}

/**
 * Complete a habit for today and award XP
 */
export async function completeHabit(userId: string, habitId: string): Promise<void> {
  try {
    const today = getTodayDateString();
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) throw new Error('User document not found');

    const data = userDoc.data();
    const completions: HabitCompletion[] = data.habitCompletions || [];

    // Check if already completed today
    const alreadyDone = completions.some(c => c.date === today && c.habitId === habitId);
    if (alreadyDone) return;

    const newCompletion: HabitCompletion = {
      date: today,
      habitId,
      timestamp: new Date().toISOString(),
    };

    // Keep only last 90 days of completions to avoid unbounded growth
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const cutoffDate = ninetyDaysAgo.toISOString().split('T')[0];
    const trimmedCompletions = completions.filter(c => c.date >= cutoffDate);

    await updateDoc(doc(db, 'users', userId), {
      habitCompletions: [...trimmedCompletions, newCompletion],
    });

    // Award XP (fire and forget)
    import('./xpService').then(({ awardXP, XP_AMOUNTS }) => {
      awardXP(userId, XP_AMOUNTS.HABIT_COMPLETE, 'habit_complete').catch(console.error);
    }).catch(console.error);
  } catch (error) {
    console.error('Error completing habit:', error);
    throw error;
  }
}

/**
 * Uncomplete a habit for today
 */
export async function uncompleteHabit(userId: string, habitId: string): Promise<void> {
  try {
    const today = getTodayDateString();
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) throw new Error('User document not found');

    const data = userDoc.data();
    const completions: HabitCompletion[] = data.habitCompletions || [];

    const updated = completions.filter(c => !(c.date === today && c.habitId === habitId));

    await updateDoc(doc(db, 'users', userId), {
      habitCompletions: updated,
    });
  } catch (error) {
    console.error('Error uncompleting habit:', error);
    throw error;
  }
}

/**
 * Get habit completions for a specific date
 */
export async function getHabitCompletions(userId: string, date?: string): Promise<string[]> {
  try {
    const targetDate = date || getTodayDateString();
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return [];

    const data = userDoc.data();
    const completions: HabitCompletion[] = data.habitCompletions || [];

    return completions
      .filter(c => c.date === targetDate)
      .map(c => c.habitId);
  } catch (error) {
    console.error('Error getting habit completions:', error);
    return [];
  }
}

/**
 * Get user's active daily habits (selected habits with full data)
 */
export async function getUserDailyHabits(userId: string): Promise<DailyHabit[]> {
  const selectedIds = await getUserSelectedHabits(userId);
  return DAILY_HABITS.filter(h => selectedIds.includes(h.id));
}

// ── Custom habits ──

export interface CustomHabit {
  id: string;
  name: string;
  icon: string;
  iconColor: string;
  category: 'morning' | 'anytime' | 'evening';
}

/**
 * Get user's custom habits from Firestore
 */
export async function getCustomHabits(userId: string): Promise<CustomHabit[]> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return [];
    return userDoc.data().customHabits || [];
  } catch (error) {
    console.error('Error getting custom habits:', error);
    return [];
  }
}

/**
 * Add a custom habit and auto-select it
 */
export async function addCustomHabit(userId: string, habit: CustomHabit): Promise<void> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) throw new Error('User document not found');

    const data = userDoc.data();
    const customs: CustomHabit[] = data.customHabits || [];
    const selected: string[] = data.selectedHabits || [];

    await updateDoc(doc(db, 'users', userId), {
      customHabits: [...customs, habit],
      selectedHabits: [...selected, habit.id],
    });
  } catch (error) {
    console.error('Error adding custom habit:', error);
    throw error;
  }
}

/**
 * Remove a custom habit and deselect it
 */
export async function removeCustomHabit(userId: string, habitId: string): Promise<void> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) throw new Error('User document not found');

    const data = userDoc.data();
    const customs: CustomHabit[] = data.customHabits || [];
    const selected: string[] = data.selectedHabits || [];

    await updateDoc(doc(db, 'users', userId), {
      customHabits: customs.filter(h => h.id !== habitId),
      selectedHabits: selected.filter(id => id !== habitId),
    });
  } catch (error) {
    console.error('Error removing custom habit:', error);
    throw error;
  }
}
