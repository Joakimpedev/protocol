import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colorsV2 } from '../constants/themeV2';
import { useAuth } from '../contexts/AuthContext';
import { useDevMode } from '../contexts/DevModeContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import V2ProgressBar from '../components/v2/V2ProgressBar';
import DevNavTools from '../components/v2/DevNavTools';
import { preloadOnboardingAssets } from '../utils/onboardingAssetPreloader';

// Screen imports
import HeroScreen from '../screens/onboarding-v2/HeroScreen';
import FaceScanScreen from '../screens/onboarding-v2/FaceScanScreen';
import GetRatingScreen from '../screens/onboarding-v2/GetRatingScreen';
import PersonalizedRoutineScreen from '../screens/onboarding-v2/PersonalizedRoutineScreen';
import GenderScreen from '../screens/onboarding-v2/GenderScreen';
import SelfieScreen from '../screens/onboarding-v2/SelfieScreen';
import ConcernsScreen from '../screens/onboarding-v2/ConcernsScreen';
import SkinConcernsScreen from '../screens/onboarding-v2/SkinConcernsScreen';
import SelfRatingScreen from '../screens/onboarding-v2/SelfRatingScreen';
import SocialProofScreen from '../screens/onboarding-v2/SocialProofScreen';
import BeforeAfterScreen from '../screens/onboarding-v2/BeforeAfterScreen';
import TransformationStoryScreen from '../screens/onboarding-v2/TransformationStoryScreen';
import LifeImpactScreen from '../screens/onboarding-v2/LifeImpactScreen';
import JourneyScreen from '../screens/onboarding-v2/JourneyScreen';
import GrowthChartScreen from '../screens/onboarding-v2/GrowthChartScreen';
import ReviewAskScreen from '../screens/onboarding-v2/ReviewAskScreen';
import NotificationsAskScreen from '../screens/onboarding-v2/NotificationsAskScreen';
import FriendCodeScreen from '../screens/onboarding-v2/FriendCodeScreen';
import FakeAnalysisScreen from '../screens/onboarding-v2/FakeAnalysisScreen';
import ResultsPaywallScreen from '../screens/onboarding-v2/ResultsPaywallScreen';
import ProPaywallScreen from '../screens/onboarding-v2/ProPaywallScreen';
import FaceRatingScreen from '../screens/FaceRatingScreen';
import V2ProtocolOverviewScreen from '../screens/onboarding-v2/V2ProtocolOverviewScreen';
import V2ShoppingScreen from '../screens/onboarding-v2/V2ShoppingScreen';

const Stack = createNativeStackNavigator();

const SCREEN_ORDER_V2 = [
  'V2Hero',
  'V2FaceScan',
  'V2GetRating',
  'V2PersonalizedRoutine',
  'V2Gender',
  'V2Concerns',
  'V2SkinConcerns',
  'V2SelfRating',
  'V2SocialProof',
  'V2LifeImpact',
  'V2BeforeAfter',
  'V2TransformationStory',
  'V2Journey',
  'V2GrowthChart',
  'V2Selfie',
  'V2ReviewAsk',
  'V2NotificationsAsk',
  'V2FriendCode',
  'V2FakeAnalysis',
  'V2ResultsPaywall',
];

// Progress bar shown for screens index 1-14, not hero/selfie/review/notifications/paywall
const PROGRESS_BAR_START = 1;
const PROGRESS_BAR_END = 13;
const PROGRESS_BAR_TOTAL = PROGRESS_BAR_END - PROGRESS_BAR_START + 1;

const ONBOARDING_V2_PROGRESS_KEY = '@onboarding_v2_progress';

/** Get focused route name from nested navigator state */
function getFocusedRouteName(state: { routes: any[]; index: number } | undefined): string {
  if (!state?.routes?.length) return 'V2Hero';
  const route = state.routes[state.index];
  if (!route) return 'V2Hero';
  if (route.state) return getFocusedRouteName(route.state);
  return route.name;
}

async function saveV2Progress(currentScreen: string, screenIndex: number, data: any) {
  try {
    await AsyncStorage.setItem(
      ONBOARDING_V2_PROGRESS_KEY,
      JSON.stringify({ currentScreen, screenIndex, data, timestamp: Date.now() })
    );
    console.log('[OnboardingV2] Saved progress:', currentScreen, `(${screenIndex})`);
  } catch (error) {
    console.error('[OnboardingV2] Failed to save progress:', error);
  }
}

async function loadV2Progress(): Promise<{ currentScreen: string; screenIndex: number; data: any } | null> {
  try {
    const stored = await AsyncStorage.getItem(ONBOARDING_V2_PROGRESS_KEY);
    if (!stored) return null;
    const progress = JSON.parse(stored);
    console.log('[OnboardingV2] Loaded progress:', progress.currentScreen);
    // Map old screen names to new if resuming from old flow
    if (progress.currentScreen === 'V2ReviewPermissions') {
      progress.currentScreen = 'V2ReviewAsk';
    }
    if (progress.currentScreen === 'V2ValueProp' || progress.currentScreen === 'V2AnalyzeFace') {
      progress.currentScreen = 'V2FaceScan';
    }
    if (progress.currentScreen === 'V2DatingGoals') {
      progress.currentScreen = 'V2LifeImpact';
    }
    return progress;
  } catch (error) {
    console.error('[OnboardingV2] Failed to load progress:', error);
    return null;
  }
}

