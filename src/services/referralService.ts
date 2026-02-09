/**
 * Referral System Service
 *
 * Handles:
 * - Generating unique referral codes
 * - Validating and redeeming codes
 * - Tracking referral relationships
 * - Checking if friend has started trial
 */

import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Generate a unique 6-character referral code from user ID
 */
export function generateReferralCode(userId: string): string {
  // Take last 6 chars of user ID and convert to uppercase alphanumeric
  const hash = userId.slice(-6).toUpperCase();
  // Replace any non-alphanumeric with random letters
  return hash.replace(/[^A-Z0-9]/g, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  );
}

/**
 * Create or get user's referral code
 */
export async function getUserReferralCode(userId: string): Promise<string> {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);

  if (userDoc.exists() && userDoc.data().referralCode) {
    return userDoc.data().referralCode;
  }

  // Generate new code
  const code = generateReferralCode(userId);

  // Save to user doc
  await setDoc(userRef, {
    referralCode: code,
    createdAt: serverTimestamp(),
  }, { merge: true });

  // Create referral tracking doc
  await setDoc(doc(db, 'referrals', code), {
    ownerId: userId,
    claimedBy: null,
    friendStartedTrial: false,
    creditApplied: false,
    createdAt: serverTimestamp(),
  });

  return code;
}

/**
 * Validate a referral code
 * Returns the owner's user ID if valid, null if invalid
 */
export async function validateReferralCode(code: string): Promise<string | null> {
  if (!code || code.length !== 6) {
    return null;
  }

  const referralRef = doc(db, 'referrals', code.toUpperCase());
  const referralDoc = await getDoc(referralRef);

  if (!referralDoc.exists()) {
    return null;
  }

  const data = referralDoc.data();

  // Check if code has already been claimed
  if (data.claimedBy) {
    return null; // Code already used
  }

  return data.ownerId;
}

/**
 * Redeem a referral code
 * Called when friend enters code (before starting trial)
 * ONE-TIME USE: User can only redeem one code per account
 */
export async function redeemReferralCode(
  code: string,
  friendUserId: string
): Promise<{ success: boolean; error?: string; ownerId?: string }> {
  // Check if user has already used a referral code
  const userRef = doc(db, 'users', friendUserId);
  const userDoc = await getDoc(userRef);

  if (userDoc.exists()) {
    const userData = userDoc.data();
    if (userData.referredBy || userData.hasUsedReferralCode) {
      return { success: false, error: 'You have already used a referral code' };
    }
  }

  const ownerId = await validateReferralCode(code);

  if (!ownerId) {
    return { success: false, error: 'Invalid or already used code' };
  }

  if (ownerId === friendUserId) {
    return { success: false, error: 'Cannot use your own code' };
  }

  // Mark code as claimed by this friend
  await updateDoc(doc(db, 'referrals', code.toUpperCase()), {
    claimedBy: friendUserId,
    claimedAt: serverTimestamp(),
  });

  // Store who referred this user
  await setDoc(doc(db, 'users', friendUserId), {
    referredBy: ownerId,
    referredByCode: code.toUpperCase(),
    hasUsedReferralCode: true,
  }, { merge: true });

  return { success: true, ownerId };
}

/**
 * Mark that friend has started their trial
 * Called after successful purchase/trial start
 */
export async function markFriendStartedTrial(userId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) return;

  const data = userDoc.data();
  const referredBy = data.referredBy;
  const code = data.referredByCode;

  if (!referredBy || !code) return;

  // Mark friend as having started trial
  await updateDoc(doc(db, 'referrals', code), {
    friendStartedTrial: true,
    friendStartedAt: serverTimestamp(),
  });

  console.log('[Referral] Friend started trial, both users should unlock');
}

/**
 * Check if user should get trial (either they paid, used valid code, or friend started trial)
 * Returns: { shouldGetTrial: boolean, reason: string }
 */
export async function checkTrialEligibility(userId: string): Promise<{
  shouldGetTrial: boolean;
  reason: 'direct_payment' | 'referral_pending' | 'referral_unlocked' | 'none';
}> {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    return { shouldGetTrial: false, reason: 'none' };
  }

  const data = userDoc.data();

  // Check if user referred someone and that friend started trial
  if (data.referralCode) {
    const referralDoc = await getDoc(doc(db, 'referrals', data.referralCode));
    if (referralDoc.exists()) {
      const refData = referralDoc.data();
      if (refData.claimedBy && refData.friendStartedTrial) {
        return { shouldGetTrial: true, reason: 'referral_unlocked' };
      }
      if (refData.claimedBy && !refData.friendStartedTrial) {
        return { shouldGetTrial: false, reason: 'referral_pending' };
      }
    }
  }

  // Check if user was referred and should get trial
  if (data.referredBy && data.referredByCode) {
    return { shouldGetTrial: true, reason: 'referral_unlocked' };
  }

  return { shouldGetTrial: false, reason: 'none' };
}

/**
 * Get referral status for user
 * Shows how many friends they've invited and if pending
 */
export async function getReferralStatus(userId: string): Promise<{
  code: string;
  friendClaimed: boolean;
  friendStartedTrial: boolean;
  waitingForFriend: boolean;
}> {
  const code = await getUserReferralCode(userId);
  const referralDoc = await getDoc(doc(db, 'referrals', code));

  if (!referralDoc.exists()) {
    return {
      code,
      friendClaimed: false,
      friendStartedTrial: false,
      waitingForFriend: false,
    };
  }

  const data = referralDoc.data();

  return {
    code,
    friendClaimed: !!data.claimedBy,
    friendStartedTrial: !!data.friendStartedTrial,
    waitingForFriend: !!data.claimedBy && !data.friendStartedTrial,
  };
}
