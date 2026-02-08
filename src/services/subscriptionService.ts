/**
 * Subscription Service - RevenueCat Integration
 * 
 * Manages premium subscription state, purchases, and cancellation handling
 */

import Purchases, { 
  PurchasesPackage, 
  PurchasesOffering,
  CustomerInfo,
  LOG_LEVEL 
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// RevenueCat API Keys - Configured in RevenueCat dashboard
const REVENUECAT_API_KEY = Platform.select({
  ios: 'appl_QUwdYYPCxhQMMSdqeenQUjeUSLZ', // iOS SDK API key
  android: 'YOUR_ANDROID_API_KEY_HERE', // Replace with your Android API key when available
  default: '',
});

// Product identifiers - These must match your RevenueCat product IDs
export const PRODUCT_IDS = {
  MONTHLY: 'com.protocol.galdr.monthly',
  ANNUAL: 'com.protocol.galdr.yearly',
};

export interface SubscriptionStatus {
  isPremium: boolean;
  isActive: boolean;
  expirationDate: Date | null;
  cancellationDate: Date | null;
  productId: string | null;
  willRenew: boolean;
}

// Track initialization state
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize RevenueCat SDK
 * Should be called once at app startup (in App.tsx or RootNavigator)
 */
export async function initializeRevenueCat(userId: string): Promise<void> {
  // If already initialized, return
  if (isInitialized) {
    return;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      if (!REVENUECAT_API_KEY || REVENUECAT_API_KEY.includes('YOUR_')) {
        console.warn('RevenueCat API key not configured. Subscription features will not work.');
        isInitialized = false;
        return;
      }

      console.log('[RevenueCat] Starting initialization...');
      console.log('[RevenueCat] API Key:', REVENUECAT_API_KEY.substring(0, 15) + '...');
      console.log('[RevenueCat] User ID:', userId);
      console.log('[RevenueCat] Platform:', Platform.OS);

      // Use DEBUG in development, INFO in production for better error visibility
      const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
      const logLevel = isDev ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO;
      console.log('[RevenueCat] Setting log level:', logLevel);
      await Purchases.setLogLevel(logLevel);
      
      console.log('[RevenueCat] Configuring SDK...');
      await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
      console.log('[RevenueCat] SDK configured successfully');
      
      // Set user ID for RevenueCat (link to Firebase Auth user)
      console.log('[RevenueCat] Logging in user...');
      await Purchases.logIn(userId);
      console.log('[RevenueCat] User logged in successfully');
      
      // Verify initialization by checking if we can get customer info
      try {
        console.log('[RevenueCat] Verifying initialization...');
        const customerInfo = await Purchases.getCustomerInfo();
        console.log('[RevenueCat] Initialized successfully. Customer ID:', customerInfo.originalAppUserId);
      } catch (verifyError: any) {
        console.warn('[RevenueCat] Configured but customer info check failed:', verifyError?.message || verifyError);
        // Still mark as initialized - this might be a temporary issue
      }
      
      isInitialized = true;
      console.log('[RevenueCat] Initialization complete');
    } catch (error: any) {
      console.error('[RevenueCat] Initialization failed:', error);
      console.error('[RevenueCat] Error type:', error?.constructor?.name);
      console.error('[RevenueCat] Error message:', error?.message);
      console.error('[RevenueCat] Error stack:', error?.stack);
      isInitialized = false;
      // Re-throw to help with debugging
      throw error;
    } finally {
      initializationPromise = null;
    }
  })();

  return initializationPromise;
}

/**
 * Check if RevenueCat is configured
 */
export function isRevenueCatConfigured(): boolean {
  return !!(REVENUECAT_API_KEY && !REVENUECAT_API_KEY.includes('YOUR_'));
}

/**
 * Check if RevenueCat is initialized and ready to use
 */
export function isRevenueCatInitialized(): boolean {
  return isInitialized;
}

/**
 * Log in RevenueCat with a user ID (e.g. after anonymous init).
 * Call this when user signs in and RevenueCat was already initialized with 'anonymous'.
 */
export async function logInRevenueCat(userId: string): Promise<void> {
  if (!isInitialized) return;
  try {
    await Purchases.logIn(userId);
    console.log('[RevenueCat] Logged in user:', userId);
  } catch (error: any) {
    console.warn('[RevenueCat] logIn failed:', error?.message || error);
  }
}

/**
 * Find the annual/yearly package from an offering.
 */
export function getAnnualPackageFromOffering(offering: PurchasesOffering | null): PurchasesPackage | null {
  if (!offering?.availablePackages?.length) return null;
  return offering.availablePackages.find(
    (pkg) =>
      pkg.packageType === 'ANNUAL' ||
      pkg.identifier.toLowerCase().includes('annual') ||
      pkg.identifier.toLowerCase().includes('yearly')
  ) ?? null;
}

