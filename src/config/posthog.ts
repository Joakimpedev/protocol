/**
 * PostHog analytics configuration.
 * Used for product analytics; triggers/events are added separately.
 */

export const POSTHOG_API_KEY = 'phc_OXGg448mqTo13UhPa0FI1DJXcYsh7dGq9wW6yVqIw66';
export const POSTHOG_HOST = 'https://us.i.posthog.com';

export const posthogConfig = {
  apiKey: POSTHOG_API_KEY,
  options: {
    host: POSTHOG_HOST,
    enableSessionReplay: false,
  },
} as const;
