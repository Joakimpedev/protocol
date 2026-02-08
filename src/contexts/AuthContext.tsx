import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import {
  User,
  UserCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signInWithCredential,
  OAuthProvider,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import Purchases from 'react-native-purchases';
import { auth } from '../config/firebase';
import {
  identifyUser as identifyTikTokUser,
  resetUser as resetTikTokUser,
  trackSignedIn as trackTikTokSignedIn,
  trackCompleteRegistration as trackTikTokCompleteRegistration,
} from '../services/tiktok';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<UserCredential>;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  signInAnonymous: () => Promise<UserCredential>;
  signInWithApple: () => Promise<UserCredential>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Track registration with TikTok
    try {
      await identifyTikTokUser(userCredential.user.uid);
      await trackTikTokCompleteRegistration('email', userCredential.user.uid);
    } catch (error) {
      console.warn('[Auth] Failed to track TikTok sign up:', error);
    }

    return userCredential;
  };

  const signIn = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // Track sign-in with TikTok
    try {
      await identifyTikTokUser(userCredential.user.uid);
      await trackTikTokSignedIn('email');
    } catch (error) {
      console.warn('[Auth] Failed to track TikTok sign in:', error);
    }

    return userCredential;
  };

  const signInAnonymous = async () => {
    return await signInAnonymously(auth);
  };

  const signInWithApple = async (): Promise<UserCredential> => {
    if (Platform.OS !== 'ios') {
      throw new Error('Sign in with Apple is only available on iOS');
    }

    try {
      // Request Apple authentication
      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Create Firebase credential from Apple credential
      const { identityToken, nonce } = appleCredential;
      if (!identityToken) {
        throw new Error('Apple Sign In failed - no identity token');
      }

      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({
        idToken: identityToken,
        rawNonce: nonce || undefined,
      });

      // Sign in to Firebase with Apple credential
      const userCredential = await signInWithCredential(auth, credential);

      // Track with TikTok
      try {
        await identifyTikTokUser(userCredential.user.uid);
        // Check if this is a new user (sign up) or existing user (sign in)
        const isNewUser = userCredential.user.metadata.creationTime === userCredential.user.metadata.lastSignInTime;
        if (isNewUser) {
          await trackTikTokCompleteRegistration('apple', userCredential.user.uid);
        } else {
          await trackTikTokSignedIn('apple');
        }
      } catch (error) {
        console.warn('[Auth] Failed to track TikTok Apple sign in:', error);
      }

      return userCredential;
    } catch (error: any) {
      // User cancelled - don't treat as error
      if (error.code === 'ERR_REQUEST_CANCELED') {
        throw new Error('Sign in cancelled');
      }
      
      // Provide helpful error message for audience mismatch
      if (error?.code === 'auth/invalid-credential' && error?.message?.includes('audience')) {
        const helpfulError = new Error(
          'Apple Sign-In configuration error: The app bundle identifier doesn\'t match Firebase settings. ' +
          'If you\'re using an Expo development build, you need to configure Firebase to accept "host.exp.Exponent" as a valid client ID. ' +
          'See APPLE_SIGN_IN_SETUP.md for detailed instructions.'
        );
        helpfulError.name = error.name;
        throw helpfulError;
      }
      
      throw error;
    }
  };

  const logout = async () => {
    // Log out of RevenueCat first to clear subscription state
    try {
      await Purchases.logOut();
      console.log('[Auth] RevenueCat logout successful');
    } catch (error) {
      // RevenueCat might not be initialized, that's okay
      console.log('[Auth] RevenueCat logout skipped (not initialized)');
    }

    // Reset TikTok user identity
    try {
      await resetTikTokUser();
      console.log('[Auth] TikTok user reset successful');
    } catch (error) {
      console.warn('[Auth] Failed to reset TikTok user:', error);
    }

    // Then sign out of Firebase
    await signOut(auth);
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signInAnonymous,
    signInWithApple,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

