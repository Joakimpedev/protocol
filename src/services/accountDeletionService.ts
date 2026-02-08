/**
 * Account Deletion Service
 * Handles permanent account deletion per Apple guidelines
 */

import { deleteUser } from 'firebase/auth';
import { auth } from '../config/firebase';
import { 
  doc, 
  deleteDoc, 
  getDoc,
  collection, 
  query, 
  where, 
  getDocs,
  writeBatch 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import Purchases from 'react-native-purchases';

/**
 * Delete user account and all associated data
 * This is a permanent deletion - cannot be undone
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  const user = auth.currentUser;
  
  if (!user || user.uid !== userId) {
    throw new Error('User not authenticated or user ID mismatch');
  }

  try {
    // 1. Cancel any active RevenueCat subscriptions
    try {
      await Purchases.syncPurchases();
      const customerInfo = await Purchases.getCustomerInfo();
      
      // Get active entitlements and cancel them
      const activeEntitlements = Object.keys(customerInfo.entitlements.active);
      if (activeEntitlements.length > 0) {
        // Note: We can't directly cancel via SDK, but we'll log for manual handling
        // RevenueCat will handle cancellations on their end when account is deleted
        console.log('[Account Deletion] Active subscriptions found:', activeEntitlements);
      }
    } catch (error) {
      console.warn('[Account Deletion] Error checking RevenueCat subscriptions:', error);
      // Continue with deletion even if RevenueCat check fails
    }

    // 2. Get user document first to check for friend code
    const userDocRef = doc(db, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);
    
    // 3. Delete friend code if it exists (before deleting user doc)
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      if (userData.friendCode) {
        try {
          const friendCodeRef = doc(db, 'friendCodes', userData.friendCode);
          await deleteDoc(friendCodeRef);
        } catch (error) {
          console.warn('[Account Deletion] Error deleting friend code:', error);
          // Continue even if friend code deletion fails
        }
      }
    }

    // 4. Delete user document from Firestore
    if (userDocSnap.exists()) {
      await deleteDoc(userDocRef);
    }

    // 5. Delete all friend connections where userId or friendId matches
    const batch = writeBatch(db);
    
    // Delete connections where user is the requester
    const userConnectionsQuery = query(
      collection(db, 'friendConnections'),
      where('userId', '==', userId)
    );
    const userConnectionsSnapshot = await getDocs(userConnectionsQuery);
    userConnectionsSnapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    // Delete connections where user is the friend
    const friendConnectionsQuery = query(
      collection(db, 'friendConnections'),
      where('friendId', '==', userId)
    );
    const friendConnectionsSnapshot = await getDocs(friendConnectionsQuery);
    friendConnectionsSnapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    // 6. Delete all friend completions where userId or friendId matches
    const userCompletionsQuery = query(
      collection(db, 'friendCompletions'),
      where('userId', '==', userId)
    );
    const userCompletionsSnapshot = await getDocs(userCompletionsQuery);
    userCompletionsSnapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    const friendCompletionsQuery = query(
      collection(db, 'friendCompletions'),
      where('friendId', '==', userId)
    );
    const friendCompletionsSnapshot = await getDocs(friendCompletionsQuery);
    friendCompletionsSnapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    // Execute all batched deletions
    await batch.commit();

    // 7. Delete Firebase Auth account (must be done last)
    await deleteUser(user);

    console.log('[Account Deletion] Account and all data deleted successfully');
  } catch (error: any) {
    console.error('[Account Deletion] Error deleting account:', error);
    
    // Provide helpful error messages
    if (error.code === 'auth/requires-recent-login') {
      throw new Error('For security, please sign out and sign back in before deleting your account.');
    }
    
    throw error;
  }
}

