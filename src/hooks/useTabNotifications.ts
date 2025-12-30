/**
 * Hook to check notification states for tabs
 * Returns whether to show notification badges on all tabs
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, onSnapshot, getDoc, collection, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  loadAllPhotos, 
  getCurrentWeekNumber, 
  shouldPromptForWeeklyPhoto,
  ProgressPhoto 
} from '../services/photoService';
import { loadUserRoutine, IngredientSelection } from '../services/routineService';
import { getTodayDateString } from '../services/completionService';
import { getPendingFriendRequests } from '../services/friendService';

export interface TabNotifications {
  today: boolean; // Show notification if not all routine tasks are done today
  progress: boolean; // Show notification if weekly photo is needed
  social: boolean; // Show notification if there are pending friend requests
  protocol: boolean; // Show notification if products are missing
}

export function useTabNotifications(): TabNotifications {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<TabNotifications>({
    today: false,
    progress: false,
    social: false,
    protocol: false,
  });

  useEffect(() => {
    if (!user) {
      setNotifications({ today: false, progress: false, social: false, protocol: false });
      return;
    }

    let isMounted = true;
    let unsubscribe: (() => void) | null = null;
    let friendUnsubscribe: (() => void) | null = null;

    const checkNotifications = async () => {
      try {
        // Check progress notification (weekly photo)
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnapshot = await getDoc(userDocRef);
        
        if (!isMounted) return;
        
        if (userDocSnapshot.exists()) {
          const userData = userDocSnapshot.data();
          const signupDate = userData.signupDate || userData.signup_date;
          const photoDay = userData.photoDay || userData.photo_day || 'monday';

          let needsPhoto = false;

          if (signupDate) {
            const photos = await loadAllPhotos();
            if (!isMounted) return;
            
            const hasWeek0Photo = photos.some(p => p.weekNumber === 0);
            const currentWeek = getCurrentWeekNumber(signupDate);
            const latestWeek = photos.length > 0 ? Math.max(...photos.map(p => p.weekNumber)) : -1;
            const needsWeek0Photo = !hasWeek0Photo && currentWeek >= 0;
            const nextSequentialWeek = latestWeek + 1;
            const shouldShowCurrentWeekPrompt = hasWeek0Photo && nextSequentialWeek === currentWeek;
            const weekToPrompt = shouldShowCurrentWeekPrompt ? nextSequentialWeek : null;

            // Check if photo is needed
            needsPhoto = needsWeek0Photo || (weekToPrompt !== null && shouldPromptForWeeklyPhoto(signupDate, photoDay));
          }

          // Check today notification (incomplete routine tasks)
          // Only show if user has started their routine
          let hasIncompleteTasks = false;
          if (userData.routineStarted) {
            const today = getTodayDateString();
            const dailyCompletions = userData.dailyCompletions || [];
            const todayCompletion = dailyCompletions.find((c: any) => c.date === today);
            hasIncompleteTasks = !todayCompletion || !todayCompletion.allCompleted;
          }

          // Check protocol notification (missing products)
          const routine = await loadUserRoutine(user.uid);
          if (!isMounted) return;
          
          let hasMissingProducts = false;

          if (routine?.ingredientSelections) {
            const ingredientSelections = routine.ingredientSelections;
            // Check if there are any ingredients with pending or not_received state (not skipped)
            hasMissingProducts = ingredientSelections.some((sel: IngredientSelection) => {
              const state = sel.state === 'added' ? 'active' : 
                          sel.state === 'not_received' ? (sel.waiting_for_delivery ? 'deferred' : 'pending') :
                          sel.state;
              // Missing if pending, deferred, or not_received (but not skipped)
              return (state === 'pending' || state === 'deferred' || state === 'not_received') && state !== 'skipped';
            });
          }

          // Check social notification (pending friend requests)
          const pendingRequests = await getPendingFriendRequests(user.uid);
          if (!isMounted) return;
          const hasPendingRequests = pendingRequests.length > 0;

          if (isMounted) {
            setNotifications({
              today: hasIncompleteTasks,
              progress: needsPhoto,
              social: hasPendingRequests,
              protocol: hasMissingProducts,
            });
          }
        }
      } catch (error) {
        console.error('Error checking tab notifications:', error);
      }
    };

    // Initial check
    checkNotifications();

    // Subscribe to user document changes (for today, progress, protocol)
    unsubscribe = onSnapshot(doc(db, 'users', user.uid), async () => {
      await checkNotifications();
    });

    // Subscribe to friend connections changes (for social notifications)
    const friendConnectionsRef = collection(db, 'friendConnections');
    const friendQuery = query(
      friendConnectionsRef,
      where('userId', '==', user.uid),
      where('status', '==', 'pending'),
      where('requestedBy', '!=', user.uid) // Only requests sent TO this user
    );
    
    friendUnsubscribe = onSnapshot(friendQuery, async () => {
      await checkNotifications();
    });

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
      if (friendUnsubscribe) friendUnsubscribe();
    };
  }, [user]);

  return notifications;
}

