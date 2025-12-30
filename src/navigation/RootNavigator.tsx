import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import { colors } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { listenForFriendCompletions } from '../services/notificationService';
import AppNavigator from './AppNavigator';
import OnboardingNavigator from './OnboardingNavigator';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, loading } = useAuth();
  const [hasRoutine, setHasRoutine] = useState<boolean | null>(null);
  const [checkingRoutine, setCheckingRoutine] = useState(true);
  const navigationRef = useRef<any>(null);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (!user) {
      setHasRoutine(null);
      setCheckingRoutine(false);
      return;
    }

    // Reset checking state when user changes
    setCheckingRoutine(true);
    setHasRoutine(null);

    // Listen to real-time updates for user document
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (userDoc) => {
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // User has routine if they have routineStarted set to true
          setHasRoutine(userData.routineStarted === true);
        } else {
          setHasRoutine(false);
        }
        setCheckingRoutine(false);
      },
      (error) => {
        console.error('Error listening to routine status:', error);
        setHasRoutine(false);
        setCheckingRoutine(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Handle notification navigation
  useEffect(() => {
    // Set up notification listeners
    let notificationSub: any = null;
    let responseSub: any = null;

    try {
      notificationSub = Notifications.addNotificationReceivedListener((notification) => {
        // Handle foreground notifications if needed
      });
      notificationListener.current = notificationSub;

      responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        
        if (data?.type === 'weekly-summary' && navigationRef.current) {
          // Navigate to weekly summary screen
          if (data?.summaryScreen) {
            navigationRef.current.navigate('App', {
              screen: 'Progress',
              params: {
                screen: data.summaryScreen,
              },
            });
          } else {
            // Fallback to Progress tab
            navigationRef.current.navigate('App', {
              screen: data?.screen || 'Progress',
            });
          }
        } else if (data?.screen && navigationRef.current) {
          // Navigate to the screen specified in notification data
          navigationRef.current.navigate('App', {
            screen: data.screen,
          });
        }
      });
      responseListener.current = responseSub;
    } catch (error) {
      console.warn('Error setting up notification listeners:', error);
    }

    return () => {
      // Clean up listeners safely
      try {
        if (notificationSub && typeof notificationSub.remove === 'function') {
          notificationSub.remove();
        }
      } catch (error) {
        // Silently ignore cleanup errors during hot reload
      }
      try {
        if (responseSub && typeof responseSub.remove === 'function') {
          responseSub.remove();
        }
      } catch (error) {
        // Silently ignore cleanup errors during hot reload
      }
      // Clear refs
      notificationListener.current = null;
      responseListener.current = null;
    };
  }, []);

  // Listen for friend completion notifications
  useEffect(() => {
    if (!user) {
      return;
    }

    console.log('Setting up friend completion listener for user:', user.uid);
    const unsubscribe = listenForFriendCompletions(user.uid, (userName, friendId) => {
      console.log(`Friend ${userName} (${friendId}) completed their routine`);
    });

    return () => {
      console.log('Cleaning up friend completion listener');
      unsubscribe();
    };
  }, [user]);

  // Show loading while checking auth OR checking routine status
  // Don't render navigator until we know definitively what to show
  if (loading || (user && checkingRoutine)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {user ? (
          // User is signed in - we know hasRoutine is not null here because checkingRoutine is false
          hasRoutine ? (
            // User has routine set up - show main app (Today/Protocol/Progress tabs)
            <Stack.Screen name="App" component={AppNavigator} />
          ) : (
            // User signed in but no routine yet - show onboarding to complete setup (Plan screen)
            <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
          )
        ) : (
          // User is not signed in - show onboarding (Welcome screen first)
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

