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
  TRIAL_STARTED: 'protocol_trial_started',
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
