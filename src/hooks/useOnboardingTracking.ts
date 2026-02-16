/**
 * PostHog tracking for onboarding screens.
 * All event names use the protocol_ prefix for server filtering.
 */

import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { usePostHog } from 'posthog-react-native';
import { useOnboarding } from '../contexts/OnboardingContext';
import type { OnboardingData } from '../contexts/OnboardingContext';

/** PostHog event names (use these when querying from a server). */
export const POSTHOG_EVENTS = {
  ONBOARDING_SCREEN_VIEWED: 'protocol_onboarding_screen_viewed',
  /** Fired when user completes weekly purchase without referral (paid trial, no 7-day free). */
  WEEKLY_PURCHASE: 'protocol_weekly_purchase',
  /** Fired when user starts 7-day free trial via referral. Use property referral_source to distinguish. */
  FREE_TRIAL_STARTED: 'protocol_free_trial_started',
} as const;

/** For FREE_TRIAL_STARTED: how they got the free trial. */
export const REFERRAL_SOURCE = {
  /** User entered a friend's code (they were referred). */
  ENTERED_FRIEND_CODE: 'entered_friend_code',
  /** Someone used this user's code and started trial (referrer side). */
  FRIEND_USED_MY_CODE: 'friend_used_my_code',
} as const;

/** Screen IDs for the `screen` property (snake_case). */
export const ONBOARDING_SCREENS = {
  WELCOME: 'welcome',
  CATEGORY: 'category',
  SEVERITY: 'severity',
  EDUCATION_REAL_CAUSE: 'education_real_cause',
  IMPACT: 'impact',
  GOAL_SETTING: 'goal_setting',
  TIMELINE_STATS: 'timeline_stats',
  SOCIAL_PROOF: 'social_proof',
  WHY_OTHERS_FAILED: 'why_others_failed',
  CONDITIONAL_FOLLOW_UP: 'conditional_follow_up',
  TIME_COMMITMENT: 'time_commitment',
  MINI_TIMELINE_PREVIEW: 'mini_timeline_preview',
  PROTOCOL_LOADING: 'protocol_loading',
  PROTOCOL_OVERVIEW: 'protocol_overview',
  REASSURANCE_BEFORE_SHOPPING: 'reassurance_before_shopping',
  PRODUCTS_PRIMER: 'products_primer',
  SHOPPING: 'shopping',
  WHY_THIS_WORKS: 'why_this_works',
  WOW_MOMENT: 'wow_moment',
  COMMITMENT: 'commitment',
  TRIAL_OFFER: 'trial_offer',
  TRIAL_REMINDER: 'trial_reminder',
  TRIAL_PAYWALL: 'trial_paywall',
  // V2 onboarding screens
  V2_HERO: 'v2_hero',
  V2_FACE_SCAN: 'v2_face_scan',
  V2_GET_RATING: 'v2_get_rating',
  V2_PERSONALIZED_ROUTINE: 'v2_personalized_routine',
  V2_GENDER: 'v2_gender',
  V2_CONCERNS: 'v2_concerns',
  V2_SKIN_CONCERNS: 'v2_skin_concerns',
  V2_SELF_RATING: 'v2_self_rating',
  V2_SOCIAL_PROOF: 'v2_social_proof',
  V2_LIFE_IMPACT: 'v2_life_impact',
  V2_BEFORE_AFTER: 'v2_before_after',
  V2_TRANSFORMATION_STORY: 'v2_transformation_story',
  V2_JOURNEY: 'v2_journey',
  V2_GROWTH_CHART: 'v2_growth_chart',
  V2_SELFIE: 'v2_selfie',
  V2_REVIEW_ASK: 'v2_review_ask',
  V2_NOTIFICATIONS_ASK: 'v2_notifications_ask',
  V2_FRIEND_CODE: 'v2_friend_code',
  V2_FAKE_ANALYSIS: 'v2_fake_analysis',
  V2_RESULTS_PAYWALL: 'v2_results_paywall',
  V2_PRO_PAYWALL: 'v2_pro_paywall',
  V2_FACE_RATING: 'v2_face_rating',
  V2_PROTOCOL_OVERVIEW: 'v2_protocol_overview',
  V2_SHOPPING: 'v2_shopping',
} as const;

/**
 * Build minimal properties for PostHog: only problems they picked, skin type, and impacts.
 * Keeps payloads small and queries simple.
 */
export function buildOnboardingProperties(data: OnboardingData): Record<string, unknown> {
  const problems = data.selectedProblems?.length ? data.selectedProblems : (data.selectedCategories || []);
  const props: Record<string, unknown> = {};
  if (problems.length) props.selected_problems = problems;
  if (data.skinType) props.skin_type = data.skinType;
  if (data.impacts?.length) props.impacts = data.impacts;
  return props;
}

/**
 * Call from each onboarding screen to track view with cumulative picks.
 * Fires on every focus (each time user lands on the screen).
 */
export function useOnboardingTracking(screenId: string): void {
  const posthog = usePostHog();
  const { data } = useOnboarding();
  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!posthog) return;
      const properties = buildOnboardingProperties(data);
      posthog.capture(POSTHOG_EVENTS.ONBOARDING_SCREEN_VIEWED, {
        screen: screenId,
        ...properties,
      });
    });
    return unsubscribe;
  }, [navigation, posthog, screenId, data]);
}
