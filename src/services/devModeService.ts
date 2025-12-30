/**
 * Dev Mode Service
 * 
 * Manages dev mode state in AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const DEV_MODE_KEY = '@protocol:devMode';

export async function getDevMode(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(DEV_MODE_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error getting dev mode:', error);
    return false;
  }
}

export async function setDevMode(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(DEV_MODE_KEY, enabled ? 'true' : 'false');
  } catch (error) {
    console.error('Error setting dev mode:', error);
    throw error;
  }
}

