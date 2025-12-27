/**
 * Review Service
 * Handles review prompt logic and conditions checking
 */

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { calculateWeeklyConsistency } from './completionService';
import * as StoreReview from 'expo-store-review';

const REVIEW_COOLDOWN_DAYS = 30;

/**
 * Check if review prompt conditions are met
 * Conditions:
 * - User just took Week 2, 3, or 4 progress photo
 * - User rated their skin as "Better"
 * - User has not been asked for a review in the last 30 days
 * - User's weekly consistency is above 70%
 */
export async function shouldShowReviewPrompt(
  userId: string,
  weekNumber: number,
  skinRating: 'worse' | 'same' | 'better'
): Promise<boolean> {
  try {
    // Condition 1: Week must be 2, 3, or 4
    if (weekNumber < 2 || weekNumber > 4) {
      return false;
    }

    // Condition 2: Skin rating must be "Better"
    if (skinRating !== 'better') {
      return false;
    }

    // Condition 3: Check if user has been asked in last 30 days
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return false;
    }

    const userData = userDoc.data();
    const lastReviewPromptDate = userData.lastReviewPromptDate;

    if (lastReviewPromptDate) {
      const lastPrompt = new Date(lastReviewPromptDate);
      const now = new Date();
      const daysSinceLastPrompt = (now.getTime() - lastPrompt.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceLastPrompt < REVIEW_COOLDOWN_DAYS) {
        return false;
      }
    }

    // Condition 4: Weekly consistency must be above 70%
    const consistencyScore = await calculateWeeklyConsistency(userId);
    // Consistency score is 0.0-10.0, so 70% = 7.0
    if (consistencyScore < 7.0) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking review prompt conditions:', error);
    return false;
  }
}

/**
 * Update last review prompt date
 */
export async function updateLastReviewPromptDate(userId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), {
      lastReviewPromptDate: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating last review prompt date:', error);
    throw error;
  }
}

/**
 * Request app store review using native dialog
 * Note: This only works in development/production builds, not in Expo Go
 */
export async function requestReview(): Promise<void> {
  try {
    // Check if StoreReview is available
    const isAvailable = await StoreReview.isAvailableAsync();
    
    if (isAvailable) {
      await StoreReview.requestReview();
      console.log('Native review dialog requested');
    } else {
      console.log('Store review is not available on this device (likely running in Expo Go)');
      // In Expo Go, this will silently fail - the dialog won't show
      // This is expected behavior and will work in production builds
    }
  } catch (error) {
    console.error('Error requesting review:', error);
    // Silently fail - don't break the user flow if review fails
  }
}

