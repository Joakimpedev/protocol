/**
 * User Preferences Service
 * Handles storing and retrieving user preferences
 */

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface UserPreferences {
  showGlobalComparison: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  showGlobalComparison: true, // Default to showing global comparison
};

/**
 * Get user preferences from Firestore
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return DEFAULT_PREFERENCES;
    }
    
    const data = userDoc.data();
    return {
      showGlobalComparison: data.showGlobalComparison ?? DEFAULT_PREFERENCES.showGlobalComparison,
    };
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Update user preferences in Firestore
 */
export async function updateUserPreferences(
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<void> {
  try {
    const updates: any = {};
    if (preferences.showGlobalComparison !== undefined) {
      updates.showGlobalComparison = preferences.showGlobalComparison;
    }
    
    await updateDoc(doc(db, 'users', userId), updates);
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw error;
  }
}

