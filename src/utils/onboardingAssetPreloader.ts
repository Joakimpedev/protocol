/**
 * Preloads all static images and video used in the V2 onboarding flow.
 * Call this early (e.g. when the onboarding navigator mounts) so assets
 * are decoded and ready before the user reaches screens that use them.
 */
import { Asset } from 'expo-asset';
import { Image } from 'react-native';

// All static require() assets used across onboarding-v2 screens
const ONBOARDING_ASSETS = [
  // HeroScreen — video
  require('../../assets/images/smiles video.mp4'),
  // FaceScanScreen
  require('../../assets/images/hero.png'),
  require('../../assets/images/side.png'),
  // BeforeAfterScreen
  require('../../assets/images/before1.png'),
  require('../../assets/images/after.png'),
  // TransformationStoryScreen
  require('../../assets/images/ethan_acne_before.jpg'),
  require('../../assets/images/ethan_acne_after.jpg'),
  require('../../assets/images/saeid_jawline_before.jpg'),
  require('../../assets/images/saeid_jawline_after.jpg'),
  require('../../assets/images/alex_beard_before.jpg'),
  require('../../assets/images/alex_beard_after.jpg'),
  // ReviewAskScreen
  require('../../assets/images/paywall2.png'),
  require('../../assets/images/left-awards-branch-gray.png'),
  require('../../assets/images/right-award-banner-branch-gray-77x138.png'),
  // NotificationsAskScreen
  require('../../assets/images/small-icon.png'),
  // FriendCodeScreen
  require('../../assets/images/paywall1.png'),
];

let preloadPromise: Promise<void> | null = null;

/**
 * Preloads all onboarding assets. Safe to call multiple times —
 * subsequent calls return the same promise.
 */
export function preloadOnboardingAssets(): Promise<void> {
  if (preloadPromise) return preloadPromise;

  preloadPromise = Asset.loadAsync(ONBOARDING_ASSETS)
    .then(() => {
      console.log('[AssetPreloader] All onboarding assets preloaded');
    })
    .catch((err) => {
      console.warn('[AssetPreloader] Failed to preload some assets:', err);
      // Don't block the app if preloading fails
    });

  return preloadPromise;
}

/**
 * Returns true if preloading has been kicked off (not necessarily finished).
 */
export function isPreloadStarted(): boolean {
  return preloadPromise !== null;
}

/**
 * Clears the cached preload promise so assets will be re-fetched
 * next time preloadOnboardingAssets() is called.
 */
export function clearPreloadedAssets(): void {
  preloadPromise = null;
  Image.queryCache?.([])?.catch(() => {});
  console.log('[AssetPreloader] Cleared onboarding asset cache');
}
