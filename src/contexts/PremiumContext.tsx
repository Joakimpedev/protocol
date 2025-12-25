/**
 * Premium Context
 * 
 * Provides premium subscription status across the app
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  getSubscriptionStatusFromFirestore,
  getSubscriptionStatus,
  syncSubscriptionToFirestore,
  SubscriptionStatus,
  initializeRevenueCat,
  isRevenueCatConfigured,
} from '../services/subscriptionService';

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

  // Initialize RevenueCat when user is available
  useEffect(() => {
    if (user) {
      initializeRevenueCat(user.uid).then(() => {
        refreshSubscriptionStatus();
      });
    }
  }, [user]);

  // Refresh subscription status from Firestore (fast) and RevenueCat (authoritative)
  const refreshSubscriptionStatus = async () => {
    if (!user) {
      setIsPremium(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // First, get from Firestore for fast UI update
      const firestoreStatus = await getSubscriptionStatusFromFirestore(user.uid);
      setSubscriptionStatus(firestoreStatus);
      setIsPremium(firestoreStatus.isPremium);

      // Only sync with RevenueCat if it's configured
      if (isRevenueCatConfigured()) {
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
  };

  // Refresh status periodically (every 5 minutes) to catch cancellations
  useEffect(() => {
    if (!user) return;

    refreshSubscriptionStatus();

    const interval = setInterval(() => {
      refreshSubscriptionStatus();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user]);

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


