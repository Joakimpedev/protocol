/**
 * Dev Mode Service
 * 
 * Manages dev mode state in AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const DEV_MODE_KEY = '@protocol:devMode';
const DEBUG_INFO_KEY = '@protocol:debugInfo';
const FORCE_ONBOARDING_KEY = '@protocol:forceOnboarding';
const FORCE_SHOW_APP_KEY = '@protocol:forceShowApp';
const HIDE_DEV_TOOLS_IN_ONBOARDING_KEY = '@protocol:hideDevToolsInOnboarding';
const SIMULATE_FRIEND_USED_REFERRAL_KEY = '@protocol:simulateFriendUsedReferral';

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

export async function getDebugInfoEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(DEBUG_INFO_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error getting debug info setting:', error);
    return false;
  }
}

export async function setDebugInfoEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(DEBUG_INFO_KEY, enabled ? 'true' : 'false');
  } catch (error) {
    console.error('Error setting debug info:', error);
    throw error;
  }
}

export async function getForceOnboarding(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(FORCE_ONBOARDING_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error getting force onboarding:', error);
    return false;
  }
}

export async function setForceOnboarding(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(FORCE_ONBOARDING_KEY, value ? 'true' : 'false');
  } catch (error) {
    console.error('Error setting force onboarding:', error);
    throw error;
  }
}

export async function getForceShowApp(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(FORCE_SHOW_APP_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error getting force show app:', error);
    return false;
  }
}

export async function setForceShowApp(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(FORCE_SHOW_APP_KEY, value ? 'true' : 'false');
  } catch (error) {
    console.error('Error setting force show app:', error);
    throw error;
  }
}

export async function getHideDevToolsInOnboarding(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(HIDE_DEV_TOOLS_IN_ONBOARDING_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error getting hide dev tools in onboarding:', error);
    return false;
  }
}

export async function setHideDevToolsInOnboarding(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(HIDE_DEV_TOOLS_IN_ONBOARDING_KEY, value ? 'true' : 'false');
  } catch (error) {
    console.error('Error setting hide dev tools in onboarding:', error);
    throw error;
  }
}

export async function getSimulateFriendUsedReferral(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(SIMULATE_FRIEND_USED_REFERRAL_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error getting simulate friend used referral:', error);
    return false;
  }
}

export async function setSimulateFriendUsedReferral(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(SIMULATE_FRIEND_USED_REFERRAL_KEY, value ? 'true' : 'false');
  } catch (error) {
    console.error('Error setting simulate friend used referral:', error);
    throw error;
  }
}