import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { clearOnboardingProgress } from '../utils/onboardingStorage';
import { clearV2Progress } from './OnboardingV2Navigator';
import * as Notifications from 'expo-notifications';
import { useQuickActionCallback } from 'expo-quick-actions/hooks';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import { useDevMode } from '../contexts/DevModeContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { listenForFriendCompletions } from '../services/notificationService';
import AppNavigator from './AppNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import OnboardingV2Navigator from './OnboardingV2Navigator';

const USE_ONBOARDING_V2 = true;

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const theme = useTheme();
  const { user, loading } = useAuth();
  const { isDevModeEnabled, forceShowOnboarding, forceShowApp } = useDevMode();
  const { onboardingComplete, setOnboardingComplete } = useOnboarding();
  const [hasRoutine, setHasRoutine] = useState<boolean | null>(null);
  const [checkingRoutine, setCheckingRoutine] = useState(true);
  const navigationRef = useRef<any>(null);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);
  const prevShowOnboardingRef = useRef<boolean | null>(null);

  // Handle quick action tap (long-press app icon → "40% Off Lifetime")
  useQuickActionCallback((action) => {
    if (action?.params?.type === 'abandoned-cart' && navigationRef.current) {
      navigationRef.current.navigate('OnboardingV2', { screen: 'OnboardingV2Flow', params: { screen: 'V2AbandonedCartOffer' } });
    }
  });

  // When we were already showing onboarding and user changes (e.g. anonymous sign-in),
  // keep isReady=true to avoid unmounting OnboardingNavigator (prevents kickback to Welcome)
  const isReady = !loading && (!(user && checkingRoutine) || prevShowOnboardingRef.current === true);
  const showOnboarding = isReady
    ? (forceShowOnboarding ? true : forceShowApp ? false : onboardingComplete ? false : !user || (user && !hasRoutine))
    : null;
  const showApp = !showOnboarding!;

  // Clear onboarding-complete flag once Firestore has routine (so next app open uses normal flow)
  useEffect(() => {
    if (user && hasRoutine === true && onboardingComplete) {
      setOnboardingComplete(false);
    }
  }, [user, hasRoutine, onboardingComplete]);

  useEffect(() => {
    if (!isReady || showOnboarding === null) return;
    if (prevShowOnboardingRef.current === true && showOnboarding === false) {
      clearOnboardingProgress();
      clearV2Progress();
    }
    prevShowOnboardingRef.current = showOnboarding;
  }, [isReady, showOnboarding]);

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
          const routineStarted = userData.routineStarted === true;
          console.log('[RootNavigator] 🔥 FIRESTORE UPDATE 🔥 - routineStarted:', routineStarted, 'current hasRoutine:', hasRoutine);

          // If this changes from false to true, it will kick user out of onboarding!
          if (hasRoutine === false && routineStarted === true) {
            console.log('[RootNavigator] ⚠️ WARNING: routineStarted changed from FALSE to TRUE! This will kick user out!');
          }

          setHasRoutine(routineStarted);
        } else {
          console.log('[RootNavigator] User document does not exist');
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

  // Shared handler for notification tap navigation
  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;

    if (data?.type === 'abandoned-cart' && navigationRef.current) {
      navigationRef.current.navigate('OnboardingV2', { screen: 'OnboardingV2Flow', params: { screen: 'V2AbandonedCartOffer' } });
      return;
    }

    if (data?.type === 'weekly-summary' && navigationRef.current) {
      if (data?.summaryScreen) {
        navigationRef.current.navigate('App', {
          screen: 'Progress',
          params: {
            screen: data.summaryScreen,
          },
        });
      } else {
        navigationRef.current.navigate('App', {
          screen: data?.screen || 'Progress',
        });
      }
    } else if (data?.screen && navigationRef.current) {
      navigationRef.current.navigate('App', {
        screen: data.screen,
      });
    }
  };

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

      responseSub = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
      responseListener.current = responseSub;

      // Handle cold-start: check if app was launched by tapping a notification.
      // navigationRef may not be ready yet, so retry briefly.
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (!response) return;
        const tryNavigate = (attemptsLeft: number) => {
          if (navigationRef.current) {
            handleNotificationResponse(response);
          } else if (attemptsLeft > 0) {
            setTimeout(() => tryNavigate(attemptsLeft - 1), 200);
          }
        };
        tryNavigate(15); // retry up to 3 seconds
      });
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
  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.text} />
      </View>
    );
  }

  console.log('[RootNavigator] Render - showOnboarding:', showOnboarding, 'showApp:', showApp, 'hasRoutine:', hasRoutine);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        {showApp ? (
          <Stack.Screen name="App" component={AppNavigator} />
        ) : USE_ONBOARDING_V2 ? (
          <Stack.Screen name="OnboardingV2" component={OnboardingV2Navigator} />
        ) : (
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}


