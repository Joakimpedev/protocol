/**
 * Referral System Service
 *
 * Handles:
 * - Generating unique referral codes
 * - Validating and redeeming codes
 * - Tracking referral relationships
 * - Checking if friend has started trial
 */

import { doc, getDoc, setDoc, updateDoc, deleteField, serverTimestamp, Timestamp } from 'firebase/firestore';
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

// ─── Room-based Referral System ───────────────────────────────────────────────

export interface RoomMember {
  userId: string;
  name: string;
  joinedAt: Timestamp;
}

export interface ReferralRoom {
  hostId: string;
  hostName: string;
  code: string;
  members: RoomMember[];
  memberCount: number;
  isUnlocked: boolean;
  createdAt: Timestamp;
}

/**
 * Generate a random 6-character room code
 */
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a new referral room for the user.
 *
 * Storage strategy (avoids permission issues):
 *  - Full room data → host's own user doc  (users/{hostId}.room)
 *  - Lightweight lookup → referrals/{code}  (uses ownerId field to match existing rules)
 */
export async function createRoom(userId: string, hostName: string): Promise<ReferralRoom> {
  const code = generateRoomCode();
  const now = Timestamp.now();

  const room: ReferralRoom = {
    hostId: userId,
    hostName: hostName,
    code,
    members: [{ userId, name: hostName, joinedAt: now }],
    memberCount: 1,
    isUnlocked: false,
    createdAt: now,
  };

  // 1) Store full room data on the host's own user doc (always allowed)
  await setDoc(doc(db, 'users', userId), {
    roomCode: code,
    roomName: hostName,
    room,
  }, { merge: true });

  // 2) Write a code→host lookup using existing referrals field format
  //    (ownerId matches the field existing rules expect)
  try {
    await setDoc(doc(db, 'referrals', code), {
      ownerId: userId,
      claimedBy: null,
      friendStartedTrial: false,
      creditApplied: false,
      isRoom: true,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    // Lookup write is best-effort; room still works via host's user doc
    console.warn('[referralService] Room lookup write failed (non-critical):', e);
  }

  return room;
}

/**
 * Join an existing referral room.
 *
 * Reads lookup (referrals/{code}) → host's user doc → room data.
 * Writes updated room back to host's doc, marks joiner's own doc.
 */
export async function joinRoom(
  code: string,
  userId: string,
  name: string
): Promise<{ success: boolean; error?: string; room?: ReferralRoom }> {
  const upperCode = code.toUpperCase();

  // Check if this user is already in a room
  const userRef = doc(db, 'users', userId);
  const joinerDoc = await getDoc(userRef);
  if (joinerDoc.exists() && joinerDoc.data().roomCode) {
    return { success: false, error: 'You are already in a room.' };
  }

  // Find the room via lookup → host doc
  const room = await getRoomByCode(upperCode);
  if (!room) {
    return { success: false, error: 'Room not found. Check the code and try again.' };
  }

  if (room.members.some((m) => m.userId === userId)) {
    return { success: false, error: 'You are already in this room.' };
  }

  if (room.isUnlocked) {
    return { success: false, error: 'This room is already full.' };
  }

  // Build updated room
  const now = Timestamp.now();
  const updatedMembers = [...room.members, { userId, name, joinedAt: now }];
  const updatedCount = updatedMembers.length;
  const isUnlocked = updatedCount >= 4;

  const updatedRoom: ReferralRoom = {
    ...room,
    members: updatedMembers,
    memberCount: updatedCount,
    isUnlocked,
  };

  // Update room on the HOST's user doc
  await updateDoc(doc(db, 'users', room.hostId), { room: updatedRoom });

  // Mark the joiner as belonging to this room
  await setDoc(userRef, {
    roomCode: upperCode,
    roomName: name,
    roomHostId: room.hostId,
  }, { merge: true });

  return { success: true, room: updatedRoom };
}

/**
 * Get a room by its code.
 * Uses the referrals/{code} lookup doc to find the host, then reads room from host's user doc.
 */
export async function getRoomByCode(code: string): Promise<ReferralRoom | null> {
  const lookupSnap = await getDoc(doc(db, 'referrals', code.toUpperCase()));
  if (!lookupSnap.exists()) return null;

  const hostId = lookupSnap.data().ownerId;
  if (!hostId) return null;

  const hostSnap = await getDoc(doc(db, 'users', hostId));
  if (!hostSnap.exists()) return null;

  return (hostSnap.data().room as ReferralRoom) ?? null;
}

/**
 * Get the room a user belongs to (if any).
 * Works for both hosts and joiners.
 */
export async function getUserRoom(userId: string): Promise<ReferralRoom | null> {
  const userSnap = await getDoc(doc(db, 'users', userId));
  if (!userSnap.exists()) return null;
  const data = userSnap.data();

  if (!data.roomCode) return null;

  // If this user IS the host, room data is on their own doc
  if (data.room) {
    return data.room as ReferralRoom;
  }

  // Otherwise they're a joiner — read the host's doc
  const hostId = data.roomHostId;
  if (!hostId) return null;

  const hostSnap = await getDoc(doc(db, 'users', hostId));
  if (!hostSnap.exists()) return null;

  return (hostSnap.data().room as ReferralRoom) ?? null;
}

/**
 * Clear a user's room data (for dev mode reset).
 * Removes roomCode, roomName, roomHostId, and room fields from their user doc.
 */
export async function clearUserRoom(userId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  await updateDoc(userRef, {
    roomCode: deleteField(),
    roomName: deleteField(),
    roomHostId: deleteField(),
    room: deleteField(),
  });
}

/**
 * [DEV] Fill remaining room spots with fake members to test unlock flow.
 */
export async function devFillRoom(userId: string): Promise<ReferralRoom | null> {
  const room = await getUserRoom(userId);
  if (!room) return null;

  const now = Timestamp.now();
  const fakeNames = ['Alex', 'Jordan', 'Sam', 'Chris', 'Taylor'];
  const updatedMembers = [...room.members];

  while (updatedMembers.length < 4) {
    const idx = updatedMembers.length - 1;
    updatedMembers.push({
      userId: `fake_${Date.now()}_${idx}`,
      name: fakeNames[idx % fakeNames.length],
      joinedAt: now,
    });
  }

  const updatedRoom: ReferralRoom = {
    ...room,
    members: updatedMembers,
    memberCount: updatedMembers.length,
    isUnlocked: true,
  };

  // Update on the host's doc
  await updateDoc(doc(db, 'users', room.hostId), { room: updatedRoom });

  return updatedRoom;
}

/**
 * Check if a room is unlocked (4+ members)
 */
export async function checkRoomUnlocked(code: string): Promise<boolean> {
  const room = await getRoomByCode(code);
  return room?.isUnlocked ?? false;
}
