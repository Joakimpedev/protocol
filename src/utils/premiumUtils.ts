/**
 * Premium Utilities
 * 
 * Helper functions for checking premium access and gating features
 */

import { usePremium } from '../contexts/PremiumContext';
import { canAccessPremiumFeatures } from '../services/subscriptionService';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to check if user can access premium features
 * Use this in components that need premium checks
 */
export function useCanAccessPremium(): boolean {
  const { isPremium } = usePremium();
  return isPremium;
}

/**
 * Check if user can access Week 5+ photos
 * Week 0-4 are free, Week 5+ requires premium
 */
export function canAccessWeek5PlusPhotos(weekNumber: number, isPremium: boolean): boolean {
  return weekNumber < 5 || isPremium;
}

/**
 * Check if user can access detailed weekly summary
 * Free tier: basic consistency % only
 * Premium: detailed breakdown by routine type, streaks, trends
 */
export function canAccessDetailedSummary(isPremium: boolean): boolean {
  return isPremium;
}

/**
 * Check if user can compare stats with friends
 * Free tier: can see friends list and basic info
 * Premium: can compare consistency scores and weekly stats
 */
export function canCompareFriendStats(isPremium: boolean): boolean {
  return isPremium;
}

/**
 * Check if user can regenerate their plan
 * Free tier: 1 plan generation (during onboarding)
 * Premium: unlimited plan regeneration
 */
export function canRegeneratePlan(isPremium: boolean, hasRegeneratedBefore: boolean): boolean {
  return isPremium || !hasRegeneratedBefore;
}



