/**
 * Ghost Counter Service
 * Tracks global daily completions across all users
 */

import { doc, getDoc, setDoc, updateDoc, increment, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getTodayDateString } from './completionService';

/**
 * Increment global completion counter for today
 * Called when a user completes their full routine
 */
export async function incrementGlobalCompletion(): Promise<void> {
  try {
    const today = getTodayDateString();
    const counterRef = doc(db, 'globalCompletions', today);

    // Use setDoc with merge to create if doesn't exist, or increment if it does
    const counterDoc = await getDoc(counterRef);
    
    if (counterDoc.exists()) {
      await updateDoc(counterRef, {
        count: increment(1),
        lastUpdated: new Date().toISOString(),
      });
    } else {
      await setDoc(counterRef, {
        date: today,
        count: 1,
        lastUpdated: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error incrementing global completion:', error);
    throw error;
  }
}

/**
 * Get today's global completion count
 */
export async function getTodayGlobalCompletionCount(): Promise<number> {
  try {
    const today = getTodayDateString();
    const counterDoc = await getDoc(doc(db, 'globalCompletions', today));
    
    if (!counterDoc.exists()) {
      return 0;
    }

    const data = counterDoc.data();
    return data.count || 0;
  } catch (error) {
    console.error('Error getting today global completion count:', error);
    return 0;
  }
}

/**
 * Subscribe to today's global completion count
 */
export function subscribeToTodayGlobalCompletion(
  callback: (count: number) => void
): () => void {
  const today = getTodayDateString();
  const counterRef = doc(db, 'globalCompletions', today);

  return onSnapshot(counterRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      callback(data.count || 0);
    } else {
      callback(0);
    }
  });
}


