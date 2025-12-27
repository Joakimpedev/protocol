import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../constants/theme';
import ProgressScreen from '../screens/ProgressScreen';
import PhotoCaptureScreen from '../screens/PhotoCaptureScreen';
import PhotoPreviewScreen from '../screens/PhotoPreviewScreen';
import WhatToExpectScreen from '../screens/WhatToExpectScreen';
import PhotoComparisonScreen from '../screens/PhotoComparisonScreen';
import PhotoDetailScreen from '../screens/PhotoDetailScreen';
import WeekPickerScreen from '../screens/WeekPickerScreen';
import WeeklySummaryScreen from '../screens/WeeklySummaryScreen';
import PremiumInsightScreen from '../screens/PremiumInsightScreen';
import SettingsScreen from '../screens/SettingsScreen';
import FeedbackScreen from '../screens/FeedbackScreen';

const Stack = createNativeStackNavigator();

export default function ProgressStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
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
        options={({ navigation }) => ({
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.background,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
          headerTintColor: colors.text,
          headerTitle: '',
          headerBackTitle: 'Progress',
        })}
      />
      <Stack.Screen 
        name="PhotoDetail" 
        component={PhotoDetailScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="WeekPicker" 
        component={WeekPickerScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="WeeklySummary" 
        component={WeeklySummaryScreen}
        options={({ navigation }) => ({
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.background,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
          headerTintColor: colors.text,
          headerTitle: '',
          headerBackTitle: 'Progress',
        })}
      />
      <Stack.Screen 
        name="PremiumInsight" 
        component={PremiumInsightScreen}
        options={({ navigation }) => ({
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.background,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
          headerTintColor: colors.text,
          headerTitle: '',
          headerBackTitle: 'Summary',
        })}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={({ navigation }) => ({
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.background,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
          headerTintColor: colors.text,
          headerTitle: '',
          headerBackTitle: 'Progress',
        })}
      />
      <Stack.Screen 
        name="Feedback" 
        component={FeedbackScreen}
        options={({ navigation }) => ({
          headerShown: false,
          presentation: 'modal',
        })}
      />
    </Stack.Navigator>
  );
}

