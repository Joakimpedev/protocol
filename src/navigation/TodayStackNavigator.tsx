import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../hooks/useTheme';
import TodayScreen from '../screens/TodayScreen';
import SessionScreen from '../screens/SessionScreen';
import ExerciseHubScreen from '../screens/ExerciseHubScreen';
import MewingSettingsScreen from '../screens/MewingSettingsScreen';
import ChewingTimerScreen from '../screens/ChewingTimerScreen';
import CyclingExerciseScreen from '../screens/CyclingExerciseScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import FAQScreen from '../screens/FAQScreen';
import TermsOfUseScreen from '../screens/TermsOfUseScreen';
import HabitPickerScreen from '../screens/HabitPickerScreen';
const Stack = createNativeStackNavigator();

export default function TodayStackNavigator() {
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
      <Stack.Screen name="TodayMain" component={TodayScreen} />
      <Stack.Screen
        name="Session"
        component={SessionScreen}
        options={{
          presentation: 'modal',
          headerShown: true,
          headerTransparent: true,
          headerStyle: {
            backgroundColor: 'transparent',
          } as any,
          headerShadowVisible: false,
          headerTintColor: theme.colors.text,
          headerTitle: '',
        }}
      />
      <Stack.Screen
        name="ExerciseHub"
        component={ExerciseHubScreen}
        options={{
          headerShown: true,
          headerStyle,
          headerTintColor: theme.colors.text,
          headerTitle: 'Exercises',
          headerBackTitle: 'Today',
        }}
      />
      <Stack.Screen
        name="MewingSettings"
        component={MewingSettingsScreen}
        options={{
          headerShown: true,
          headerStyle,
          headerTintColor: theme.colors.text,
          headerTitle: 'Mewing Settings',
          headerBackTitle: 'Exercises',
        }}
      />
      <Stack.Screen
        name="ChewingTimer"
        component={ChewingTimerScreen}
        options={{
          headerShown: true,
          headerStyle,
          headerTintColor: theme.colors.text,
          headerTitle: '',
          headerBackTitle: 'Exercises',
        }}
      />
      <Stack.Screen
        name="CyclingExercise"
        component={CyclingExerciseScreen}
        options={{
          headerShown: true,
          headerStyle,
          headerTintColor: theme.colors.text,
          headerTitle: '',
          headerBackTitle: 'Exercises',
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: true,
          headerStyle,
          headerTintColor: theme.colors.text,
          headerTitle: 'Settings',
          headerBackTitle: 'Today',
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
        name="HabitPicker"
        component={HabitPickerScreen}
        options={{
          headerShown: true,
          headerStyle,
          headerTintColor: theme.colors.text,
          headerTitle: 'Daily Habits',
          headerBackTitle: 'Home',
        }}
      />
    </Stack.Navigator>
  );
}
