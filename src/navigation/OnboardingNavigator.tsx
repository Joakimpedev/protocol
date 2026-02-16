import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';

/** Get focused route name from nested navigator state */
function getFocusedRouteName(state: { routes: any[]; index: number } | undefined): string {
  if (!state?.routes?.length) return 'Welcome';
  const route = state.routes[state.index];
  if (!route) return 'Welcome';
  if (route.state) return getFocusedRouteName(route.state);
  return route.name;
}
import { useAuth } from '../contexts/AuthContext';
import { useDevMode } from '../contexts/DevModeContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import CategoryScreen from '../screens/onboarding/CategoryScreen';
import SeverityScreen from '../screens/onboarding/SeverityScreen';
import EducationRealCauseScreen from '../screens/onboarding/EducationRealCauseScreen';
import ImpactScreen from '../screens/onboarding/ImpactScreen';
import GoalSettingScreen from '../screens/onboarding/GoalSettingScreen';
import TimelineStatsScreen from '../screens/onboarding/TimelineStatsScreen';
import WhyOthersFailedScreen from '../screens/onboarding/WhyOthersFailedScreen';
import ConditionalFollowUpScreen from '../screens/onboarding/ConditionalFollowUpScreen';
import TimeCommitmentScreen from '../screens/onboarding/TimeCommitmentScreen';
import SocialProofScreen from '../screens/onboarding/SocialProofScreen';
import MiniTimelinePreviewScreen from '../screens/onboarding/MiniTimelinePreviewScreen';
import ProtocolLoadingScreen from '../screens/onboarding/ProtocolLoadingScreen';
import ProtocolOverviewScreen from '../screens/onboarding/ProtocolOverviewScreen';
import ReassuranceBeforeShoppingScreen from '../screens/onboarding/ReassuranceBeforeShoppingScreen';
import ProductsPrimerScreen from '../screens/onboarding/ProductsPrimerScreen';
import CommitmentScreen from '../screens/onboarding/CommitmentScreen';
import TrialOfferScreen from '../screens/onboarding/TrialOfferScreen';
import TrialReminderScreen from '../screens/onboarding/TrialReminderScreen';
import TrialPaywallScreen from '../screens/onboarding/TrialPaywallScreen';
import ShoppingScreen from '../screens/onboarding/ShoppingScreen';
import WhyThisWorksScreen from '../screens/onboarding/WhyThisWorksScreen';
import WOWMomentScreen from '../screens/onboarding/WOWMomentScreen';
import { View, ActivityIndicator } from 'react-native';
import { ProgressHeader } from '../components/ProgressHeader';
import { saveOnboardingProgress, loadOnboardingProgress } from '../utils/onboardingStorage';

const Stack = createNativeStackNavigator();

const SCREEN_ORDER = [
  'Welcome',
  'Category',
  'Severity',
  'EducationRealCause',
  'Impact',
  'GoalSetting',
  'TimelineStats',
  'SocialProof',
  'WhyOthersFailed',
  'ConditionalFollowUp',
  'TimeCommitment',
  'MiniTimelinePreview',
  'ProtocolLoading',
  'ProtocolOverview',
  'ReassuranceBeforeShopping',
  'ProductsPrimer',
  'Shopping',
  'WhyThisWorks',
  'WOWMoment',
  'Commitment',
  'TrialOffer',
  'TrialReminder',
  'TrialPaywall',
];

// Only first 20 screens show progress bar (0-19)
const PROGRESS_BAR_SCREEN_COUNT = 20;

