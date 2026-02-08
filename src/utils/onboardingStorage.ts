import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingData } from '../contexts/OnboardingContext';

const ONBOARDING_PROGRESS_KEY = '@onboarding_progress_v1';

export interface OnboardingProgressData {
  currentScreen: string;
  screenIndex: number;
  data: Partial<OnboardingData>;
  timestamp: number;
}

/**
 * Save onboarding progress to AsyncStorage
 * Called automatically on every screen transition
 */
export const saveOnboardingProgress = async (
  currentScreen: string,
  screenIndex: number,
  data: Partial<OnboardingData>
): Promise<void> => {
  try {
    const progressData: OnboardingProgressData = {
      currentScreen,
      screenIndex,
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(
      ONBOARDING_PROGRESS_KEY,
      JSON.stringify(progressData)
    );
    console.log('[OnboardingStorage] Saved progress:', currentScreen, `(${screenIndex})`);
  } catch (error) {
    console.error('[OnboardingStorage] Failed to save progress:', error);
    // Non-critical: don't block user if storage fails
  }
};

/**
 * Load saved onboarding progress
 * Returns null if no saved progress exists
 */
export const loadOnboardingProgress = async (): Promise<OnboardingProgressData | null> => {
  try {
    const stored = await AsyncStorage.getItem(ONBOARDING_PROGRESS_KEY);
    if (!stored) {
      console.log('[OnboardingStorage] No saved progress found');
      return null;
    }

    const progress: OnboardingProgressData = JSON.parse(stored);
    console.log('[OnboardingStorage] Loaded progress:', progress.currentScreen, `(${progress.screenIndex})`);
    return progress;
  } catch (error) {
    console.error('[OnboardingStorage] Failed to load progress:', error);
    return null;
  }
};

/**
 * Clear saved onboarding progress
 * Called after successful signup completion
 */
export const clearOnboardingProgress = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ONBOARDING_PROGRESS_KEY);
    console.log('[OnboardingStorage] Cleared progress');
  } catch (error) {
    console.error('[OnboardingStorage] Failed to clear progress:', error);
  }
};

/**
 * Check if saved progress exists
 */
export const hasOnboardingProgress = async (): Promise<boolean> => {
  try {
    const progress = await loadOnboardingProgress();
    return progress !== null;
  } catch {
    return false;
  }
};
