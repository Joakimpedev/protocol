/**
 * Premium Context
 * 
 * Provides premium subscription status across the app
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  getSubscriptionStatusFromFirestore,
  getSubscriptionStatus,
  syncSubscriptionToFirestore,
  SubscriptionStatus,
  initializeRevenueCat,
  isRevenueCatConfigured,
} from '../services/subscriptionService';
import { getDevMode } from '../services/devModeService';

interface PremiumContextType {
  isPremium: boolean;
  isLoading: boolean;
  subscriptionStatus: SubscriptionStatus;
  refreshSubscriptionStatus: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isPremium: false,
    isActive: false,
    expirationDate: null,
    cancellationDate: null,
    productId: null,
    willRenew: false,
  });

  // Check if we're in dev mode (__DEV__ is a React Native global)
  const isDevMode = typeof __DEV__ !== 'undefined' && __DEV__;

  // Initialize RevenueCat when user is available (skip in dev mode)
  useEffect(() => {
    if (user && !isDevMode) {
      console.log('[PremiumContext] Initializing RevenueCat for user:', user.uid);
      initializeRevenueCat(user.uid)
        .then(() => {
          console.log('[PremiumContext] RevenueCat initialization completed, refreshing subscription status');
          // After initialization, refresh subscription status
          refreshSubscriptionStatus();
        })
        .catch((error: any) => {
          console.error('[PremiumContext] Failed to initialize RevenueCat:', error);
          console.error('[PremiumContext] Error details:', {
            message: error?.message,
            name: error?.name,
            stack: error?.stack,
          });
          // Still refresh status from Firestore as fallback
          refreshSubscriptionStatus();
        });
    } else if (user && isDevMode) {
      console.log('[PremiumContext] Skipping RevenueCat initialization (dev mode)');
      // In dev mode, check Firestore first to respect dev premium switch
      // If no explicit setting, default to premium enabled
      refreshSubscriptionStatus();
    }
  }, [user, isDevMode]);

  // Refresh subscription status from Firestore (fast) and RevenueCat (authoritative)
  const refreshSubscriptionStatus = useCallback(async () => {
    if (!user) {
      setIsPremium(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Check runtime dev mode setting (from Settings toggle, not just __DEV__)
      const runtimeDevMode = await getDevMode();
      
      // First, get from Firestore for fast UI update
      const firestoreStatus = await getSubscriptionStatusFromFirestore(user.uid);
      
      // In dev mode (build-time OR runtime), always use Firestore value to respect dev premium switch
      // The dev premium switch writes to Firestore, so we check it here
      if (isDevMode || runtimeDevMode) {
        // Use Firestore value directly (respects dev premium switch on/off)
        // This allows dev mode toggle to override RevenueCat subscription
        console.log('[PremiumContext] Dev mode active - using Firestore value, ignoring RevenueCat');
        setSubscriptionStatus(firestoreStatus);
        setIsPremium(firestoreStatus.isPremium);
        setIsLoading(false);
        return;
      }

      // Production mode: use Firestore status
      setSubscriptionStatus(firestoreStatus);
      setIsPremium(firestoreStatus.isPremium);

      // Only sync with RevenueCat if it's configured AND initialized
      if (isRevenueCatConfigured()) {
        // Wait a bit to ensure initialization is complete
        // Then, sync with RevenueCat for authoritative status
        const revenueCatStatus = await getSubscriptionStatus();
        if (revenueCatStatus.isPremium !== firestoreStatus.isPremium) {
          // Status changed, sync to Firestore
          await syncSubscriptionToFirestore(revenueCatStatus, user.uid);
          setSubscriptionStatus(revenueCatStatus);
          setIsPremium(revenueCatStatus.isPremium);
        }
      }
      // If RevenueCat is not configured, we just use Firestore status (useful for dev mode)
    } catch (error) {
      console.error('Error refreshing subscription status:', error);
      // Fallback to Firestore status on error
      const firestoreStatus = await getSubscriptionStatusFromFirestore(user.uid);
      setSubscriptionStatus(firestoreStatus);
      setIsPremium(firestoreStatus.isPremium);
    } finally {
      setIsLoading(false);
    }
  }, [user, isDevMode]);

  // Refresh status periodically (every 5 minutes) to catch cancellations
  // Only start after user is available (initialization happens in separate effect)
  // In dev mode, still refresh to respect dev premium switch changes
  useEffect(() => {
    if (!user) return;

    // Wait a moment for initialization to complete, then refresh
    const timeout = setTimeout(() => {
      refreshSubscriptionStatus();
    }, 1000);

    // In dev mode, refresh more frequently to catch dev switch changes
    // In production, refresh every 5 minutes
    const interval = setInterval(() => {
      refreshSubscriptionStatus();
    }, isDevMode ? 2 * 60 * 1000 : 5 * 60 * 1000); // 2 minutes in dev, 5 minutes in production

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [user, isDevMode]);

  return (
    <PremiumContext.Provider
      value={{
        isPremium,
        isLoading,
        subscriptionStatus,
        refreshSubscriptionStatus,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium(): PremiumContextType {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
}