function OnboardingNavigatorContent({ route }: { route: any }) {
  const navigation = useNavigation();
  const theme = useTheme();
  const { data } = useOnboarding();
  const initialRoute = (route?.params?.initialRoute as string) || 'Welcome';
  const [currentScreenIndex, setCurrentScreenIndex] = useState(
    () => Math.max(0, SCREEN_ORDER.indexOf(initialRoute))
  );

  // Listen to navigation state changes (traverse nested state) and save progress
  useEffect(() => {
    const unsubscribe = navigation.addListener('state', (e: any) => {
      const state = e.data?.state;
      const focusedName = getFocusedRouteName(state);
      const screenIndex = SCREEN_ORDER.indexOf(focusedName);

      if (screenIndex >= 0) {
        setCurrentScreenIndex(screenIndex);
        saveOnboardingProgress(focusedName, screenIndex, data);
      }
    });

    return unsubscribe;
  }, [navigation, data]);

  const shouldShowProgress = currentScreenIndex < PROGRESS_BAR_SCREEN_COUNT;

  return (
    <>
      {shouldShowProgress && (
        <ProgressHeader
          currentScreenIndex={currentScreenIndex}
          totalScreens={PROGRESS_BAR_SCREEN_COUNT}
        />
      )}
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Category" component={CategoryScreen} />
        <Stack.Screen name="Severity" component={SeverityScreen} />
        <Stack.Screen name="EducationRealCause" component={EducationRealCauseScreen} />
        <Stack.Screen name="Impact" component={ImpactScreen} />
        <Stack.Screen name="GoalSetting" component={GoalSettingScreen} />
        <Stack.Screen name="TimelineStats" component={TimelineStatsScreen} />
        <Stack.Screen name="SocialProof" component={SocialProofScreen} />
        <Stack.Screen name="WhyOthersFailed" component={WhyOthersFailedScreen} />
        <Stack.Screen name="ConditionalFollowUp" component={ConditionalFollowUpScreen} />
        <Stack.Screen name="TimeCommitment" component={TimeCommitmentScreen} />
        <Stack.Screen name="MiniTimelinePreview" component={MiniTimelinePreviewScreen} />
        <Stack.Screen name="ProtocolLoading" component={ProtocolLoadingScreen} />
        <Stack.Screen name="ProtocolOverview" component={ProtocolOverviewScreen} />
        <Stack.Screen name="ReassuranceBeforeShopping" component={ReassuranceBeforeShoppingScreen} />
        <Stack.Screen name="ProductsPrimer" component={ProductsPrimerScreen} />
        <Stack.Screen name="Shopping" component={ShoppingScreen} />
        <Stack.Screen name="WhyThisWorks" component={WhyThisWorksScreen} />
        <Stack.Screen name="WOWMoment" component={WOWMomentScreen} />
        <Stack.Screen name="Commitment" component={CommitmentScreen} />
        <Stack.Screen name="TrialOffer" component={TrialOfferScreen} />
        <Stack.Screen name="TrialReminder" component={TrialReminderScreen} />
        <Stack.Screen name="TrialPaywall" component={TrialPaywallScreen} />
      </Stack.Navigator>
    </>
  );
}

export default function OnboardingNavigator() {
  const { user } = useAuth();
  const { forceShowOnboarding } = useDevMode();
  const { updateData } = useOnboarding();
  const theme = useTheme();
  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const determineInitialRoute = async () => {
      // Check for saved progress first
      const savedProgress = await loadOnboardingProgress();

      if (forceShowOnboarding) {
        if (savedProgress) {
          // Resume from saved progress
          console.log('[OnboardingNavigator] Resuming from saved progress:', savedProgress.currentScreen);
          updateData(savedProgress.data);
          setInitialRoute(savedProgress.currentScreen);
        } else {
          setInitialRoute('Welcome');
        }
        setLoading(false);
        return;
      }

      if (!user) {
        if (savedProgress) {
          // Resume from saved progress
          console.log('[OnboardingNavigator] Resuming from saved progress:', savedProgress.currentScreen);
          updateData(savedProgress.data);
          setInitialRoute(savedProgress.currentScreen);
        } else {
          setInitialRoute('Welcome');
        }
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.concerns && userData.concerns.length > 0 && !userData.routineStarted) {
            setInitialRoute('Shopping');
          } else {
            setInitialRoute('Welcome');
          }
        } else {
          setInitialRoute('Welcome');
        }
      } catch (error) {
        console.error('Error checking user state:', error);
        setInitialRoute('Welcome');
      } finally {
        setLoading(false);
      }
    };

    determineInitialRoute();
  }, [user, forceShowOnboarding]);

  if (loading || !initialRoute) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.text} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="OnboardingFlow"
        component={OnboardingNavigatorContent}
        initialParams={{ initialRoute }}
      />
    </Stack.Navigator>
  );
}


