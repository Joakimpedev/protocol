# Weekly Pricing Setup Guide

## ✅ Code Changes (Already Done)

- ✅ Added weekly product IDs to `subscriptionService.ts`
- ✅ Added `getWeeklyPackageFromOffering()` function
- ✅ Updated `TrialPaywallScreen` to use weekly packages
- ✅ Referral system ready to unlock trial package

---

## 📱 Step 1: Create Products in App Store Connect

### Go to App Store Connect:
1. Sign in to https://appstoreconnect.apple.com
2. Go to **My Apps** → **Protocol**
3. Click **Subscriptions** (in left sidebar)

### Create Subscription Group (if you don't have one):
1. Click **+** next to Subscription Groups
2. Name: "Protocol Subscriptions"
3. Click **Create**

### Product 1: Weekly (No Trial) - Immediate Payment

Click **+ Create Subscription** in your subscription group:

**Subscription Information:**
- Product ID: `protocol_weekly`
- Reference Name: `Protocol Weekly`
- Subscription Duration: `1 Week`

**Subscription Prices:**
Click **Add Pricing** → Select these countries:

| Country | Price Tier | Actual Price |
|---------|-----------|--------------|
| 🇺🇸 United States | Tier 4 | **$3.99/week** |
| 🇨🇦 Canada | Tier 4 | **$5.49 CAD/week** |
| 🇲🇽 Mexico | Tier 4 | **$69 MXN/week** |
| 🇮🇳 India | Tier 4 | **₹299 INR/week** |

**Free Trial:**
- ❌ **NONE** - Leave blank (this is for immediate payment)

**Save** the product

---

### Product 2: Weekly with 7-Day Trial

Click **+ Create Subscription** again:

**Subscription Information:**
- Product ID: `protocol_weekly_trial`
- Reference Name: `Protocol Weekly Trial`
- Subscription Duration: `1 Week`

**Subscription Prices:**
Same as above (Tier 4 for all countries)

**Free Trial:**
- ✅ **7 days**
- Introductory Offer Type: `Free Trial`
- Duration: `7 Days`
- Eligibility: `All users`

**Save** the product

---

## 🎯 Step 2: Configure RevenueCat

### Go to RevenueCat Dashboard:
1. Sign in to https://app.revenuecat.com
2. Select your project: **Protocol**

### Add Product 1:
1. Click **Products** (left sidebar)
2. Click **+ New**
3. Fill in:
   - Store: `App Store`
   - Product Identifier: `protocol_weekly`
   - Type: `Subscription`
4. Click **Save**

### Add Product 2:
1. Click **+ New** again
2. Fill in:
   - Store: `App Store`
   - Product Identifier: `protocol_weekly_trial`
   - Type: `Subscription`
3. Click **Save**

### Update Offering:
1. Click **Offerings** (left sidebar)
2. Select your **default** offering (or create new one)
3. Click **+ Add Package**
4. Add Package 1:
   - Identifier: `weekly`
   - Product: Select `protocol_weekly`
   - Click **Add**
5. Click **+ Add Package** again
6. Add Package 2:
   - Identifier: `weekly_trial`
   - Product: Select `protocol_weekly_trial`
   - Click **Add**
7. Click **Save**

---

## 🔥 Step 3: Add Firestore Security Rules

Add these to your `firestore.rules` file:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Your existing rules...

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

    // Users can read/write their own data
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

## 🧪 Step 4: Test the Flow

### Test as User A (No Referral):
1. Fresh install or clear app data
2. Go through onboarding
3. At paywall: Should see **"Start Protocol - $3.99/week"**
4. Tap button → Apple purchase sheet shows $3.99/week
5. Complete purchase → Charged immediately

### Test as User B (With Referral):
1. Device A: Tap "Invite 1 Friend" → Copy code `ABC123`
2. Device B (fresh install):
   - Go through onboarding
   - At paywall: Tap "Invite 1 Friend" → "Got a code?"
   - Enter `ABC123` → "Apply Code"
   - Main button now says: **"Start 7-Day Trial"**
   - Tap button → Apple purchase sheet shows **7-day free trial**
   - Complete purchase
3. Device A: Tap "Check Status" → Should say "You're eligible!"
4. Device A: Tap "Start 7-Day Trial" → Both users unlocked

### Expected Behavior:
- **No referral:** Pay $3.99/week immediately
- **With referral:** 7-day trial → Then $3.99/week

---

## 📊 Pricing Breakdown

### Revenue Comparison:

**Old Pricing (Annual):**
- $29.99/year = $2.50/month
- 100 users = $2,999/year

**New Pricing (Weekly @ $3.99):**
- $3.99/week × 52 weeks = $207.48/year per user
- 100 users = $20,748/year
- **~7x more revenue per user**

**With 50% Churn:**
- Still $10,374/year (3.5x better than annual)

### Country-Specific Pricing (PPP-Adjusted):

| Country | Weekly Price | Annual Equivalent | vs US |
|---------|-------------|-------------------|-------|
| 🇺🇸 US | $3.99 | $207/year | Baseline |
| 🇨🇦 Canada | $5.49 CAD | $285 CAD/year | ~$210 USD |
| 🇲🇽 Mexico | $69 MXN | $3,588 MXN/year | ~$200 USD |
| 🇮🇳 India | ₹299 INR | ₹15,548 INR/year | ~$185 USD |

*Prices are PPP-adjusted by Apple to match local purchasing power*

---

## ✅ Final Checklist

Before launching ads:

- [ ] Both products created in App Store Connect
- [ ] Both products added to RevenueCat
- [ ] Offering updated with both packages
- [ ] Firestore rules deployed
- [ ] Tested no-referral flow (immediate payment)
- [ ] Tested referral flow (7-day trial for both users)
- [ ] Verified pricing shows correctly in app
- [ ] Submitted new build to App Store (with updated products)

---

## 🚀 Launch Strategy

1. **Week 1:** Run $100 TikTok ads (US/Canada/Mexico)
   - Track: CPI, trial starts, referral rate
   - Goal: 20-30 users, 1-2 referrals per user

2. **Week 2:** Analyze conversion
   - Trial-to-paid conversion rate
   - Referral coefficient (viral multiplier)
   - Adjust: If <30% trial-to-paid, consider 3-day trial instead of 7

3. **Week 3:** Scale what works
   - If referrals work: Focus on shareability
   - If ads work: Scale ad spend

---

## 💡 Pro Tips

**Pricing Psychology:**
- $3.99 feels significantly cheaper than $4.99 (under $4 threshold)
- Weekly makes users think "$4 to try" vs "$30 upfront"
- 7-day trial gives enough time to form habit

**Expected Metrics:**
- Trial-to-paid: 30-50% (industry standard)
- Viral coefficient: 0.5-1.5 (each user brings 0.5-1.5 friends)
- Effective CPI: $2-3 (with referrals)

**If conversion is low:**
- Shorten trial to 3 days (more urgency)
- Add reminder notification on Day 6
- Show progress/"streak" during trial

---

You're ready! Just need to:
1. Create the products in App Store Connect
2. Add them to RevenueCat
3. Deploy Firestore rules
4. Test both flows
5. Launch ads 🚀
