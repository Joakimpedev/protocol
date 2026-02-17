/**
 * Hook for PostHog A/B testing via feature flags.
 *
 * Usage:
 *   const variant = useABTest('paywall-cta-test');
 *   // variant is the string value from PostHog (e.g. 'control', 'test', etc.)
 *   // or undefined while loading / if flag doesn't exist.
 *
 * Automatically fires an `ab_test_exposure` event on first render
 * so PostHog links the exposure to the user for experiment analysis.
 */

import { useEffect, useRef } from 'react';
import { usePostHog, useFeatureFlag, useFeatureFlagWithPayload } from 'posthog-react-native';

/**
 * Returns the variant string for a PostHog feature flag / experiment.
 * Tracks exposure automatically so PostHog can attribute conversions.
 */
export function useABTest(flagKey: string) {
  const posthog = usePostHog();
  const variant = useFeatureFlag(flagKey);
  const tracked = useRef(false);

  useEffect(() => {
    if (variant !== undefined && !tracked.current && posthog) {
      tracked.current = true;
      posthog.capture('ab_test_exposure', {
        flag_key: flagKey,
        variant,
      });
    }
  }, [variant, flagKey, posthog]);

  return variant;
}

/**
 * Same as useABTest but also returns the JSON payload attached to the flag.
 * Useful when the experiment needs dynamic config (prices, copy, colors, etc.)
 */
export function useABTestWithPayload(flagKey: string) {
  const posthog = usePostHog();
  const [variant, payload] = useFeatureFlagWithPayload(flagKey);
  const tracked = useRef(false);

  useEffect(() => {
    if (variant !== undefined && !tracked.current && posthog) {
      tracked.current = true;
      posthog.capture('ab_test_exposure', {
        flag_key: flagKey,
        variant,
      });
    }
  }, [variant, flagKey, posthog]);

  return { variant, payload };
}
