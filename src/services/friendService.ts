/**
 * Friend Service
 * Handles friend codes, friend connections, and friend-related data
 */

import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface FriendConnection {
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: string;
  requestedBy: string; // userId who sent the request
}

export interface FriendProfile {
  userId: string;
  email?: string;
  friendCode: string;
  muted: boolean;
  lastCompletionDate?: string; // Last date they completed their routine
  weeklyConsistency?: number; // Their weekly consistency score
}

/**
 * Generate a unique friend code (6 alphanumeric characters)
 */
function generateFriendCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars like 0, O, I, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Get or create a friend code for a user
 */
export async function getOrCreateFriendCode(userId: string): Promise<string> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const userData = userDoc.data();
    
    // If user already has a friend code, return it
    if (userData.friendCode) {
      return userData.friendCode;
    }

    // Generate a new unique friend code
    let friendCode = generateFriendCode();
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    // Check if code is unique (query friendCodes collection)
    while (!isUnique && attempts < maxAttempts) {
      const friendCodesRef = collection(db, 'friendCodes');
      const q = query(friendCodesRef, where('code', '==', friendCode));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        isUnique = true;
      } else {
        friendCode = generateFriendCode();
        attempts++;
      }
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique friend code after multiple attempts');
    }

    // Store friend code in user document
    await updateDoc(doc(db, 'users', userId), {
      friendCode,
    });

    // Also store in friendCodes collection for quick lookup
    await setDoc(doc(db, 'friendCodes', friendCode), {
      userId,
      code: friendCode,
      createdAt: Timestamp.now(),
    });

    return friendCode;
  } catch (error) {
    console.error('Error getting or creating friend code:', error);
    throw error;
  }
}

/**
 * Get user ID from friend code
 */
export async function getUserIdFromFriendCode(friendCode: string): Promise<string | null> {
  try {
    const friendCodeDoc = await getDoc(doc(db, 'friendCodes', friendCode));
    
    if (!friendCodeDoc.exists()) {
      return null;
    }

    const data = friendCodeDoc.data();
    return data.userId || null;
  } catch (error) {
    console.error('Error getting user ID from friend code:', error);
    return null;
  }
}

/**
 * Send a friend request
 */
export async function sendFriendRequest(userId: string, friendCode: string): Promise<void> {
  try {
    const friendUserId = await getUserIdFromFriendCode(friendCode);
    
    if (!friendUserId) {
      throw new Error('Invalid friend code');
    }

    if (friendUserId === userId) {
      throw new Error('Cannot add yourself as a friend');
    }

    // Check if connection already exists
    const existingConnection = await getFriendConnection(userId, friendUserId);
    if (existingConnection) {
      if (existingConnection.status === 'accepted') {
        throw new Error('Already friends');
      }
      if (existingConnection.status === 'pending') {
        throw new Error('Friend request already pending');
      }
      if (existingConnection.status === 'blocked') {
        throw new Error('This connection is blocked');
      }
    }

    // Create connection document (bidirectional)
    const connectionId1 = `${userId}_${friendUserId}`;
    const connectionId2 = `${friendUserId}_${userId}`;

    const connection: FriendConnection = {
      userId,
      friendId: friendUserId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      requestedBy: userId,
    };

    // Store connection from user's perspective
    await setDoc(doc(db, 'friendConnections', connectionId1), connection);

    // Store reverse connection from friend's perspective
    const reverseConnection: FriendConnection = {
      userId: friendUserId,
      friendId: userId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      requestedBy: userId,
    };
    await setDoc(doc(db, 'friendConnections', connectionId2), reverseConnection);
  } catch (error) {
    console.error('Error sending friend request:', error);
    throw error;
  }
}

/**
 * Accept a friend request
 */
export async function acceptFriendRequest(userId: string, friendId: string): Promise<void> {
  try {
    const connectionId1 = `${userId}_${friendId}`;
    const connectionId2 = `${friendId}_${userId}`;

    // Update both connection documents
    await updateDoc(doc(db, 'friendConnections', connectionId1), {
      status: 'accepted',
    });
    await updateDoc(doc(db, 'friendConnections', connectionId2), {
      status: 'accepted',
    });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    throw error;
  }
}

/**
 * Get friend connection between two users
 */
export async function getFriendConnection(userId: string, friendId: string): Promise<FriendConnection | null> {
  try {
    const connectionId = `${userId}_${friendId}`;
    const connectionDoc = await getDoc(doc(db, 'friendConnections', connectionId));
    
    if (!connectionDoc.exists()) {
      return null;
    }

    return connectionDoc.data() as FriendConnection;
  } catch (error) {
    console.error('Error getting friend connection:', error);
    return null;
  }
}

/**
 * Get all friends for a user
 */
