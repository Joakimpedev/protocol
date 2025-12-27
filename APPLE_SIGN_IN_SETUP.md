# Sign in with Apple Setup Guide

## ✅ Implementation Complete

Sign in with Apple has been added to all authentication screens:
- ✅ `SignInScreen.tsx`
- ✅ `SignUpScreen.tsx`
- ✅ `OnboardingSignInScreen.tsx`
- ✅ `OnboardingSignUpScreen.tsx`

## What Was Added

1. **app.json** - Enabled Sign in with Apple capability:
   ```json
   "ios": {
     "usesAppleSignIn": true
   }
   ```

2. **AuthContext** - Added `signInWithApple()` function that:
   - Uses `expo-apple-authentication` to get Apple credentials
   - Creates Firebase OAuth credential
   - Signs in to Firebase Auth
   - Handles errors gracefully

3. **All Sign-In/Sign-Up Screens** - Added Apple Sign-In button:
   - Uses native `AppleAuthenticationButton` component
   - Only shows on iOS (platform check)
   - Handles loading states
   - Integrates with existing authentication flow

## Installation Required

You need to install the `expo-apple-authentication` package:

```bash
npx expo install expo-apple-authentication
```

## Configuration Needed

### 1. Enable in Apple Developer Account

1. Go to [Apple Developer](https://developer.apple.com)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Go to **Identifiers**
4. Select your App ID: `com.protocol.galdr`
5. Enable **"Sign In with Apple"** capability
6. Click **Save**

### 2. Configure in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `protocol-184a3`
3. Navigate to **Authentication** → **Sign-in method**
4. Enable **Apple** provider
5. Follow the setup instructions:
   - You'll need to add your App ID
   - Download the OAuth client secret (if required)
   - Configure the service ID

### 3. Build with EAS

When you build your app with EAS Build, make sure:
- You have an Apple Developer account
- Your App ID has Sign in with Apple enabled
- Build for iOS (Sign in with Apple only works on iOS)

```bash
eas build --platform ios
```

## How It Works

1. **User taps "Sign in with Apple" button**
2. **Apple's native authentication flow appears**
3. **User authenticates with Face ID/Touch ID**
4. **App receives Apple credential**
5. **Firebase Auth signs in user with Apple credential**
6. **User is authenticated and logged in**

## Testing

- ⚠️ **Sign in with Apple only works on:**
  - Real iOS devices (not simulator)
  - Production/development builds (not Expo Go)
  
- ✅ **To test:**
  1. Build app with EAS
  2. Install on real iPhone
  3. Tap "Sign in with Apple" button
  4. Authenticate with Face ID/Touch ID
  5. User should be signed in

## User Experience

- **Sign Up Screen**: Shows "Sign Up" button (SIGN_UP button type)
- **Sign In Screen**: Shows "Sign In" button (SIGN_IN button type)
- **Button Style**: Black (matches your dark theme)
- **Placement**: Between email/password form and other options
- **Only on iOS**: Button only appears on iOS devices

## Notes

- If user cancels Apple sign-in, no error is shown (normal behavior)
- Apple sign-in works for both new users (sign up) and existing users (sign in)
- Users who sign in with Apple can still purchase subscriptions normally
- Apple sign-in is optional - email/password still works

## Troubleshooting

**Error: "Sign in with Apple is not available"**
- Make sure you enabled it in Apple Developer account
- Make sure you're testing on a real iOS device
- Make sure you built with EAS (not Expo Go)

**Error: "Firebase Auth error"**
- Make sure Apple provider is enabled in Firebase Console
- Make sure your App ID matches in Firebase and Apple Developer

**Button doesn't appear:**
- Make sure you're testing on iOS (button only shows on iOS)
- Make sure `expo-apple-authentication` is installed
- Make sure `usesAppleSignIn: true` is in app.json