export async function clearV2Progress() {
  try {
    await AsyncStorage.removeItem(ONBOARDING_V2_PROGRESS_KEY);
    console.log('[OnboardingV2] Cleared progress');
  } catch (error) {
    console.error('[OnboardingV2] Failed to clear progress:', error);
  }
}

function OnboardingV2Content({ route }: { route: any }) {
  const navigation = useNavigation();
  const { data } = useOnboarding();
  const initialRoute = (route?.params?.initialRoute as string) || 'V2Hero';
  const [currentScreenIndex, setCurrentScreenIndex] = useState(
    () => Math.max(0, SCREEN_ORDER_V2.indexOf(initialRoute))
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('state', (e: any) => {
      const state = e.data?.state;
      const focusedName = getFocusedRouteName(state);
      const screenIndex = SCREEN_ORDER_V2.indexOf(focusedName);

      if (screenIndex >= 0) {
        setCurrentScreenIndex(screenIndex);
        saveV2Progress(focusedName, screenIndex, data);
      }
    });
    return unsubscribe;
  }, [navigation, data]);

  const showProgress = currentScreenIndex >= PROGRESS_BAR_START && currentScreenIndex <= PROGRESS_BAR_END;
  const progressStep = currentScreenIndex - PROGRESS_BAR_START;
  const currentScreenName = SCREEN_ORDER_V2[currentScreenIndex] ?? '';
  const lightThemeScreens = ['V2TransformationStory', 'V2SocialProof'];
  const progressTheme = lightThemeScreens.includes(currentScreenName) ? 'light' : 'dark';

  return (
    <>
      {showProgress && (
        <V2ProgressBar currentStep={progressStep} totalSteps={PROGRESS_BAR_TOTAL} theme={progressTheme as any} />
      )}
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colorsV2.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="V2Hero" component={HeroScreen} />
        <Stack.Screen name="V2FaceScan" component={FaceScanScreen} />
        <Stack.Screen name="V2GetRating" component={GetRatingScreen} />
        <Stack.Screen name="V2PersonalizedRoutine" component={PersonalizedRoutineScreen} />
        <Stack.Screen name="V2Gender" component={GenderScreen} />
        <Stack.Screen name="V2Concerns" component={ConcernsScreen} />
        <Stack.Screen name="V2SkinConcerns" component={SkinConcernsScreen} />
        <Stack.Screen name="V2SelfRating" component={SelfRatingScreen} />
        <Stack.Screen name="V2SocialProof" component={SocialProofScreen} />
        <Stack.Screen name="V2BeforeAfter" component={BeforeAfterScreen} />
        <Stack.Screen name="V2TransformationStory" component={TransformationStoryScreen} />
        <Stack.Screen name="V2LifeImpact" component={LifeImpactScreen} />
        <Stack.Screen name="V2Journey" component={JourneyScreen} />
        <Stack.Screen name="V2GrowthChart" component={GrowthChartScreen} />
        <Stack.Screen name="V2Selfie" component={SelfieScreen} />
        <Stack.Screen name="V2ReviewAsk" component={ReviewAskScreen} />
        <Stack.Screen name="V2NotificationsAsk" component={NotificationsAskScreen} />
        <Stack.Screen name="V2FriendCode" component={FriendCodeScreen} />
        <Stack.Screen name="V2FakeAnalysis" component={FakeAnalysisScreen} />
        <Stack.Screen name="V2ResultsPaywall" component={ResultsPaywallScreen} />
        <Stack.Screen name="V2ProPaywall" component={ProPaywallScreen} />
        <Stack.Screen name="V2FaceRating" component={FaceRatingScreen} />
        <Stack.Screen name="V2ProtocolOverview" component={V2ProtocolOverviewScreen} />
        <Stack.Screen name="V2Shopping" component={V2ShoppingScreen} />
      </Stack.Navigator>
      <View style={styles.devToolsOverlay} pointerEvents="box-none">
        <DevNavTools screenOrder={SCREEN_ORDER_V2} currentScreenIndex={currentScreenIndex} />
      </View>
    </>
  );
}

export default function OnboardingV2Navigator() {
  const { user } = useAuth();
  const { forceShowOnboarding } = useDevMode();
  const { updateData } = useOnboarding();
  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Start preloading all onboarding images/video in parallel with route determination
    preloadOnboardingAssets();

    const determineInitialRoute = async () => {
      const savedProgress = await loadV2Progress();

      if (forceShowOnboarding || !user) {
        if (savedProgress) {
          console.log('[OnboardingV2Navigator] Resuming from saved progress:', savedProgress.currentScreen);
          updateData(savedProgress.data);
          setInitialRoute(savedProgress.currentScreen);
        } else {
          setInitialRoute('V2Hero');
        }
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.concerns && userData.concerns.length > 0 && !userData.routineStarted) {
            setInitialRoute('V2ResultsPaywall');
          } else {
            setInitialRoute('V2Hero');
          }
        } else {
          setInitialRoute('V2Hero');
        }
      } catch (error) {
        console.error('[OnboardingV2Navigator] Error checking user state:', error);
        setInitialRoute('V2Hero');
      } finally {
        setLoading(false);
      }
    };

    determineInitialRoute();
  }, [user, forceShowOnboarding]);

  if (loading || !initialRoute) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colorsV2.textPrimary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="OnboardingV2Flow"
        component={OnboardingV2Content}
        initialParams={{ initialRoute }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colorsV2.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  devToolsOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 8,
  },
});