/**
 * Get current subscription status from RevenueCat
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  // If RevenueCat is not configured, return default status without trying to access it
  if (!isRevenueCatConfigured()) {
    return {
      isPremium: false,
      isActive: false,
      expirationDate: null,
      cancellationDate: null,
      productId: null,
      willRenew: false,
    };
  }

  // If not initialized yet, return default status
  if (!isInitialized) {
    console.warn('RevenueCat not initialized yet. Returning default subscription status.');
    return {
      isPremium: false,
      isActive: false,
      expirationDate: null,
      cancellationDate: null,
      productId: null,
      willRenew: false,
    };
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return parseCustomerInfo(customerInfo);
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return {
      isPremium: false,
      isActive: false,
      expirationDate: null,
      cancellationDate: null,
      productId: null,
      willRenew: false,
    };
  }
}

/**
 * Parse RevenueCat CustomerInfo into our SubscriptionStatus format
 */
function parseCustomerInfo(customerInfo: CustomerInfo): SubscriptionStatus {
  const entitlements = customerInfo.entitlements.active;
  const isPremium = Object.keys(entitlements).length > 0;
  
  if (!isPremium) {
    return {
      isPremium: false,
      isActive: false,
      expirationDate: null,
      cancellationDate: null,
      productId: null,
      willRenew: false,
    };
  }

  // Get the first active entitlement (assuming 'premium' entitlement)
  const entitlement = Object.values(entitlements)[0];
  const latestTransaction = entitlement.latestPurchaseDate;
  const expirationDate = entitlement.expirationDate ? new Date(entitlement.expirationDate) : null;
  const productId = entitlement.productIdentifier;
  
  // Check if user has cancelled (willRenew indicates if subscription will auto-renew)
  const willRenew = entitlement.willRenew ?? true;

  return {
    isPremium: true,
    isActive: true,
    expirationDate,
    cancellationDate: willRenew ? null : new Date(), // Approximate cancellation date
    productId,
    willRenew,
  };
}

/**
 * Wait for RevenueCat to be initialized (with timeout)
 */
