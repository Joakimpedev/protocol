/**
 * Firebase Configuration
 */

import { initializeApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyAScJhi3t_1bOdE_9dw5DFFfp4GeizzH1M",
  authDomain: "protocol-184a3.firebaseapp.com",
  projectId: "protocol-184a3",
  storageBucket: "protocol-184a3.firebasestorage.app",
  messagingSenderId: "148119611878",
  appId: "1:148119611878:web:eed55b3f5a406c11080e27",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with AsyncStorage persistence
// Use getAuth as fallback if auth is already initialized (hot reload scenarios)
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error: any) {
  // Auth already initialized, use getAuth instead
  if (error.code === 'auth/already-initialized') {
    auth = getAuth(app);
  } else {
    throw error;
  }
}

export { auth };

// Initialize Firestore
export const db = getFirestore(app);

export default app;

