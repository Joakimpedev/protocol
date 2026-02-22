/**
 * XP Service
 * Core XP engine for the gamification system
 */

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { LEVELS, MAX_LEVEL, LevelDefinition } from '../data/levels';

// XP award amounts
export const XP_AMOUNTS = {
  TASK_COMPLETE: 10,
  HABIT_COMPLETE: 10,
  EXERCISE_COMPLETE: 15,
  SKIP_WAIT_PENALTY: -5,
  ALL_DAILY_COMPLETE: 50,
  STREAK_MILESTONE: 100,
  FIRST_TIME_ACHIEVEMENT: 25,
} as const;

export type XPReason =
  | 'task_complete'
  | 'habit_complete'
  | 'exercise_set'
  | 'skip_wait_penalty'
  | 'all_daily_complete'
  | 'streak_milestone'
  | 'first_time_achievement';

export interface XPHistoryEntry {
  amount: number;
  reason: XPReason;
  timestamp: string;
}

export interface UserXPData {
  total: number;
  level: number;
  lastLevelUp: string | null;
  history: XPHistoryEntry[];
}

const DEFAULT_XP_DATA: UserXPData = {
  total: 0,
  level: 1,
  lastLevelUp: null,
  history: [],
};

/**
 * Calculate level from total XP
 */
export function calculateLevel(totalXP: number): number {
  let level = 1;
  for (const def of LEVELS) {
    if (totalXP >= def.xpRequired) {
      level = def.level;
    } else {
      break;
    }
  }
  return level;
}

/**
 * Get level definition for a given level number
 */
export function getLevelDefinition(level: number): LevelDefinition {
  return LEVELS.find(l => l.level === level) || LEVELS[0];
}

/**
 * Get XP needed to reach next level
 */
export function getXPToNextLevel(totalXP: number): { current: number; required: number; currentLevelXP: number; nextLevelXP: number } {
  const level = calculateLevel(totalXP);
  const currentLevelDef = LEVELS.find(l => l.level === level)!;
  const nextLevelDef = LEVELS.find(l => l.level === level + 1);

  if (!nextLevelDef) {
    // Max level reached
    return {
      current: totalXP - currentLevelDef.xpRequired,
      required: 0,
      currentLevelXP: currentLevelDef.xpRequired,
      nextLevelXP: currentLevelDef.xpRequired,
    };
  }

  return {
    current: totalXP - currentLevelDef.xpRequired,
    required: nextLevelDef.xpRequired - currentLevelDef.xpRequired,
    currentLevelXP: currentLevelDef.xpRequired,
    nextLevelXP: nextLevelDef.xpRequired,
  };
}

/**
 * Check if XP gain caused a level up
 */
export function checkLevelUp(oldXP: number, newXP: number): { leveledUp: boolean; oldLevel: number; newLevel: number } {
  const oldLevel = calculateLevel(oldXP);
  const newLevel = calculateLevel(newXP);
  return {
    leveledUp: newLevel > oldLevel,
    oldLevel,
    newLevel,
  };
}

/**
 * Get user's XP data from Firestore
 */
export async function getUserXPData(userId: string): Promise<UserXPData> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return { ...DEFAULT_XP_DATA };
    }

    const data = userDoc.data();
    const xp = data.xp;
    if (!xp) {
      return { ...DEFAULT_XP_DATA };
    }

    return {
      total: xp.total || 0,
      level: xp.level || 1,
      lastLevelUp: xp.lastLevelUp || null,
      history: xp.history || [],
    };
  } catch (error) {
    console.error('Error getting user XP data:', error);
    return { ...DEFAULT_XP_DATA };
  }
}

/**
 * Award XP to a user
 * Returns level-up info if a level up occurred
 */
export async function awardXP(
  userId: string,
  amount: number,
  reason: XPReason
): Promise<{ leveledUp: boolean; oldLevel: number; newLevel: number; newTotal: number }> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const data = userDoc.data();
    const currentXP: UserXPData = data.xp || { ...DEFAULT_XP_DATA };
    const oldTotal = currentXP.total || 0;
    const newTotal = oldTotal + amount;
    const levelUpResult = checkLevelUp(oldTotal, newTotal);
    const newLevel = levelUpResult.newLevel;

    const historyEntry: XPHistoryEntry = {
      amount,
      reason,
      timestamp: new Date().toISOString(),
    };

    // Keep last 50 history entries to avoid unbounded growth
    const history = [...(currentXP.history || []), historyEntry].slice(-50);

    const xpUpdate: any = {
      'xp.total': newTotal,
      'xp.level': newLevel,
      'xp.history': history,
    };

    if (levelUpResult.leveledUp) {
      xpUpdate['xp.lastLevelUp'] = new Date().toISOString();
    }

    await updateDoc(doc(db, 'users', userId), xpUpdate);

    return {
      leveledUp: levelUpResult.leveledUp,
      oldLevel: levelUpResult.oldLevel,
      newLevel,
      newTotal,
    };
  } catch (error) {
    console.error('Error awarding XP:', error);
    return { leveledUp: false, oldLevel: 1, newLevel: 1, newTotal: 0 };
  }
}

/**
 * Reset all XP and level back to zero (dev tool)
 */
export async function resetXP(userId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), {
      'xp.total': 0,
      'xp.level': 1,
      'xp.lastLevelUp': null,
      'xp.history': [],
      'village.choices': [],
    });
  } catch (error) {
    console.error('Error resetting XP:', error);
    throw error;
  }
}

/**
 * Check and award streak milestone XP
 * Milestones: 7, 30, 90, 365 days
 */
export async function checkStreakMilestone(
  userId: string,
  currentStreak: number
): Promise<{ leveledUp: boolean; milestone: number | null }> {
  const milestones = [7, 30, 90, 365];
  const milestone = milestones.find(m => currentStreak === m);

  if (!milestone) {
    return { leveledUp: false, milestone: null };
  }

  const result = await awardXP(userId, XP_AMOUNTS.STREAK_MILESTONE, 'streak_milestone');
  return { leveledUp: result.leveledUp, milestone };
}
