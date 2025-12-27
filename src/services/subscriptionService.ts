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
        return;
      }

      await Purchases.setLogLevel(LOG_LEVEL.DEBUG); // Use INFO or WARN in production
      await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
      
      // Set user ID for RevenueCat (link to Firebase Auth user)
      await Purchases.logIn(userId);
      
      isInitialized = true;
      console.log('RevenueCat initialized successfully');
    } catch (error) {
      console.error('Error initializing RevenueCat:', error);
      isInitialized = false;
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
 * Get available subscription offerings (packages)
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  if (!isInitialized) {
    console.warn('RevenueCat not initialized yet. Cannot get offerings.');
    return null;
  }

  try {
    const offerings = await Purchases.getOfferings();
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
 * Restore previous purchases (for users who reinstalled app)
 */
export async function restorePurchases(): Promise<{ success: boolean; isPremium: boolean }> {
  if (!isInitialized) {
    return { success: false, isPremium: false };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    const status = parseCustomerInfo(customerInfo);
    
    // Sync subscription status to Firestore
    await syncSubscriptionToFirestore(status);
    
    return { success: true, isPremium: status.isPremium };
  } catch (error) {
    console.error('Error restoring purchases:', error);
    return { success: false, isPremium: false };
  }
}

/**
 * Sync subscription status to Firestore for easy access
 */
export async function syncSubscriptionToFirestore(status: SubscriptionStatus, userId?: string): Promise<void> {
  try {
    // If userId not provided, try to get from RevenueCat (requires initialization)
    // For now, this should be called with userId from AuthContext
    if (!userId) {
      console.warn('Cannot sync subscription to Firestore: userId not provided');
      return;
    }

    const userRef = doc(db, 'users', userId);
    const subscriptionData: any = {
      isPremium: status.isPremium,
      subscriptionExpirationDate: status.expirationDate?.toISOString() || null,
      subscriptionCancellationDate: status.cancellationDate?.toISOString() || null,
      subscriptionProductId: status.productId || null,
      subscriptionWillRenew: status.willRenew,
      subscriptionUpdatedAt: new Date().toISOString(),
    };

    await updateDoc(userRef, subscriptionData);
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