export async function waitForInitialization(timeoutMs: number = 15000): Promise<boolean> {
  if (isInitialized) {
    console.log('[RevenueCat] Already initialized');
    return true;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    console.log('[RevenueCat] Waiting for initialization to complete (timeout:', timeoutMs, 'ms)...');
    try {
      await Promise.race([
        initializationPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Initialization timeout after ${timeoutMs}ms`)), timeoutMs)
        )
      ]);
      const success = isInitialized;
      console.log('[RevenueCat] Initialization wait result:', success);
      return success;
    } catch (error: any) {
      console.error('[RevenueCat] Error waiting for initialization:', error?.message || error);
      console.error('[RevenueCat] Current initialization state:', isInitialized);
      return false;
    }
  }

  console.warn('[RevenueCat] No initialization in progress');
  return false;
}

/**
 * Get available subscription offerings (packages)
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  // Wait for initialization if not already initialized
  if (!isInitialized) {
    console.log('RevenueCat not initialized yet. Waiting for initialization...');
    const initialized = await waitForInitialization();
    if (!initialized) {
      console.warn('RevenueCat initialization timeout or failed. Cannot get offerings.');
      return null;
    }
  }

  try {
    const offerings = await Purchases.getOfferings();
    if (!offerings.current) {
      console.warn('No current offering available in RevenueCat');
      return null;
    }
    console.log('Successfully loaded offerings:', offerings.current.identifier, 'Packages:', offerings.current.availablePackages.length);
    return offerings.current;
  } catch (error) {
    console.error('Error getting offerings:', error);
    return null;
  }
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
  if (!isInitialized) {
    return { success: false, error: 'RevenueCat not initialized yet' };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    
    // Sync subscription status to Firestore
    const status = parseCustomerInfo(customerInfo);
    await syncSubscriptionToFirestore(status);
    
    return { success: true, customerInfo };
  } catch (error: any) {
    // User cancelled - not an error
    if (error.userCancelled) {
      return { success: false, error: 'Purchase cancelled' };
    }
    
    console.error('Error purchasing package:', error);
    return { success: false, error: error.message || 'Purchase failed' };
  }
}

/**
 * Restore previous purchases (for users who reinstalled or use a new device).
 * Apple ties the subscription to the user's Apple ID; restore fetches it and links to the current app user.
 *
 * @param userId - Optional. If provided (e.g. from TrialPaywall), subscription is synced to this user's Firestore doc.
 *                 Call logInRevenueCat(userId) before this so RevenueCat links the restored receipt to this user.
 */
export async function restorePurchases(userId?: string): Promise<{ success: boolean; isPremium: boolean }> {
  if (!isInitialized) {
    return { success: false, isPremium: false };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    const status = parseCustomerInfo(customerInfo);

    if (userId) {
      await syncSubscriptionToFirestore(status, userId);
    }

    return { success: true, isPremium: status.isPremium };
  } catch (error) {
    console.error('Error restoring purchases:', error);
    return { success: false, isPremium: false };
  }
}

/**
 * Sync subscription status to Firestore for easy access.
 * Uses setDoc with merge so it works even when the user doc doesn't exist yet (e.g. after restore on reinstall).
 */
export async function syncSubscriptionToFirestore(status: SubscriptionStatus, userId?: string): Promise<void> {
  try {
    if (!userId) {
      console.warn('Cannot sync subscription to Firestore: userId not provided');
      return;
    }

    const userRef = doc(db, 'users', userId);
    const subscriptionData: Record<string, unknown> = {
      isPremium: status.isPremium,
      subscriptionExpirationDate: status.expirationDate?.toISOString() || null,
      subscriptionCancellationDate: status.cancellationDate?.toISOString() || null,
      subscriptionProductId: status.productId || null,
      subscriptionWillRenew: status.willRenew,
      subscriptionUpdatedAt: new Date().toISOString(),
    };

    await setDoc(userRef, subscriptionData, { merge: true });
  } catch (error) {
    console.error('Error syncing subscription to Firestore:', error);
  }
}

/**
 * Get subscription status from Firestore (faster than RevenueCat API call)
 */
export async function getSubscriptionStatusFromFirestore(userId: string): Promise<SubscriptionStatus> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return {
        isPremium: false,
        isActive: false,
        expirationDate: null,
        cancellationDate: null,
        productId: null,
        willRenew: false,
      };
    }

    const data = userDoc.data();
    const expirationDate = data.subscriptionExpirationDate 
      ? new Date(data.subscriptionExpirationDate) 
      : null;
    const cancellationDate = data.subscriptionCancellationDate
      ? new Date(data.subscriptionCancellationDate)
      : null;

    // Check if subscription is still active (not expired)
    const isActive = expirationDate ? expirationDate > new Date() : false;
    // If isPremium is explicitly false in Firestore, return false regardless of isActive
    // Otherwise, check if it's true AND active
    const isPremium = data.isPremium === false ? false : (data.isPremium === true && isActive);

    return {
      isPremium,
      isActive,
      expirationDate,
      cancellationDate,
      productId: data.subscriptionProductId || null,
      willRenew: data.subscriptionWillRenew ?? true,
    };
  } catch (error) {
    console.error('Error getting subscription status from Firestore:', error);
    return {
      isPremium: false,
      isActive: false,
      expirationDate: null,
      cancellationDate: null,
      productId: null,
      willRenew: false,
    };
  }
}

/**
 * Check if user can access premium features (Week 5+ photos, etc.)
 * For cancelled users, check if they're within 6-month retention period
 */
export async function canAccessPremiumFeatures(userId: string): Promise<boolean> {
  const status = await getSubscriptionStatusFromFirestore(userId);
  
  if (status.isPremium && status.isActive) {
    return true;
  }

  // If cancelled, check if within 6-month retention period
  if (status.cancellationDate) {
    const sixMonthsLater = new Date(status.cancellationDate);
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
    return new Date() < sixMonthsLater;
  }

  return false;
}

/**
 * Handle subscription cancellation notification from RevenueCat webhook
 * This should be called when RevenueCat sends cancellation webhook to your backend
 * For now, we'll check this periodically via getSubscriptionStatus
 */
export async function handleSubscriptionCancellation(userId: string): Promise<void> {
  const status = await getSubscriptionStatus();
  await syncSubscriptionToFirestore(status, userId);
  
  // Schedule deletion warning notification (7 days before 6-month deadline)
  // This would typically be handled by a backend cron job
  // For MVP, we can check this client-side periodically
}

/**
 * Dev tool: Enable/disable premium mode directly in Firestore (bypasses RevenueCat)
 * WARNING: This is for development/testing only. Do not use in production.
 */
export async function setDevPremiumMode(userId: string, enabled: boolean): Promise<SubscriptionStatus> {
  try {
    const status: SubscriptionStatus = enabled
      ? {
          isPremium: true,
          isActive: true,
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
          cancellationDate: null,
          productId: 'dev_premium',
          willRenew: false,
        }
      : {
          isPremium: false,
          isActive: false,
          expirationDate: null,
          cancellationDate: null,
          productId: null,
          willRenew: false,
        };

    await syncSubscriptionToFirestore(status, userId);
    return status;
  } catch (error) {
    console.error('Error setting dev premium mode:', error);
    throw error;
  }
}


