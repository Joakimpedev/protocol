import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../hooks/useTheme';
import ProgressScreen from '../screens/ProgressScreen';
import PhotoCaptureScreen from '../screens/PhotoCaptureScreen';
import PhotoImportScreen from '../screens/PhotoImportScreen';
import PhotoPreviewScreen from '../screens/PhotoPreviewScreen';
import WhatToExpectScreen from '../screens/WhatToExpectScreen';
import PhotoComparisonScreen from '../screens/PhotoComparisonScreen';
import PhotoDetailScreen from '../screens/PhotoDetailScreen';
import WeekPickerScreen from '../screens/WeekPickerScreen';
import WeeklySummaryScreen from '../screens/WeeklySummaryScreen';
import PremiumInsightScreen from '../screens/PremiumInsightScreen';
import SettingsScreen from '../screens/SettingsScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import FAQScreen from '../screens/FAQScreen';
import TermsOfUseScreen from '../screens/TermsOfUseScreen';
import MarketingBuilderScreen from '../screens/MarketingBuilderScreen';
import MarketingDisplayScreen from '../screens/MarketingDisplayScreen';
import MarketingDisplayAltScreen from '../screens/MarketingDisplayAltScreen';

const Stack = createNativeStackNavigator();

export default function ProgressStackNavigator() {
  const theme = useTheme();

  const headerStyle = {
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  };

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="ProgressMain" component={ProgressScreen} />
      <Stack.Screen
        name="PhotoCapture"
        component={PhotoCaptureScreen}
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="PhotoImport"
        component={PhotoImportScreen}
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="PhotoPreview"
        component={PhotoPreviewScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="WhatToExpect"
        component={WhatToExpectScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="PhotoComparison"
        component={PhotoComparisonScreen}
        options={{
          headerShown: true,
          headerStyle,
          headerTintColor: theme.colors.text,
          headerTitle: '',
          headerBackTitle: 'Progress',
        }}
      />
      <Stack.Screen
        name="PhotoDetail"
        component={PhotoDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WeekPicker"
        component={WeekPickerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WeeklySummary"
        component={WeeklySummaryScreen}
        options={{
          headerShown: true,
          headerStyle,
          headerTintColor: theme.colors.text,
          headerTitle: '',
          headerBackTitle: 'Progress',
        }}
      />
      <Stack.Screen
        name="PremiumInsight"
        component={PremiumInsightScreen}
        options={{
          headerShown: true,
          headerStyle,
          headerTintColor: theme.colors.text,
          headerTitle: '',
          headerBackTitle: 'Summary',
        }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{
          headerShown: true,
          headerStyle,
          headerTintColor: theme.colors.text,
          headerTitle: '',
          headerBackTitle: 'Settings',
        }}
      />
      <Stack.Screen
        name="FAQ"
        component={FAQScreen}
        options={{
          headerShown: true,
          headerStyle,
          headerTintColor: theme.colors.text,
          headerTitle: '',
          headerBackTitle: 'Settings',
        }}
      />
      <Stack.Screen
        name="TermsOfUse"
        component={TermsOfUseScreen}
        options={{
          headerShown: true,
          headerStyle,
          headerTintColor: theme.colors.text,
          headerTitle: '',
          headerBackTitle: 'Settings',
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: true,
          headerStyle,
          headerTintColor: theme.colors.text,
          headerTitle: '',
          headerBackTitle: 'Progress',
        }}
      />
      <Stack.Screen
        name="Feedback"
        component={FeedbackScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="MarketingBuilder"
        component={MarketingBuilderScreen}
        options={{
          headerShown: true,
          headerStyle,
          headerTintColor: theme.colors.text,
          headerTitle: '',
          headerBackTitle: 'Progress',
        }}
      />
      <Stack.Screen
        name="MarketingDisplay"
        component={MarketingDisplayScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MarketingDisplayAlt"
        component={MarketingDisplayAltScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
