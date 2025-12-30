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
import { auth } from '../config/firebase';

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
    return await createUserWithEmailAndPassword(auth, email, password);
  };

  const signIn = async (email: string, password: string) => {
    return await signInWithEmailAndPassword(auth, email, password);
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
      return await signInWithCredential(auth, credential);
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

