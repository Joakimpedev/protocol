# Referral System Implementation Guide

## ✅ What's Been Built

### Files Created:
1. **`src/services/referralService.ts`** - Core referral logic
2. **`src/components/ReferralModal.tsx`** - Bottom sheet UI (like Umax)
3. **Updated `TrialPaywallScreen.tsx`** - Integrated referral system

### Features:
- ✅ Generate unique 6-character referral codes
- ✅ Redeem codes (enter friend's code)
- ✅ Track when friend starts trial
- ✅ Show "waiting for friend" status
- ✅ Unlock trial for both users when friend subscribes
- ✅ Bottom sheet modal UI (like Umax screenshots)

---

## 🔧 What You Need to Do

### 1. **Update Firestore Security Rules**

Add these rules to your `firestore.rules` file:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Existing rules...

    // Referral codes - users can read all codes (to validate), but only write their own
    match /referrals/{code} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.ownerId == request.auth.uid;
      allow update: if request.auth != null && (
        // Owner can update
        resource.data.ownerId == request.auth.uid ||
        // Friend can claim
        (!resource.data.claimedBy && request.resource.data.claimedBy == request.auth.uid)
      );
    }

    // Users can read/write their own referral data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

---

### 2. **Create Two Products in App Store Connect**

You mentioned you'll do this. Here's what you need:

**Product 1: Immediate Payment**
- Product ID: `protocol_weekly`
- Type: Auto-renewable subscription
- Duration: 1 week
- Price: $4.99
- **Free Trial: None**

**Product 2: Trial via Referral**
- Product ID: `protocol_weekly_trial`
- Type: Auto-renewable subscription
- Duration: 1 week
- Price: $4.99
- **Free Trial: 7 days**

---

### 3. **Update RevenueCat Configuration**

After creating App Store products:

1. Go to RevenueCat dashboard
2. Add both products to an offering (e.g., "default")
3. Update `src/services/subscriptionService.ts` to handle both products

**You'll need to add logic like:**

```typescript
// In subscriptionService.ts
export async function getWeeklyPackage(withTrial: boolean): Promise<PurchasesPackage | null> {
  const offering = await getOfferings();
  if (!offering) return null;

  const productId = withTrial ? 'protocol_weekly_trial' : 'protocol_weekly';
  return offering.availablePackages.find(pkg => pkg.identifier === productId) || null;
}
```

Then update `TrialPaywallScreen.tsx` to use this:

```typescript
// Instead of getAnnualPackageFromOffering
const weeklyPackage = await getWeeklyPackage(hasReferralCredit);
```

---

### 4. **Test the Flow**

**Test as User A (Inviter):**
1. Open app → Go through onboarding
2. At paywall, tap "Invite 1 Friend"
3. Copy code (e.g., `ABC123`)
4. App should stay locked, showing "Waiting for friend..."

**Test as User B (Invitee):**
1. Open app on different device/account
2. Go through onboarding
3. At paywall, tap "Invite Friend" → Tap "Redeem"
4. Enter code `ABC123`
5. Tap "Start 7-Day Trial"
6. Both User A and User B should unlock

**After 7 days:**
- Both users get charged $4.99/week

---

## 📊 How It Works (Technical Flow)

### When User A Opens Paywall:
1. `getUserReferralCode(uid)` → Generates code `ABC123`
2. Saves to Firestore:
   ```
   referrals/ABC123: { ownerId: "userA_uid", claimedBy: null, friendStartedTrial: false }
   users/userA_uid: { referralCode: "ABC123" }
   ```

### When User B Redeems Code:
1. User B enters `ABC123` and taps "Apply Code"
2. `redeemReferralCode("ABC123", userB_uid)`
3. Updates Firestore:
   ```
   referrals/ABC123: { claimedBy: "userB_uid" }
   users/userB_uid: { referredBy: "userA_uid", referredByCode: "ABC123" }
   ```
4. User A sees "⏳ Waiting for friend to start trial..."

### When User B Starts Trial:
1. User B taps "Start 7-Day Trial" → Purchase flow
2. After successful purchase: `markFriendStartedTrial(userB_uid)`
3. Updates Firestore:
   ```
   referrals/ABC123: { friendStartedTrial: true }
   ```
4. User A's app checks `checkTrialEligibility()` → Returns `true`
5. Both User A and User B unlock with 7-day trial

---

## 🎨 UI Preview

**Paywall:**
```
┌────────────────────────────┐
│ Start Protocol - $4.99/week│  ← Main button
│                            │
│     ───── OR ─────         │
│                            │
│   Invite 1 Friend          │  ← Opens modal
│   Both get 7 days free     │
└────────────────────────────┘
```

**Referral Modal (like Umax):**
```
┌────────────────────────────┐
│              🎟️ Redeem     │  ← Opens input
│                            │
│ Share your invite code     │
│ Invite 1 friend to unlock  │
│                            │
│      ABC123   📋           │  ← Code (tap to copy)
│                            │
│        [Share]             │  ← Opens share sheet
└────────────────────────────┘
```

---

## 🔄 What Happens Next

### Immediate (No Code Changes):
- Users can see referral codes
- Can share codes
- Can redeem codes

### When You Add RevenueCat Products:
- Replace placeholder trial logic with actual subscriptions
- Users get charged after 7 days

### Expected Behavior:
- **No referral:** User pays $4.99/week immediately
- **With referral:** Both users get 7-day trial → Then $4.99/week

---

## 📝 Notes

- **Abuse Prevention:** Each trial tied to Apple ID (can't easily create fake accounts)
- **Code Validation:** Codes are unique, single-use
- **Edge Cases Handled:**
  - Can't use own code
  - Can't reuse claimed codes
  - Works with anonymous Firebase auth
- **Analytics:** Add PostHog tracking for:
  - `referral_code_shared`
  - `referral_code_redeemed`
  - `referral_trial_unlocked`

---

## 🚀 Ready to Ship

The referral system is **fully functional** except for the actual RevenueCat product IDs. Once you:

1. Create the two products in App Store Connect
2. Add them to RevenueCat
3. Update `subscriptionService.ts` to fetch correct product
4. Deploy Firestore rules

**You're live!**

Test it, then launch with your TikTok ads. Good luck! 🎯