export async function getFriends(userId: string): Promise<FriendProfile[]> {
  try {
    const friendsRef = collection(db, 'friendConnections');
    const q = query(
      friendsRef,
      where('userId', '==', userId),
      where('status', '==', 'accepted')
    );
    
    const querySnapshot = await getDocs(q);
    const friends: FriendProfile[] = [];

    for (const docSnap of querySnapshot.docs) {
      const connection = docSnap.data() as FriendConnection;
      const friendDoc = await getDoc(doc(db, 'users', connection.friendId));
      
      if (friendDoc.exists()) {
        const friendData = friendDoc.data();
        
        // Get user's mute preference for this friend
        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.data();
        const mutedFriends = userData?.mutedFriends || [];
        const muted = mutedFriends.includes(connection.friendId);

        // Get last completion date
        const completions = friendData.dailyCompletions || [];
        const lastCompletion = completions
          .filter((c: any) => c.allCompleted === true)
          .sort((a: any, b: any) => b.date.localeCompare(a.date))[0];

        // Calculate weekly consistency
        const weekStart = getWeekStartDateString();
        const weekCompletions = completions.filter((c: any) => {
          return c.date >= weekStart && c.allCompleted === true;
        });
        const uniqueDays = new Set(weekCompletions.map((c: any) => c.date));
        const weeklyConsistency = Math.round((uniqueDays.size / 7) * 100);

        friends.push({
          userId: connection.friendId,
          email: friendData.email,
          friendCode: friendData.friendCode,
          muted,
          lastCompletionDate: lastCompletion?.date,
          weeklyConsistency,
        });
      }
    }

    return friends;
  } catch (error) {
    console.error('Error getting friends:', error);
    return [];
  }
}

/**
 * Get pending friend requests for a user
 */
export async function getPendingFriendRequests(userId: string): Promise<FriendProfile[]> {
  try {
    const friendsRef = collection(db, 'friendConnections');
    const q = query(
      friendsRef,
      where('userId', '==', userId),
      where('status', '==', 'pending'),
      where('requestedBy', '!=', userId) // Only requests sent TO this user
    );
    
    const querySnapshot = await getDocs(q);
    const requests: FriendProfile[] = [];

    for (const docSnap of querySnapshot.docs) {
      const connection = docSnap.data() as FriendConnection;
      const friendDoc = await getDoc(doc(db, 'users', connection.friendId));
      
      if (friendDoc.exists()) {
        const friendData = friendDoc.data();
        requests.push({
          userId: connection.friendId,
          email: friendData.email,
          friendCode: friendData.friendCode,
          muted: false,
        });
      }
    }

    return requests;
  } catch (error) {
    console.error('Error getting pending friend requests:', error);
    return [];
  }
}

/**
 * Mute or unmute a friend
 */
export async function toggleMuteFriend(userId: string, friendId: string, muted: boolean): Promise<void> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const userData = userDoc.data();
    const mutedFriends = userData.mutedFriends || [];

    let updatedMutedFriends: string[];
    if (muted) {
      // Add to muted list if not already there
      if (!mutedFriends.includes(friendId)) {
        updatedMutedFriends = [...mutedFriends, friendId];
      } else {
        return; // Already muted
      }
    } else {
      // Remove from muted list
      updatedMutedFriends = mutedFriends.filter((id: string) => id !== friendId);
    }

    await updateDoc(doc(db, 'users', userId), {
      mutedFriends: updatedMutedFriends,
    });
  } catch (error) {
    console.error('Error toggling mute friend:', error);
    throw error;
  }
}

/**
 * Remove a friend
 */
export async function removeFriend(userId: string, friendId: string): Promise<void> {
  try {
    const connectionId1 = `${userId}_${friendId}`;
    const connectionId2 = `${friendId}_${userId}`;

    // Delete both connection documents
    await deleteDoc(doc(db, 'friendConnections', connectionId1));
    await deleteDoc(doc(db, 'friendConnections', connectionId2));
  } catch (error) {
    console.error('Error removing friend:', error);
    throw error;
  }
}

/**
 * Subscribe to friends list changes
 */
export function subscribeToFriends(
  userId: string,
  callback: (friends: FriendProfile[]) => void
): () => void {
  const friendsRef = collection(db, 'friendConnections');
  const q = query(
    friendsRef,
    where('userId', '==', userId),
    where('status', '==', 'accepted')
  );

  return onSnapshot(q, async (snapshot) => {
    const friends: FriendProfile[] = [];

    for (const docSnap of snapshot.docs) {
      const connection = docSnap.data() as FriendConnection;
      const friendDoc = await getDoc(doc(db, 'users', connection.friendId));
      
      if (friendDoc.exists()) {
        const friendData = friendDoc.data();
        
        // Get user's mute preference
        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.data();
        const mutedFriends = userData?.mutedFriends || [];
        const muted = mutedFriends.includes(connection.friendId);

        // Get last completion date
        const completions = friendData.dailyCompletions || [];
        const lastCompletion = completions
          .filter((c: any) => c.allCompleted === true)
          .sort((a: any, b: any) => b.date.localeCompare(a.date))[0];

        // Calculate weekly consistency
        const weekStart = getWeekStartDateString();
        const weekCompletions = completions.filter((c: any) => {
          return c.date >= weekStart && c.allCompleted === true;
        });
        const uniqueDays = new Set(weekCompletions.map((c: any) => c.date));
        const weeklyConsistency = Math.round((uniqueDays.size / 7) * 100);

        friends.push({
          userId: connection.friendId,
          email: friendData.email,
          friendCode: friendData.friendCode,
          muted,
          lastCompletionDate: lastCompletion?.date,
          weeklyConsistency,
        });
      }
    }

    callback(friends);
  });
}

/**
 * Helper function to get week start date string
 */
function getWeekStartDateString(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  const monday = new Date(today);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

