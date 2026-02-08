/**
 * TikTok Business SDK Service
 *
 * Handles TikTok SDK initialization and event tracking
 * iOS only - Android returns early from all functions
 */

import { Platform } from "react-native";
import {
  TikTokBusiness,
  TikTokContentEventName,
  TikTokContentEventParameter,
  TikTokEventName,
} from "react-native-tiktok-business-sdk";
import * as TrackingTransparency from "expo-tracking-transparency";
import { tiktokConfig } from "../config/tiktok.config";

let isSDKInitialized = false;
const debug = __DEV__;

/**
 * Initialize TikTok SDK (iOS only)
 * Call once on app startup
 */
export async function initTikTok(): Promise<void> {
  if (Platform.OS !== "ios") {
    console.warn("[TikTok] SDK is iOS-only, skipping on", Platform.OS);
    return;
  }

  if (isSDKInitialized) {
    console.log("[TikTok] SDK already initialized");
    return;
  }

  try {
    console.log("[TikTok] Initializing SDK...");
    await TikTokBusiness.initializeSdk(
      tiktokConfig.appId,
      tiktokConfig.tiktokAppId,
      tiktokConfig.tiktokAppSecret,
      debug
    );
    isSDKInitialized = true;
    console.log("[TikTok] ✅ SDK initialized successfully");
  } catch (error: any) {
    console.error("[TikTok] ❌ Failed to initialize SDK:", error?.message, error);
    // Mark as initialized anyway to prevent repeated failures
    isSDKInitialized = true;
  }
}

/**
 * Request iOS tracking permission (App Tracking Transparency)
 * Should be called before identifying users or tracking events
 */
export async function requestTrackingPermission(): Promise<boolean> {
  if (Platform.OS !== "ios") {
    return true;
  }

  try {
    const { status } = await TrackingTransparency.requestTrackingPermissionsAsync();
    console.log("[TikTok] Tracking permission status:", status);
    return status === "granted";
  } catch (error: any) {
    console.warn("[TikTok] ⚠️ Failed to request tracking permission:", error?.message);
    return false;
  }
}

/**
 * Identify a user in TikTok
 * Call after user signs in or signs up
 */
export async function identifyUser(
  userId: string,
  userProperties?: Record<string, any>
): Promise<void> {
  if (Platform.OS !== "ios") return;

  if (!isSDKInitialized) await initTikTok();

  try {
    // TikTok identify: (userId, email, phoneNumber, externalId)
    // We only have userId, so pass empty strings for other fields
    await TikTokBusiness.identify(userId, "", "", userId);
    console.log("[TikTok] ✅ User identified:", userId);
  } catch (error: any) {
    console.warn("[TikTok] ⚠️ Failed to identify user:", error?.message);
  }
}

/**
 * Reset user identity (call on logout)
 */
export async function resetUser(): Promise<void> {
  if (Platform.OS !== "ios") return;

  if (!isSDKInitialized) await initTikTok();

  try {
    // TikTok doesn't have a specific reset method, so we identify with empty values
    await TikTokBusiness.identify("", "", "", "");
    console.log("[TikTok] ✅ User identity reset");
  } catch (error: any) {
    console.warn("[TikTok] ⚠️ Failed to reset user:", error?.message);
  }
}

/**
 * Track a generic event
 * Automatically handles ViewContent, LaunchApplication, and custom events
 */
export async function trackEvent(
  eventName: string,
  eventParams: Record<string, any> = {},
  userId?: string
): Promise<void> {
  if (Platform.OS !== "ios") return;

  if (!isSDKInitialized) await initTikTok();

  try {
    // Identify user if provided
    if (userId) {
      await TikTokBusiness.identify(userId, "", "", userId);
    }

    // Handle different event types
    switch (eventName) {
      case "ViewContent":
        await TikTokBusiness.trackContentEvent(
          TikTokContentEventName.VIEW_CONTENT,
          eventParams as any
        );
        await TikTokBusiness.flush().catch(() => {});
        console.log("[TikTok] ✅ Tracked ViewContent");
        return;

      case "LaunchApplication":
        await TikTokBusiness.trackEvent(
          TikTokEventName.LAUNCH_APP,
          undefined,
          eventParams as any
        );
        await TikTokBusiness.flush().catch(() => {});
        console.log("[TikTok] ✅ Tracked LaunchApplication");
        return;

      default:
        // Custom event
        await TikTokBusiness.trackCustomEvent(eventName, eventParams || {});
        await TikTokBusiness.flush();
        console.log(`[TikTok] ✅ Tracked custom event: ${eventName}`);
        return;
    }
  } catch (error: any) {
    console.error(`[TikTok] ❌ Failed to track event ${eventName}:`, error?.message, error);
  }
}

/**
 * Track user sign-in
 */
export async function trackSignedIn(method: "apple" | "email"): Promise<void> {
  await trackEvent("SignIn", { method });
}

/**
 * Track trial started (main conversion event)
 * This is the key optimization event for TikTok ads
 */
export async function trackTrialStarted(): Promise<void> {
  await trackEvent("TrialStarted", {});
}

/**
 * Track premium purchase (for existing users upgrading)
 */
export async function trackPurchased(): Promise<void> {
  await trackEvent("PurchasedPremium", {});
}

/**
 * Track user registration/sign-up
 */
export async function trackCompleteRegistration(
  registrationMethod: "email" | "google" | "apple",
  userId?: string
): Promise<void> {
  if (Platform.OS !== "ios") return;

  if (!isSDKInitialized) await initTikTok();

  try {
    // Identify user if provided
    if (userId) {
      await TikTokBusiness.identify(userId, "", "", userId);
    }

    // Track CompleteRegistration event
    await TikTokBusiness.trackEvent(TikTokEventName.REGISTRATION, undefined, {
      registration_method: registrationMethod,
    } as any);
    await TikTokBusiness.flush().catch(() => {});
    console.log("[TikTok] ✅ Tracked CompleteRegistration:", registrationMethod);
  } catch (error: any) {
    console.warn("[TikTok] ⚠️ Failed to track CompleteRegistration:", error?.message);
  }
}
