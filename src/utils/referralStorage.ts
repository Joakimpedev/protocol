import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_REFERRAL_CODE_KEY = '@pending_referral_code_v1';

/**
 * Store a referral code to be applied when the user signs in and starts trial.
 * Used when the user enters a code on the paywall before having an account.
 */
export async function setPendingReferralCode(code: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_REFERRAL_CODE_KEY, code.toUpperCase());
  } catch (error) {
    console.warn('[ReferralStorage] Failed to save pending code:', error);
  }
}

/**
 * Get and clear the pending referral code, if any.
 * Call when user starts trial so the code can be redeemed for their new account.
 */
export async function getAndClearPendingReferralCode(): Promise<string | null> {
  try {
    const code = await AsyncStorage.getItem(PENDING_REFERRAL_CODE_KEY);
    if (code) {
      await AsyncStorage.removeItem(PENDING_REFERRAL_CODE_KEY);
      return code;
    }
    return null;
  } catch (error) {
    console.warn('[ReferralStorage] Failed to read/clear pending code:', error);
    return null;
  }
}

/**
 * Check if there is a pending referral code (without clearing it).
 */
export async function getPendingReferralCode(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PENDING_REFERRAL_CODE_KEY);
  } catch (error) {
    console.warn('[ReferralStorage] Failed to read pending code:', error);
    return null;
  }
}
