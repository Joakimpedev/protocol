# Production Build Setup Guide

This guide covers what you need to configure for production builds (iOS/Android).

---

## 1. NOTIFICATIONS IN PRODUCTION BUILD ✅

### Good News:
Your notifications are already properly configured! `expo-notifications` works in production builds. The code you have will work as native iOS/Android notifications.

### What You Need to Do:

#### For iOS:
1. **EAS Build will handle it automatically:**
   - When you build with EAS Build (`eas build --platform ios`), it will:
     - Generate push notification certificates
     - Configure your app for push notifications
     - Set up everything needed

2. **You'll need to:**
   - Have an Apple Developer account ($99/year)
   - Build using EAS Build (not Expo Go)
   - Test on a real device (push notifications don't work in simulator)

#### For Android:
- Push notifications work automatically with `expo-notifications`
- No additional setup needed (FCM is handled by Expo)

### Testing:
- ✅ Your notification code is correct
- ✅ `app.json` has `expo-notifications` plugin configured
- ✅ Notification permissions are requested properly
- ⚠️ Just build with EAS and test on real device

### Steps to Build:
```bash
# Install EAS CLI if you haven't
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Or build for Android
eas build --platform android
```

During the build, EAS will ask you about push notifications - just accept and it will set everything up automatically.

---

## 2. SIGN IN WITH APPLE ⚠️

### Important Clarification:

**You DO NOT need Sign in with Apple if you're only using email/password authentication.**

Apple only requires Sign in with Apple if:
- Your app uses **third-party social sign-in** (Google, Facebook, etc.)
- You're NOT: If you only use email/password + your own accounts, you don't need it

### However, if you WANT to add Sign in with Apple (optional):

It's a nice-to-have feature that some users prefer. Here's how to add it:

#### Step 1: Enable in Apple Developer Account
1. Go to [Apple Developer](https://developer.apple.com)
2. Certificates, Identifiers & Profiles → Identifiers
3. Select your App ID: `com.protocol.galdr`
4. Enable "Sign In with Apple" capability
5. Save

#### Step 2: Update Expo Configuration
Update `app.json` to enable Sign in with Apple:

```json
{
  "expo": {
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.protocol.galdr",
      "usesAppleSignIn": true  // Add this
    }
  }
}
```

#### Step 3: Install Library
```bash
npx expo install expo-apple-authentication
```

#### Step 4: Add Code (if you want it)
I can help you add the Sign in with Apple button to your sign-in screens, but since your MVP requirement was "no social sign-in", you probably don't need this.

---

## RECOMMENDATION

**For MVP:**
- ✅ **Keep email/password only** (no Sign in with Apple needed)
- ✅ **Notifications are ready** - just build with EAS

**If you want Sign in with Apple later:**
- You can add it after MVP
- It's a nice feature but not required for launch

---

## WHAT TO DO NOW

1. **For Notifications:**
   - Your code is ready ✅
   - Build with EAS when ready
   - Test on real device

2. **For Sign in with Apple:**
   - **Skip it for MVP** (you don't need it)
   - Focus on getting the build working first
   - Add it later if you want

---

## BUILD CHECKLIST

Before building for production:

- [ ] Apple Developer account active ($99/year)
- [ ] EAS CLI installed (`npm install -g eas-cli`)
- [ ] EAS account connected (`eas login`)
- [ ] `app.json` configured correctly (✅ already done)
- [ ] Test build locally first (`eas build --platform ios --profile preview`)
- [ ] Test on real device (not simulator)
- [ ] Verify notifications work
- [ ] Submit to App Store when ready

---

## QUESTIONS?

- **Do I need Sign in with Apple?** → No, only if you add Google/Facebook login
- **Will notifications work?** → Yes, with EAS build on real device
- **What about Android?** → Same, works automatically with EAS build

