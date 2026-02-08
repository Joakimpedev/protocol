import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import { posthogConfig } from './src/config/posthog';
import { initializeRevenueCat } from './src/services/subscriptionService';
import { AuthProvider } from './src/contexts/AuthContext';
import { OnboardingProvider } from './src/contexts/OnboardingContext';
import { PremiumProvider } from './src/contexts/PremiumContext';
import { DevModeProvider } from './src/contexts/DevModeContext';
import RootNavigator from './src/navigation/RootNavigator';

const FIRST_TIME_OPEN_KEY = '@protocol_first_time_open';

// Wrapper component to track app opened event
function AppContent() {
  const posthog = usePostHog();

  useEffect(() => {
    const trackAppOpen = async () => {
      if (!posthog) return;

      // Track regular app opened event
      posthog.capture('app_opened');

      // Check if this is the first time opening the app
      try {
        const hasOpenedBefore = await AsyncStorage.getItem(FIRST_TIME_OPEN_KEY);
        if (!hasOpenedBefore) {
          // First time opening the app
          posthog.capture('app_opened_first_time');
          // Set flag so it doesn't fire again
          await AsyncStorage.setItem(FIRST_TIME_OPEN_KEY, 'true');
        }
      } catch (error) {
        console.error('Error checking first time open:', error);
      }
    };

    trackAppOpen();
  }, [posthog]);

  // Initialize RevenueCat early with anonymous ID so offerings are available during onboarding
  useEffect(() => {
    initializeRevenueCat('anonymous').catch(() => {});
  }, []);

  return (
    <>
      <RootNavigator />
      <StatusBar style="light" />
    </>
  );
}

export default function App() {
  return (
    <PostHogProvider apiKey={posthogConfig.apiKey} options={posthogConfig.options}>
      <AuthProvider>
        <PremiumProvider>
          <DevModeProvider>
            <OnboardingProvider>
              <AppContent />
            </OnboardingProvider>
          </DevModeProvider>
        </PremiumProvider>
      </AuthProvider>
    </PostHogProvider>
  );
}

