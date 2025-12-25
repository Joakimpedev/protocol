# Firebase Setup Notes

## Enable Anonymous Authentication

**IMPORTANT:** The anonymous login feature requires enabling it in Firebase Console. If you see the error `auth/admin-restricted-operation`, follow these steps:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `protocol-184a3`
3. Navigate to **Authentication** in the left sidebar
4. Click on the **Sign-in method** tab
5. Find **Anonymous** in the list of providers
6. Click on **Anonymous** to open its settings
7. Toggle **Enable** to ON
8. Click **Save**

**Note:** This is required for testing the app without creating an account. The app will show a helpful error message if anonymous auth is not enabled.

## Current Flow

1. **Welcome Screen** - User enters free text about concerns
2. **Category Screen** - User selects/confirms categories
3. **Questions Screen** - User answers follow-up questions
4. **Sign Up/Sign In Screen** - User creates account or signs in (or uses anonymous)
5. **Plan Screen** - User selects products and starts routine
6. **Main App** - Daily routine begins

## Anonymous Users

Anonymous users are marked with `isAnonymous: true` in Firestore. They can:
- Complete onboarding
- Set up their routine
- Use the app normally

To convert an anonymous account to a permanent account later, you can link it with email/password using Firebase's `linkWithCredential` method.

