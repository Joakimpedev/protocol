/**
 * Feedback Service
 * Handles saving user feedback to Firestore
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Platform } from 'react-native';

/**
 * Get app version from app.json
 */
function getAppVersion(): string {
  try {
    // Try to get version from app.json
    const appConfig = require('../../app.json');
    return appConfig.expo?.version || '1.0.0';
  } catch (error) {
    // Fallback to default version
    return '1.0.0';
  }
}

/**
 * Save user feedback to Firestore
 */
export async function saveFeedback(
  userId: string,
  text: string
): Promise<void> {
  try {
    const appVersion = getAppVersion();
    const platform = Platform.OS;

    await addDoc(collection(db, 'feedback'), {
      userId,
      text,
      createdAt: serverTimestamp(),
      appVersion,
      platform,
    });
  } catch (error) {
    console.error('Error saving feedback:', error);
    throw error;
  }
}

